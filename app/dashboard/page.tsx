"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut, deleteUser } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, orderBy, limit, deleteDoc, addDoc, getDocs, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import NotificationCard from "@/components/notificationCard";
import BranchCard from "@/components/branchCard";
import PortfolioEditor from "@/components/portfolioEditor";
import Avatar from "@/components/Avatar";
import { deleteUserAccount, deleteBranchAccount } from "@/lib/accountUtils";

function generateBranchId(): string {
  return "BR-" + Math.floor(1000 + Math.random() * 9000).toString();
}

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [showPortfolioEditor, setShowPortfolioEditor] = useState(false);
  const [showQuickList, setShowQuickList] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Create branch form state
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchPassword, setNewBranchPassword] = useState("");
  const [branchErr, setBranchErr] = useState("");
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchSuccess, setBranchSuccess] = useState(false);

  // Profile editor state
  const [profileName, setProfileName] = useState("");
  const [profileLoadingStep, setProfileLoadingStep] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Only redirect to branch dashboard if no Firebase auth user exists
    // (Branch employees have no Firebase accounts; business owners do)
    const branchSession = sessionStorage.getItem("branchSession");
    if (branchSession && !auth.currentUser) {
      const parsed = JSON.parse(branchSession);
      router.push(`/branch/${parsed.docId}/dashboard`);
      return;
    }

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) { router.push("/login"); return; }

      // User profile
      const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) setUserData(snap.data());
        setLoading(false);
      });

      // Notifications
      const qNotif = query(
        collection(db, "notifications"),
        where("recipientId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(4)
      );
      const unsubNotif = onSnapshot(qNotif, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsubUser(); unsubNotif(); };
    });

    return () => unsubAuth();
  }, [router]);

  // Load branches for business accounts
  useEffect(() => {
    if (!userData || userData.role !== "business") return;
    const user = auth.currentUser;
    if (!user) return;

    const qBranches = query(collection(db, "branches"), where("parentBusinessId", "==", user.uid));
    const unsubBranches = onSnapshot(qBranches, (snap) => {
      setBranches(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
    });
    return () => unsubBranches();
  }, [userData]);

  // Load collector's own listings
  useEffect(() => {
    if (!userData || userData.role !== "collector") return;
    const user = auth.currentUser;
    if (!user) return;

    const qListings = query(collection(db, "listings"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(5));
    const unsubListings = onSnapshot(qListings, (snap) => {
      setMyListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubListings();
  }, [userData]);

  const logout = () => signOut(auth).then(() => window.location.assign("/"));

  const deleteAccount = async () => {
    try {
      await deleteUserAccount();
    } catch (error) {
      // Error is handled in the utility function
    }
  };

  const handleNavigate = (page: 'dashboard' | 'messages' | 'marketplace') => {
    router.push(`/${page}`);
  };

  const createBranch = async () => {
    setBranchErr("");
    if (!newBranchName.trim()) { setBranchErr("Please enter a branch name."); return; }
    if (!newBranchPassword.trim() || newBranchPassword.length < 6) {
      setBranchErr("Branch password must be at least 6 characters.");
      return;
    }

    setBranchLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      const branchId = generateBranchId();
      await addDoc(collection(db, "branches"), {
        branchId,
        branchName: newBranchName.trim(),
        branchPassword: newBranchPassword,
        companyName: userData.companyName,
        parentBusinessId: user.uid,
        contactedCount: 0,
        respondedCount: 0,
        dealsCount: 0,
        active: true,
        createdAt: new Date().toISOString(),
      });
      setBranchSuccess(true);
      setTimeout(() => {
        setNewBranchName("");
        setNewBranchPassword("");
        setBranchSuccess(false);
        setShowCreateBranch(false);
      }, 1000);
    } catch {
      setBranchErr("Something went wrong. Please try again.");
    } finally {
      setBranchLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!profileName.trim()) return;
    
    setProfileLoading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      setProfileLoadingStep("Saving profile...");
      await updateDoc(doc(db, "users", user.uid), {
        displayName: profileName.trim(),
      });

      setProfileSuccess(true);
      setProfileLoadingStep("");
      setTimeout(() => {
        setShowProfileEditor(false);
        setProfileName("");
        setProfileSuccess(false);
      }, 900);
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileLoadingStep("");
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center font-black text-[#4A6741] animate-pulse">
        SYNCING DATA...
      </div>
    );
  }

  const deleteListing = async (listingId: string) => {
    if (!confirm("Remove this listing from the marketplace?")) return;
    await deleteDoc(doc(db, "listings", listingId));
  };

  const role = userData?.role || "collector";
  const isCollector = role === "collector";
  const isBusiness = role === "business";

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex h-screen overflow-hidden">
      <Sidebar
        role={role}
        active="dashboard"
        displayName={isBusiness ? userData?.companyName : (userData?.displayName || userData?.email?.split("@")[0])}
        companyName={isBusiness ? userData?.companyName : undefined}
        onDeleteAccount={deleteAccount}
        onNavigate={handleNavigate}
        onLogout={logout}
      />

      <main className="flex-1 p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          {/* ======= COLLECTOR DASHBOARD ======= */}
          {isCollector && (
            <div className="grid grid-cols-3 gap-10">
              <div className="col-span-2 space-y-8">
                <header>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-4xl font-black text-black tracking-tight">
                        {userData?.displayName || userData?.email?.split("@")[0]}
                      </h2>
                      <p className="text-[#8C6D51] font-bold mt-1">
                        Account Type: <span className="text-[#4A6741]">Collector</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setShowProfileEditor(!showProfileEditor)}
                      className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741] hover:text-white transition-all"
                    >
                      {showProfileEditor ? "CLOSE" : "EDIT NAME"}
                    </button>
                  </div>

                  {showProfileEditor && (
                    <div className="mt-6 bg-[#F2E8CF] p-6 rounded-[2rem] border border-[#E5DCC3]">
                      <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-3">Your Display Name</p>
                      <p className="text-xs font-bold text-[#8C6D51] mb-4 leading-relaxed">
                        This name is shown on the marketplace and in chats. Choose something that represents you.
                      </p>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder={userData?.displayName || userData?.email?.split("@")[0] || "Your name"}
                        className="w-full bg-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#4A6741] transition-all font-bold text-sm mb-4"
                      />
                      <button
                        onClick={updateProfile}
                        disabled={profileLoading || profileSuccess || !profileName.trim()}
                        className="px-8 py-3 bg-[#4A6741] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#3d5535] transition-all disabled:opacity-50"
                      >
                        {profileSuccess ? "✓ NAME SAVED" : profileLoading ? "SAVING…" : "SAVE NAME"}
                      </button>
                    </div>
                  )}
                </header>

                {/* ECO Points */}
                <div className="bg-[#4A6741] p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Impact Points Earned</p>
                  <div className="flex items-baseline gap-2 mt-4">
                    <h3 className="text-8xl font-black tracking-tighter tabular-nums">{userData?.impactPoints || 0}</h3>
                    <span className="text-xl font-black opacity-40">ECO</span>
                  </div>
                  <div className="mt-6">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Progress to next milestone</p>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/60 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(((userData?.impactPoints || 0) % 100), 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white opacity-5 rounded-full group-hover:scale-110 transition-transform duration-700" />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h4 className="font-black text-black mb-1">Market Activity</h4>
                    <p className="text-xs text-[#8C6D51] font-bold">Browse or list materials.</p>
                    <button onClick={() => router.push('/marketplace')} className="mt-6 text-[10px] font-black text-[#4A6741] uppercase tracking-widest hover:underline">Open Market →</button>
                  </div>
                  <div className="bg-[#F2E8CF] p-8 rounded-[2.5rem] border border-[#E5DCC3]">
                    <h4 className="font-black text-[#8C6D51] mb-1">Quick List</h4>
                    <p className="text-xs text-[#8C6D51] font-bold opacity-70">Post a new listing fast.</p>
                    <button onClick={() => router.push('/create-listing')} className="mt-6 text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:underline">Create Listing →</button>
                  </div>
                </div>

                {/* My Listings */}
                <div>
                  <h4 className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] mb-4">My Active Listings</h4>
                  {myListings.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-[#E5E0D8] rounded-[2rem]">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No listings yet</p>
                      <button onClick={() => router.push('/create-listing')} className="mt-3 text-xs font-black text-[#4A6741] hover:underline">
                        Create your first listing →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myListings.map((listing) => (
                        <div key={listing.id} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 flex items-center justify-between">
                          <div>
                            <p className="font-black text-black text-sm">{listing.material}</p>
                            <p className="text-[10px] font-bold text-[#8C6D51] uppercase">{listing.weight}kg · {listing.state}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className="px-3 py-1 rounded-full text-[10px] font-black uppercase"
                              style={{
                                backgroundColor: listing.status === "available" ? "#E8F5E2" : listing.status === "sold" ? "#FDF3E3" : "#EAF0FD",
                                color: listing.status === "available" ? "#4A6741" : listing.status === "sold" ? "#8C6D51" : "#5C7FC2",
                              }}
                            >
                              {listing.status}
                            </div>
                            {listing.status !== "sold" && (
                              <button
                                onClick={() => deleteListing(listing.id)}
                                title="Remove listing"
                                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all font-black text-sm"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div className="col-span-1 space-y-6">
                <h4 className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-2">Recent Alerts</h4>
                <div className="space-y-4">
                  {notifications.map((n) => (
                    <NotificationCard key={n.id} {...n} />
                  ))}
                  {notifications.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-[#E5E0D8] rounded-[2rem]">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Activity Yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======= BUSINESS DASHBOARD ======= */}
          {isBusiness && (
            <div className="space-y-10">
              <header className="flex items-start justify-between">
                <div>
                  <h2 className="text-4xl font-black text-black tracking-tight">{userData?.companyName}</h2>
                  <p className="text-[#8C6D51] font-bold mt-1">
                    Account Type: <span className="text-[#8C6D51]">Business</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProfileEditor(!showProfileEditor)}
                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#5C7FC2] text-[#5C7FC2] hover:bg-[#5C7FC2] hover:text-white transition-all"
                  >
                    {showProfileEditor ? "CLOSE" : "EDIT PROFILE"}
                  </button>
                  <button
                    onClick={() => setShowPortfolioEditor(!showPortfolioEditor)}
                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#8C6D51] text-[#8C6D51] hover:bg-[#8C6D51] hover:text-white transition-all"
                  >
                    {showPortfolioEditor ? "CLOSE EDITOR" : "EDIT PORTFOLIO"}
                  </button>
                </div>
              </header>

              {/* Profile Editor */}
              {showProfileEditor && (
                <div className="bg-[#EAF0FD] p-8 rounded-[2.5rem] border border-[#C5D5F0]">
                  <h4 className="font-black text-[#5C7FC2] mb-5 uppercase text-sm tracking-widest">Edit Profile</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Display Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder={userData?.displayName || userData?.companyName || "Company name"}
                        className="w-full mt-2 bg-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#5C7FC2] transition-all font-bold text-sm"
                      />
                    </div>
                    <button
                      onClick={updateProfile}
                      disabled={profileLoading || profileSuccess || !profileName.trim()}
                      className="px-8 py-3 bg-[#5C7FC2] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#3D5E9E] transition-all disabled:opacity-50"
                    >
                      {profileSuccess ? (
                        <span>✓ PROFILE SAVED</span>
                      ) : profileLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          {profileLoadingStep || "SAVING..."}
                        </span>
                      ) : "SAVE PROFILE"}
                    </button>
                  </div>
                </div>
              )}

              {/* Portfolio Editor */}
              {showPortfolioEditor && auth.currentUser && (
                <div className="bg-white p-10 rounded-[3rem] border border-[#E5E0D8] shadow-sm">
                  <h3 className="text-xl font-black text-black mb-6">Company Portfolio</h3>
                  <PortfolioEditor
                    userId={auth.currentUser.uid}
                    initial={userData?.portfolio || {}}
                    onSave={() => setShowPortfolioEditor(false)}
                  />
                </div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Total Branches", value: branches.length, color: "#5C7FC2" },
                  { label: "Active Branches", value: branches.filter(b => b.active).length, color: "#4A6741" },
                  { label: "Total Contacted", value: branches.reduce((a, b) => a + (b.contactedCount || 0), 0), color: "#8C6D51" },
                  { label: "Total Deals", value: branches.reduce((a, b) => a + (b.dealsCount || 0), 0), color: "#4A6741" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-wide mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Branch Management */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-black">Branch Accounts</h3>
                  <button
                    onClick={() => setShowCreateBranch(!showCreateBranch)}
                    className="px-6 py-3 bg-[#5C7FC2] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#3D5E9E] transition-all active:scale-95"
                  >
                    + CREATE BRANCH
                  </button>
                </div>

                {/* Create Branch Form */}
                {showCreateBranch && (
                  <div className="bg-[#EAF0FD] p-8 rounded-[2.5rem] mb-6 border border-[#C5D5F0]">
                    <h4 className="font-black text-[#5C7FC2] mb-5 uppercase text-sm tracking-widest">New Branch</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Branch Name</label>
                        <input
                          type="text"
                          value={newBranchName}
                          onChange={(e) => { setNewBranchName(e.target.value); setBranchErr(""); }}
                          placeholder="e.g. Lagos Branch"
                          className="w-full mt-2 bg-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#5C7FC2] transition-all font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Branch Password</label>
                        <input
                          type="password"
                          value={newBranchPassword}
                          onChange={(e) => { setNewBranchPassword(e.target.value); setBranchErr(""); }}
                          placeholder="Min 6 characters"
                          className="w-full mt-2 bg-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#5C7FC2] transition-all font-bold text-sm"
                        />
                      </div>
                    </div>
                    {branchErr && <p className="text-xs text-red-500 font-bold mb-3">{branchErr}</p>}
                    <div className="flex gap-3">
                      <button
                        onClick={createBranch}
                        disabled={branchLoading || branchSuccess}
                        className="px-8 py-3 bg-[#5C7FC2] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#3D5E9E] transition-all disabled:opacity-50"
                      >
                        {branchSuccess ? (
                          <span>✓ BRANCH CREATED</span>
                        ) : branchLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            CREATING...
                          </span>
                        ) : "CREATE BRANCH"}
                      </button>
                      <button
                        onClick={() => { setShowCreateBranch(false); setBranchErr(""); }}
                        className="px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-[#8C6D51] border border-[#E5E0D8] hover:bg-white transition-all"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}

                {/* Branch Cards Grid */}
                {branches.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-[#E5E0D8] rounded-[3rem]">
                    <p className="font-black text-[#8C6D51]">No branches yet.</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">Create your first branch to start contacting collectors.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map((branch) => (
                      <BranchCard
                        key={branch.docId}
                        branchId={branch.branchId}
                        branchName={branch.branchName}
                        companyName={branch.companyName}
                        contactedCount={branch.contactedCount || 0}
                        respondedCount={branch.respondedCount || 0}
                        dealsCount={branch.dealsCount || 0}
                        active={branch.active}
                        branchPassword={branch.branchPassword}
                        docId={branch.docId}
                        onView={(id) => router.push(`/branch/${branch.docId}/dashboard`)}
                        onDelete={(docId) => deleteBranchAccount(docId, branch.branchName)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div>
                <h4 className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] mb-4">Recent Alerts</h4>
                <div className="grid grid-cols-2 gap-4">
                  {notifications.map((n) => (
                    <NotificationCard key={n.id} {...n} />
                  ))}
                  {notifications.length === 0 && (
                    <div className="col-span-2 py-12 text-center border-2 border-dashed border-[#E5E0D8] rounded-[2rem]">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Activity Yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}