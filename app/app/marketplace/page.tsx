"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, deleteDoc, updateDoc, getDoc, increment } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import ListingCard from "@/components/listingCard";
import { deleteUserAccount } from "@/lib/accountUtils";

const MATERIAL_FILTERS = ["All", "Plastic", "Metal", "Paper", "Glass", "E-Waste", "Rubber", "Textile", "Organic"];
const NIGERIAN_STATES = ["All States", "Lagos", "Kano", "Oyo", "Rivers", "Kaduna", "Enugu", "Abia", "Delta", "Ogun", "FCT"];

export default function Marketplace() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [materialFilter, setMaterialFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState("All States");
  const [search, setSearch] = useState("");
  const [showBranchPicker, setShowBranchPicker] = useState<string | null>(null);
  const [assigningBranch, setAssigningBranch] = useState<any>(null);
  const [assignToast, setAssignToast] = useState<string | null>(null);

  const enrichListingsWithNames = async (rawListings: any[]) => {
    const uniqueUserIds = [...new Set(rawListings.map((l: any) => l.userId).filter(Boolean))];
    const userDocs = await Promise.all(
      uniqueUserIds.map((uid: string) => getDoc(doc(db, "users", uid)))
    );
    const nameMap: Record<string, string> = {};
    userDocs.forEach((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        nameMap[snap.id] = d.displayName || d.email?.split("@")[0] || "Collector";
      }
    });
    return rawListings.map((l: any) => ({ ...l, collectorName: nameMap[l.userId] || "Collector" }));
  };

  useEffect(() => {
    const checkAccess = async () => {
      // Check for branch session first
      const branchSession = sessionStorage.getItem("branchSession");
      if (branchSession) {
        const parsed = JSON.parse(branchSession);
        // For branch accounts, set minimal user data
        setUserData({ role: "branch", branchId: parsed.branchId, companyName: parsed.companyName });
        
        // Load listings with real-time updates
        const { onSnapshot } = await import("firebase/firestore");
        const q = query(collection(db, "listings"), where("status", "==", "available"));
        onSnapshot(q, async (snap) => {
          const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const enriched = await enrichListingsWithNames(raw);
          setListings(enriched);
          setLoading(false);
        });
        return;
      }

      // Check for regular authentication
      const unsubAuth = auth.onAuthStateChanged(async (user) => {
        if (!user) {
          // Allow unauthenticated browsing — load listings as guest
          const { onSnapshot } = await import("firebase/firestore");
          const q = query(collection(db, "listings"), where("status", "==", "available"));
          onSnapshot(q, async (snap) => {
            const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const enriched = await enrichListingsWithNames(raw);
            setListings(enriched);
            setLoading(false);
          });
          return;
        }

        // Load user data
        const { doc, onSnapshot } = await import("firebase/firestore");
        onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) setUserData(snap.data());
        });

        // Load listings
        const q = query(collection(db, "listings"), where("status", "==", "available"));
        const snap = await getDocs(q);
        const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const enriched = await enrichListingsWithNames(raw);
        setListings(enriched);
        setLoading(false);

        // Load branches if business
        const userDoc = await (await import("firebase/firestore")).getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "business") {
          const branchSnap = await getDocs(query(collection(db, "branches"), where("parentBusinessId", "==", user.uid)));
          setBranches(branchSnap.docs.map(d => ({ docId: d.id, ...d.data() })));
        }
      });
      return () => unsubAuth();
    };

    checkAccess();
  }, []);

  const deleteAccount = async () => {
    try {
      await deleteUserAccount();
    } catch (error) {
      // Error is handled in the utility function
    }
  };

  const logout = () => {
    const branchSession = sessionStorage.getItem("branchSession");
    if (branchSession) { sessionStorage.removeItem("branchSession"); window.location.assign("/"); return; }
    signOut(auth).then(() => window.location.assign("/"));
  };

  const handleNavigate = (page: 'dashboard' | 'messages' | 'marketplace') => {
    const branchSession = sessionStorage.getItem("branchSession");
    if (branchSession) {
      const parsed = JSON.parse(branchSession);
      if (page === 'dashboard') { router.push(`/branch/${parsed.docId}/dashboard`); return; }
    }
    router.push(`/${page}`);
  };

  const startChat = async (listingId: string, branchDocId?: string) => {
    const branchSession = sessionStorage.getItem("branchSession");
    const user = auth.currentUser;
    
    // For branch accounts, use session data
    if (branchSession) {
      const parsed = JSON.parse(branchSession);
      const listing = listings.find(l => l.id === listingId);
      if (!listing) return;

      // Check if a non-left chat already exists (using parent business ID)
      const existing = await getDocs(query(
        collection(db, "chats"),
        where("listingId", "==", listingId),
        where("businessId", "==", parsed.parentBusinessId)
      ));

      const activeChat = existing.docs.find(d => d.data().status !== "left");
      if (activeChat) {
        router.push(`/messages/${activeChat.id}`);
        return;
      }

      const chatRef = await addDoc(collection(db, "chats"), {
        listingId,
        itemTitle: listing.material,
        suggestedPrice: listing.price || null,
        participants: [parsed.parentBusinessId, listing.userId],
        businessId: parsed.parentBusinessId,
        collectorId: listing.userId,
        initiatingBranchId: branchDocId || parsed.docId,
        status: "open",
        createdAt: new Date().toISOString(),
      });

      // Hide listing from marketplace while negotiation is active
      await updateDoc(doc(db, "listings", listingId), { status: "in_negotiation" });
      await updateDoc(doc(db, "branches", branchDocId || parsed.docId), { contactedCount: increment(1) });

      // Notify collector of contact request
      await addDoc(collection(db, "notifications"), {
        recipientId: listing.userId,
        chatId: chatRef.id,
        type: "contact_request",
        title: "New Contact Request",
        body: `${parsed.companyName} wants to bargain for your ${listing.material} listing.`,
        createdAt: new Date().toISOString(),
        read: false,
      });

      router.push(`/messages/${chatRef.id}`);
      return;
    }

    // For regular authenticated users
    if (!user) { router.push("/login"); return; }

    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;

    // Check if a non-left chat already exists
    const existing = await getDocs(query(
      collection(db, "chats"),
      where("listingId", "==", listingId),
      where("businessId", "==", user.uid)
    ));

    const activeChat = existing.docs.find(d => d.data().status !== "left");
    if (activeChat) {
      router.push(`/messages/${activeChat.id}`);
      return;
    }

    const chatRef = await addDoc(collection(db, "chats"), {
      listingId,
      itemTitle: listing.material,
      suggestedPrice: listing.price || null,
      participants: [user.uid, listing.userId],
      businessId: user.uid,
      collectorId: listing.userId,
      initiatingBranchId: branchDocId || null,
      status: "open",
      createdAt: new Date().toISOString(),
    });

    // Hide listing from marketplace while negotiation is active
    await updateDoc(doc(db, "listings", listingId), { status: "in_negotiation" });

    // Notify collector of contact request
    await addDoc(collection(db, "notifications"), {
      recipientId: listing.userId,
      chatId: chatRef.id,
      type: "contact_request",
      title: "New Contact Request",
      body: `A business wants to bargain for your ${listing.material} listing.`,
      createdAt: new Date().toISOString(),
      read: false,
    });

    // Notify the assigned branch
    if (branchDocId) {
      const assignedBranch = branches.find(b => b.docId === branchDocId);
      await addDoc(collection(db, "notifications"), {
        recipientId: branchDocId,
        chatId: chatRef.id,
        type: "assignment",
        title: "New Assignment",
        body: `You have been assigned to contact the collector about their ${listing.material} listing${listing.state ? ` in ${listing.state}` : ""}.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    router.push(`/messages/${chatRef.id}`);
  };

  const handleBranchAssign = async (branchDocId: string, listingId: string) => {
    const branch = branches.find(b => b.docId === branchDocId);
    setAssigningBranch(branch);
    setShowBranchPicker(null);
    await startChat(listingId, branchDocId);
    // startChat navigates away; show toast briefly before nav
    setAssignToast(`${branch?.branchName || "Branch"} has been assigned and is now contacting the collector.`);
    setTimeout(() => setAssignToast(null), 3500);
  };

  const handleAction = (listingId: string) => {
    const branchSession = sessionStorage.getItem("branchSession");
    if (!userData && !branchSession) { router.push("/login"); return; }
    if (!userData) return; // still loading
    // Collectors cannot initiate chats — they only receive contact requests
    if (userData.role === "collector") return;
    if (userData.role === "business") {
      if (branches.length > 0) {
        setShowBranchPicker(listingId);
      } else {
        alert("Please create a branch account first to contact collectors.");
        router.push("/dashboard");
        return;
      }
    }
    // branch session
    if (userData.role === "branch") {
      startChat(listingId);
    }
  };

  const filteredListings = listings.filter((l) => {
    const matchMaterial = materialFilter === "All" || l.material?.toLowerCase().includes(materialFilter.toLowerCase());
    const matchState = stateFilter === "All States" || l.state === stateFilter;
    const matchSearch = !search || l.material?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    return matchMaterial && matchState && matchSearch;
  });

  const role = userData?.role || "guest";

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex h-screen overflow-hidden">
      {userData && (
        <Sidebar
          role={role}
          active="marketplace"
          displayName={role === "business" ? userData.companyName : (userData.displayName || userData.email?.split("@")[0])}
          companyName={role === "business" ? userData.companyName : undefined}
          onDeleteAccount={deleteAccount}
          onNavigate={handleNavigate}
          onLogout={logout}
        />
      )}

      <main className="flex-1 overflow-y-auto p-10">
        {/* Header */}
        <header className="max-w-6xl mx-auto mb-10 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black text-[#4A6741]">Marketplace</h1>
              <p className="text-[#8C6D51] font-bold text-sm">Find materials and start a bargain.</p>
            </div>
            {userData?.role === "collector" && (
              <button
                onClick={() => router.push('/create-listing')}
                className="bg-[#4A6741] text-white px-8 py-4 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95"
              >
                + POST LISTING
              </button>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials..."
            className="w-full bg-white p-4 rounded-2xl border border-[#E5E0D8] outline-none focus:ring-2 focus:ring-[#4A6741] font-bold text-sm transition-all"
          />

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            {MATERIAL_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setMaterialFilter(f)}
                className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2"
                style={
                  materialFilter === f
                    ? { backgroundColor: "#4A6741", color: "white", borderColor: "#4A6741" }
                    : { backgroundColor: "transparent", color: "#8C6D51", borderColor: "#E5E0D8" }
                }
              >
                {f}
              </button>
            ))}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-[#E5E0D8] bg-transparent text-[#8C6D51] outline-none cursor-pointer"
            >
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </header>

      {/* Assignment confirmation toast */}
      {assignToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#4A6741] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <span className="text-lg">✅</span>
          <p className="font-black text-sm">{assignToast}</p>
        </div>
      )}

      {/* Branch Picker Modal */}
        {showBranchPicker && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-black text-black mb-2">Select a Branch</h3>
              <p className="text-sm font-bold text-[#8C6D51] mb-6">Which branch account should contact this collector?</p>
              <div className="space-y-3 mb-6">
                {branches.map((branch) => (
                  <button
                    key={branch.docId}
                    onClick={() => handleBranchAssign(branch.docId, showBranchPicker!)}
                    className="w-full p-5 rounded-2xl border-2 border-[#E5E0D8] hover:border-[#4A6741] text-left transition-all group"
                  >
                    <p className="font-black text-black text-sm">{branch.branchName}</p>
                    <p className="text-[10px] font-bold text-[#4A6741] uppercase tracking-widest mt-0.5">ID: {branch.branchId}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowBranchPicker(null)} className="w-full py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">
                CANCEL
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 font-black text-[#8C6D51] animate-pulse">Loading available items...</div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredListings.map((item) => (
              <ListingCard
                key={item.id}
                {...item}
                isOwn={item.userId === auth.currentUser?.uid}
                isCollectorViewing={!userData || (userData?.role === "collector" && item.userId !== auth.currentUser?.uid)}
                collectorName={item.collectorName}
                onAction={handleAction}
                actionLabel="CONTACT COLLECTOR"
              />
            ))}
          </div>
        )}

        {filteredListings.length === 0 && !loading && (
          <div className="max-w-6xl mx-auto text-center py-20 bg-white rounded-[3rem] border border-dashed border-[#E5E0D8]">
            <p className="font-black text-[#8C6D51]">No listings match your filters.</p>
            <button onClick={() => { setMaterialFilter("All"); setStateFilter("All States"); setSearch(""); }}
              className="mt-3 text-xs font-black text-[#4A6741] hover:underline">Clear filters</button>
          </div>
        )}
      </main>
    </div>
  );
}