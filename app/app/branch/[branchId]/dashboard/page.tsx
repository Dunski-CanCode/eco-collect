"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import Avatar from "@/components/Avatar";

export default function BranchDashboard() {
  const router = useRouter();
  const params = useParams();
  const branchDocId = params.branchId as string;

  const [branchData, setBranchData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [branchSession, setBranchSession] = useState<any>(null);

  useEffect(() => {
    const checkAccess = async () => {
      // First, load branch data to get parentBusinessId
      const branchSnap = await getDoc(doc(db, "branches", branchDocId));
      if (!branchSnap.exists()) {
        router.push("/branch-login");
        return;
      }
      const branch = branchSnap.data();
      setBranchData(branch);

      // Load notifications for this branch
      const qNotif = query(
        collection(db, "notifications"),
        where("recipientId", "==", branchDocId)
      );
      onSnapshot(qNotif, (snap) => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1))
          .slice(0, 5);
        setNotifications(sorted);
      });

      // Check if user is authenticated as business owner
      const user = auth.currentUser;
      if (user && branch.parentBusinessId === user.uid) {
        // Business owner can view without session
        setLoading(false);
        return;
      }

      // Otherwise, check branch session
      const session = sessionStorage.getItem("branchSession");
      if (!session) {
        router.push("/branch-login");
        return;
      }
      const parsed = JSON.parse(session);
      // Validate session matches this branchId
      if (parsed.docId !== branchDocId) {
        router.push("/branch-login");
        return;
      }
      setBranchSession(parsed);
      setLoading(false);
    };

    checkAccess();
  }, [branchDocId, router]);

  const logout = () => {
    sessionStorage.removeItem("branchSession");
    window.location.assign("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center font-black text-[#4A6741] animate-pulse">
        LOADING BRANCH...
      </div>
    );
  }

  if (!branchData) {
    return null;
  }

  const stats = [
    { label: "Collectors Contacted", value: branchData.contactedCount || 0, color: "#4A6741" },
    { label: "Collectors Responded", value: branchData.respondedCount || 0, color: "#8C6D51" },
    { label: "Deals Closed", value: branchData.dealsCount || 0, color: "#5C7FC2" },
    {
      label: "Response Rate",
      value: branchData.contactedCount > 0
        ? `${Math.round((branchData.respondedCount / branchData.contactedCount) * 100)}%`
        : "—",
      color: "#4A6741"
    },
  ];

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex h-screen overflow-hidden">

      {/* BRANCH SIDEBAR */}
      <nav className="w-72 bg-white border-r border-[#E5E0D8] p-8 flex flex-col shrink-0">
        <h1 className="text-2xl font-black text-[#4A6741] mb-10 tracking-tighter">Eco-Collect</h1>

        {/* Branch Identity */}
        <div className="flex flex-col items-center gap-3 mb-8 pb-8 border-b border-[#E5E0D8]">
          <Avatar role="branch" size={72} showLabel companyName={branchData.companyName} />
          <div className="text-center">
            <p className="font-black text-black text-sm leading-tight">{branchData.branchName}</p>
            <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mt-1">
              — {branchData.companyName}
            </p>
            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
              ID: {branchData.branchId}
            </p>
          </div>
        </div>

        {/* Nav */}
        <div className="space-y-2 flex-1 font-bold">
          <button className="w-full text-left p-4 rounded-2xl bg-[#4A6741] text-white shadow-lg text-sm">
            DASHBOARD
          </button>
          <button
            onClick={() => router.push("/marketplace")}
            className="w-full text-left p-4 rounded-2xl text-gray-400 hover:text-[#4A6741] transition-all text-sm"
          >
            MARKETPLACE
          </button>
          <button
            onClick={() => router.push("/messages")}
            className="w-full text-left p-4 rounded-2xl text-gray-400 hover:text-[#4A6741] transition-all text-sm"
          >
            MESSAGES
          </button>
          <button
            onClick={() => router.push(`/company/${branchData.parentBusinessId}`)}
            className="w-full text-left p-4 rounded-2xl text-gray-400 hover:text-[#4A6741] transition-all text-sm"
          >
            COMPANY PROFILE
          </button>
        </div>

        {/* Logout */}
        <div className="pt-8 border-t border-[#E5E0D8]">
          <button
            onClick={logout}
            className="w-full text-left p-4 text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:text-black transition-colors"
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-12 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* Header */}
          <header>
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-block bg-[#4A6741] text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] mb-3">
                  BRANCH ACCOUNT
                </div>
                <h2 className="text-4xl font-black text-black tracking-tight">{branchData.branchName}</h2>
                <p className="text-[#8C6D51] font-bold mt-1">
                  {branchData.companyName} · ID: <span className="font-mono">{branchData.branchId}</span>
                </p>
              </div>
              <div
                className="px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{
                  backgroundColor: branchData.active ? "#E8F5E2" : "#F9F7F2",
                  color: branchData.active ? "#4A6741" : "#8C6D51",
                }}
              >
                {branchData.active ? "ACTIVE" : "INACTIVE"}
              </div>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white p-8 rounded-[2.5rem] border border-[#C5D5F0] shadow-sm text-center"
              >
                <p className="text-4xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-wide mt-2 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Performance Bar */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-[#E5E0D8] shadow-sm">
            <h3 className="font-black text-black mb-6">Outreach Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">Contacted</span>
                  <span className="text-[10px] font-black text-[#4A6741]">{branchData.contactedCount || 0}</span>
                </div>
                <div className="h-3 bg-[#F2E8CF] rounded-full overflow-hidden">
                  <div className="h-full bg-[#4A6741] rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">Responded</span>
                  <span className="text-[10px] font-black text-[#8C6D51]">{branchData.respondedCount || 0}</span>
                </div>
                <div className="h-3 bg-[#F2E8CF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8C6D51] rounded-full transition-all"
                    style={{
                      width: branchData.contactedCount > 0
                        ? `${(branchData.respondedCount / branchData.contactedCount) * 100}%`
                        : "0%"
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">Deals Closed</span>
                  <span className="text-[10px] font-black text-[#5C7FC2]">{branchData.dealsCount || 0}</span>
                </div>
                <div className="h-3 bg-[#F2E8CF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5C7FC2] rounded-full transition-all"
                    style={{
                      width: branchData.contactedCount > 0
                        ? `${(branchData.dealsCount / branchData.contactedCount) * 100}%`
                        : "0%"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#C5D5F0] shadow-sm">
              <h4 className="font-black text-black mb-2">Browse Marketplace</h4>
              <p className="text-xs font-bold text-[#8C6D51] leading-relaxed">
                Find collectors and start new bargains for materials your company needs.
              </p>
              <button
                onClick={() => router.push("/marketplace")}
                className="mt-6 text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest hover:underline"
              >
                Open Marketplace →
              </button>
            </div>
            <div className="bg-[#EAF0FD] p-8 rounded-[2.5rem] border border-[#C5D5F0]">
              <h4 className="font-black text-[#5C7FC2] mb-2">Company Profile</h4>
              <p className="text-xs font-bold text-[#8C6D51] leading-relaxed opacity-70">
                View your parent company's public portfolio that collectors see.
              </p>
              <button
                onClick={() => router.push(`/company/${branchData.parentBusinessId}`)}
                className="mt-6 text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest hover:underline"
              >
                View Profile →
              </button>
            </div>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#E5E0D8] shadow-sm">
              <h3 className="font-black text-black mb-6">Notifications</h3>
              <div className="space-y-3">
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${
                      n.read ? "border-[#E5E0D8] bg-white" : "border-[#5C7FC2]/30 bg-[#EAF0FD]"
                    }`}
                  >
                    <div className="text-xl shrink-0">
                      {n.type === "assignment" ? "📋" : n.type === "deal" ? "🎉" : "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-black text-sm">{n.title}</p>
                      <p className="text-xs font-bold text-[#8C6D51] mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] font-bold text-gray-300 mt-1">
                        {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {n.chatId && (
                      <button
                        onClick={() => router.push(`/messages/${n.chatId}`)}
                        className="shrink-0 text-[10px] font-black text-[#4A6741] uppercase tracking-widest hover:underline"
                      >
                        Open →
                      </button>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => updateDoc(doc(db, "notifications", n.id), { read: true })}
                        className="shrink-0 w-2 h-2 bg-[#5C7FC2] rounded-full mt-1.5"
                        title="Mark as read"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branch Info Note */}
          <div className="bg-white p-6 rounded-[2rem] border border-dashed border-[#C5D5F0]">
            <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mb-1">Branch Note</p>
            <p className="text-xs font-bold text-[#8C6D51] leading-relaxed">
              This is a branch account. You can contact collectors and manage bargains, but only the main business account can create new branches, edit the company portfolio, or view all branch statistics.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}