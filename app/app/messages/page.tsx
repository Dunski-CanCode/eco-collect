"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Avatar from "@/components/Avatar";
import { signOut, deleteUser } from "firebase/auth";
import { deleteUserAccount } from "@/lib/accountUtils";

export default function MessagesPage() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");

  useEffect(() => {
    const checkAccess = async () => {
      // Check for branch session first
      const branchSession = sessionStorage.getItem("branchSession");
      if (branchSession) {
        const parsed = JSON.parse(branchSession);
        // For branch accounts, set minimal user data
        setUserData({ role: "branch", branchId: parsed.branchId, companyName: parsed.companyName, docId: parsed.docId });
        
        // Only load THIS branch's own chats (filter by initiatingBranchId)
        const q = query(collection(db, "chats"), where("initiatingBranchId", "==", parsed.docId));
        const unsubChats = onSnapshot(q, (snap) => {
          setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });
        return () => unsubChats();
      }

      // Check for regular authentication
      const unsubAuth = auth.onAuthStateChanged(async (user) => {
        if (!user) { router.push("/login"); return; }

        // Load user data
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) return;
        const uData = userSnap.data();
        setUserData(uData);

        // Business accounts cannot use messages — redirect to dashboard
        if (uData.role === "business") {
          router.push("/dashboard");
          return;
        }

        // Collector accounts: show only chats where they are the seller
        const q = query(collection(db, "chats"), where("collectorId", "==", user.uid));
        const unsubChats = onSnapshot(q, (snap) => {
          setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        });

        return () => unsubChats();
      });
      return () => unsubAuth();
    };

    checkAccess();
  }, [router]);

  const deleteAccount = async () => {
    try {
      await deleteUserAccount();
    } catch (error) {
      // Error is handled in the utility function
    }
  };

  const logout = () => signOut(auth).then(() => window.location.assign("/"));

  const handleNavigate = (page: 'dashboard' | 'messages' | 'marketplace') => {
    router.push(`/${page}`);
  };

  const filteredChats = chats.filter((c) => {
    const branchSession = sessionStorage.getItem("branchSession");
    const viewerId = branchSession ? JSON.parse(branchSession).docId : (auth.currentUser?.uid ?? "");
    if (Array.isArray(c.hiddenBy) && c.hiddenBy.includes(viewerId)) return false;
    if (filter === "active") return c.status !== "closed" && c.status !== "left";
    if (filter === "closed") return c.status === "closed" || c.status === "left";
    return true;
  });

  const hideChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const userId = userData?.uid || auth.currentUser?.uid;
    const branchSession = sessionStorage.getItem("branchSession");
    const id = branchSession ? JSON.parse(branchSession).docId : userId;
    if (!id) return;
    await updateDoc(doc(db, "chats", chatId), { hiddenBy: arrayUnion(id) });
  };

  const role = userData?.role || "collector";

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex h-screen overflow-hidden">
      {userData && (
        <Sidebar
          role={role}
          active="messages"
          displayName={role === "business" ? userData.companyName : userData.email?.split("@")[0]}
          companyName={role === "business" ? userData.companyName : undefined}
          onDeleteAccount={deleteAccount}
          onNavigate={handleNavigate}
          onLogout={logout}
        />
      )}

      <main className="flex-1 p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h2 className="text-4xl font-black text-black tracking-tight">Inbox</h2>
            <p className="text-[#8C6D51] font-bold mt-1">Your active and past bargains.</p>
          </header>

          {/* Reminder banner */}
          <div className="mb-6 p-5 bg-[#EAF0FD] border border-[#5C7FC2]/30 rounded-3xl">
            <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mb-2">📋 Reminder for all chats</p>
            <ul className="text-xs font-bold text-[#3D5E9E] space-y-1 list-disc list-inside">
              <li>Agree on a <strong>meetup time and location</strong> for handover</li>
              <li>Discuss your <strong>payment plan</strong> inside the chat</li>
              <li>Note: <strong>actual payment happens outside the app</strong></li>
            </ul>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-8">
            {(["all", "active", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2"
                style={
                  filter === f
                    ? { backgroundColor: "#4A6741", color: "white", borderColor: "#4A6741" }
                    : { backgroundColor: "transparent", color: "#8C6D51", borderColor: "#E5E0D8" }
                }
              >
                {f === "all" ? "All" : f === "active" ? "Active Deals" : "Closed"}
              </button>
            ))}
          </div>

          {/* Chat List */}
          <div className="space-y-4">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/messages/${chat.id}`)}
                className={`p-8 rounded-[2.5rem] border shadow-sm hover:shadow-xl cursor-pointer transition-all group ${
                  chat.status === "left"
                    ? "bg-red-50 border-red-200"
                    : chat.status === "account_deleted"
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar
                      role={role === "collector" ? "business" : "collector"}
                      size={52}
                    />
                    <div>
                      <h4 className="font-black text-black text-base">{chat.itemTitle || "Materials"}</h4>
                      <p className="text-xs text-[#8C6D51] font-bold uppercase tracking-widest mt-0.5">
                        {chat.status === "closed"
                          ? `Deal closed · ₦${chat.agreedPrice?.toLocaleString() || "—"}`
                          : chat.status === "left"
                          ? "⚠️ Offer left · Listing back on marketplace"
                          : chat.status === "close_requested"
                          ? "⏳ Close deal requested · Awaiting confirmation"
                          : chat.status === "account_deleted"
                          ? "⚠️ Account deleted · This listing no longer exists"
                          : "Negotiation Active"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                      style={
                        chat.status === "closed"
                          ? { backgroundColor: "#F2E8CF", color: "#8C6D51" }
                          : chat.status === "left"
                          ? { backgroundColor: "#FEE2E2", color: "#EF4444" }
                          : chat.status === "close_requested"
                          ? { backgroundColor: "#EAF0FD", color: "#5C7FC2" }
                          : chat.status === "account_deleted"
                          ? { backgroundColor: "#F3F4F6", color: "#6B7280" }
                          : { backgroundColor: "#E8F5E2", color: "#4A6741" }
                      }
                    >
                      {chat.status === "closed" ? "CLOSED" : chat.status === "left" ? "LEFT" : chat.status === "close_requested" ? "PENDING CLOSE" : chat.status === "account_deleted" ? "DELETED" : "ACTIVE"}
                    </div>
                    {(chat.status === "closed" || chat.status === "left" || chat.status === "account_deleted") && (
                      <button
                        onClick={(e) => hideChat(e, chat.id)}
                        title="Remove from inbox"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-400 transition-all font-black text-base shrink-0"
                      >
                        ×
                      </button>
                    )}
                    <span className="text-[#4A6741] font-black text-sm group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </div>
            ))}

            {!loading && filteredChats.length === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-[#E5E0D8] rounded-[3rem]">
                <p className="text-[#8C6D51] font-bold">
                  {filter === "all"
                    ? "No active bargains. Visit the marketplace to start one!"
                    : `No ${filter} deals found.`}
                </p>
                {filter === "all" && (
                  <button onClick={() => router.push("/marketplace")} className="mt-3 text-xs font-black text-[#4A6741] hover:underline">
                    Open Marketplace →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}