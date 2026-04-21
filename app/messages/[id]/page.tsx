"use client";
import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc, collection, addDoc, onSnapshot, query,
  orderBy, updateDoc, getDoc, serverTimestamp, increment,
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Avatar from "@/components/Avatar";
import { deleteUserAccount } from "@/lib/accountUtils";
import { signOut } from "firebase/auth";

export default function BargainRoom() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [chatData, setChatData] = useState<any>(null);
  // currentUserId is either Firebase uid or parentBusinessId for branch sessions
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [branchSession, setBranchSession] = useState<any>(null);
  const [otherPartyData, setOtherPartyData] = useState<any>(null);
  const [companyPortfolio, setCompanyPortfolio] = useState<any>(null);
  const [text, setText] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showCollectorProfile, setShowCollectorProfile] = useState(false);
  const [branchData, setBranchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dealClosed, setDealClosed] = useState(false);
  const [dealLeft, setDealLeft] = useState(false);
  const [leftByRole, setLeftByRole] = useState<string | null>(null);
  const [closeRequestPending, setCloseRequestPending] = useState(false);
  const [closeRequestedBy, setCloseRequestedBy] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [deletedParty, setDeletedParty] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auth / session resolution
  useEffect(() => {
    // Check branch session first
    const raw = sessionStorage.getItem("branchSession");
    if (raw) {
      const parsed = JSON.parse(raw);
      setBranchSession(parsed);
      setCurrentUserId(parsed.parentBusinessId);
      setUserData({
        role: "branch",
        companyName: parsed.companyName,
        branchName: parsed.branchName,
        branchId: parsed.branchId,
        docId: parsed.docId,
      });
      setLoading(false);
      return;
    }

    // Regular Firebase auth
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Chat metadata — runs once we know currentUserId
  useEffect(() => {
    if (!chatId || !currentUserId) return;
    const unsubChat = onSnapshot(doc(db, "chats", chatId), async (snap) => {
      if (!snap.exists()) { router.push("/messages"); return; }
      const data = snap.data();

      // Access control: branch session can only view its own initiated chats
      const branchRaw = sessionStorage.getItem("branchSession");
      if (branchRaw) {
        const parsed = JSON.parse(branchRaw);
        if (data.initiatingBranchId && data.initiatingBranchId !== parsed.docId) {
          router.push("/messages");
          return;
        }
      } else {
        // Access control: main business account (Firebase auth) cannot open any chats
        const user = auth.currentUser;
        if (user) {
          const uSnap = await getDoc(doc(db, "users", user.uid));
          if (uSnap.exists() && uSnap.data().role === "business") {
            router.push("/dashboard");
            return;
          }
        }
      }

        setChatData(data);
      setDealClosed(data.status === "closed");
      setDealLeft(data.status === "left");
      setLeftByRole(data.leftByRole ?? null);
      setCloseRequestPending(data.status === "close_requested");
      setCloseRequestedBy(data.closeRequestedBy ?? null);
      setAccountDeleted(data.status === "account_deleted");
      setDeletedParty(data.deletedParty ?? null);

      // Load the other participant (the collector side)
      const otherId = data.participants?.find((id: string) => id !== currentUserId);
      if (otherId) {
        const otherSnap = await getDoc(doc(db, "users", otherId));
        if (otherSnap.exists()) {
          const otherData = otherSnap.data();
          setOtherPartyData(otherData);
          if (otherData.role === "business") {
            setCompanyPortfolio(otherData.portfolio || null);
          }
        }
      }

      // Load branch info so collector can VIEW COMPANY (the branch that contacted them)
      if (data.initiatingBranchId) {
        const branchSnap = await getDoc(doc(db, "branches", data.initiatingBranchId));
        if (branchSnap.exists()) setBranchData({ docId: branchSnap.id, ...branchSnap.data() });
      }
    });
    return () => unsubChat();
  }, [chatId, currentUserId]);

  // Messages feed
  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [chatId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUserId) return;
    const msgText = text;
    setText("");
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: msgText,
      senderId: currentUserId,
      type: "text",
      createdAt: serverTimestamp(),
    });

    // If collector sends first response, increment branch respondedCount
    if (isCollector && chatData?.initiatingBranchId && messages.filter(m => m.senderId === currentUserId).length === 0) {
      await updateDoc(doc(db, "branches", chatData.initiatingBranchId), { respondedCount: increment(1) });
    }
  };

  const sendPriceOffer = async () => {
    if (!offerPrice || !currentUserId) return;
    const price = Number(offerPrice);
    if (isNaN(price) || price <= 0) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: `Price offer: ₦${price.toLocaleString()}`,
      senderId: currentUserId,
      type: "price_offer",
      price,
      createdAt: serverTimestamp(),
    });

    const otherUserId = chatData?.participants?.find((id: string) => id !== currentUserId);
    if (otherUserId) {
      await addDoc(collection(db, "notifications"), {
        recipientId: otherUserId,
        chatId,
        type: "price",
        title: "New Price Offer",
        body: `An offer of ₦${price.toLocaleString()} was made for ${chatData?.itemTitle || "your listing"}.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    setOfferPrice("");
    setShowOfferInput(false);
  };

  const sendCounterOffer = (originalPrice: number) => {
    setShowOfferInput(true);
    setOfferPrice(String(Math.round(originalPrice * 1.1)));
  };

  const openPriceOffer = () => {
    setShowOfferInput(true);
    if (!offerPrice && chatData?.suggestedPrice) {
      setOfferPrice(String(chatData.suggestedPrice));
    }
  };

  const acceptOffer = async (price: number) => {
    if (!currentUserId) return;

    // Record agreed price but do NOT close the deal yet.
    // Both parties should close manually after meeting and completing the exchange.
    await updateDoc(doc(db, "chats", chatId), { agreedPrice: price, priceAccepted: true });

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: `✅ Price agreed: ₦${price.toLocaleString()}. Meet up, complete the exchange, then close the deal.`,
      senderId: "system",
      type: "system",
      createdAt: serverTimestamp(),
    });

    const otherUserId = chatData?.participants?.find((id: string) => id !== currentUserId);
    if (otherUserId) {
      await addDoc(collection(db, "notifications"), {
        recipientId: otherUserId,
        chatId,
        type: "price",
        title: "Price Accepted!",
        body: `The price of ₦${price.toLocaleString()} was accepted for ${chatData?.itemTitle || "your listing"}. Complete the meetup, then close the deal.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  };

  const requestCloseDeal = async () => {
    if (!currentUserId) return;
    setShowCloseConfirm(false);

    await updateDoc(doc(db, "chats", chatId), {
      status: "close_requested",
      closeRequestedBy: currentUserId,
    });

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: `${isBranch ? (userData?.branchName || "Branch") : (userData?.email?.split("@")[0] || "Collector")} has requested to close the deal. Waiting for the other side to confirm.`,
      senderId: "system",
      type: "system",
      createdAt: serverTimestamp(),
    });

    const otherUserId = chatData?.participants?.find((id: string) => id !== currentUserId);
    if (otherUserId) {
      await addDoc(collection(db, "notifications"), {
        recipientId: otherUserId,
        chatId,
        type: "close_request",
        title: "Close Deal Request",
        body: `The other party wants to close the deal for ${chatData?.itemTitle || "the listing"}. Open the chat to confirm or leave.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  };

  const confirmCloseDeal = async () => {
    if (!currentUserId) return;
    const price = chatData?.agreedPrice || 0;

    await updateDoc(doc(db, "chats", chatId), { status: "closed", closeRequestedBy: null });

    if (chatData?.listingId) {
      await updateDoc(doc(db, "listings", chatData.listingId), { status: "sold" });
    }

    const collectorId = chatData?.collectorId;
    if (collectorId) {
      const collectorRef = doc(db, "users", collectorId);
      const collectorSnap = await getDoc(collectorRef);
      if (collectorSnap.exists()) {
        const currentPoints = collectorSnap.data().impactPoints || 0;
        const pointsEarned = Math.floor(price / 1000) * 0.25;
        await updateDoc(collectorRef, { impactPoints: currentPoints + pointsEarned });
      }
    }

    if (chatData?.initiatingBranchId) {
      const branchRef = doc(db, "branches", chatData.initiatingBranchId);
      const branchSnap = await getDoc(branchRef);
      if (branchSnap.exists()) {
        const d = branchSnap.data();
        await updateDoc(branchRef, { dealsCount: (d.dealsCount || 0) + 1 });
      }
    }

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: price > 0
        ? `Deal closed at ₦${price.toLocaleString()}. Congratulations! 🎉`
        : `Deal closed. Congratulations! 🎉`,
      senderId: "system",
      type: "system",
      createdAt: serverTimestamp(),
    });

    for (const uid of chatData?.participants || []) {
      await addDoc(collection(db, "notifications"), {
        recipientId: uid,
        chatId,
        type: "deal",
        title: "Deal Closed!",
        body: price > 0
          ? `Your deal for ${chatData?.itemTitle || "materials"} was closed at ₦${price.toLocaleString()}.`
          : `Your deal for ${chatData?.itemTitle || "materials"} has been closed.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  };

  // Legacy direct-close (kept for cases where same user who requested also confirms — shouldn't normally happen)
  const closeDeal = confirmCloseDeal;

  const leaveOffer = async () => {
    if (!currentUserId) return;
    setShowLeaveConfirm(false);
    const leavingRole = isBranch ? "branch" : "collector";
    const leavingName = isBranch ? (userData?.branchName || "Branch") : (userData?.email?.split("@")[0] || "Collector");

    await updateDoc(doc(db, "chats", chatId), {
      status: "left",
      leftByRole: leavingRole,
      leftById: currentUserId,
      closeRequestedBy: null,
    });

    // Put listing back on marketplace
    if (chatData?.listingId) {
      await updateDoc(doc(db, "listings", chatData.listingId), { status: "available" });
    }

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: `${leavingName} has left this offer. The listing is back on the marketplace.`,
      senderId: "system",
      type: "system",
      createdAt: serverTimestamp(),
    });

    const otherUserId = chatData?.participants?.find((id: string) => id !== currentUserId);
    if (otherUserId) {
      await addDoc(collection(db, "notifications"), {
        recipientId: otherUserId,
        chatId,
        type: "deal",
        title: "Offer Left",
        body: `${leavingName} has left the offer for ${chatData?.itemTitle || "the listing"}. The listing is back on the marketplace.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  };

  const isMine = (msg: any) => msg.senderId === currentUserId;
  const role = userData?.role || "collector";
  const isBranch = role === "branch";
  const isCollector = role === "collector";
  const chatEnded = dealClosed || dealLeft || accountDeleted;

  const handleLogout = () => {
    if (isBranch) {
      sessionStorage.removeItem("branchSession");
      window.location.assign("/");
    } else {
      signOut(auth).then(() => window.location.assign("/"));
    }
  };

  const handleNavigate = (page: 'dashboard' | 'messages' | 'marketplace') => {
    if (isBranch) {
      if (page === 'dashboard') router.push(`/branch/${userData?.docId}/dashboard`);
      else router.push(`/${page}`);
    } else {
      router.push(`/${page}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center font-black text-[#4A6741] animate-pulse">
        LOADING CHAT...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex h-screen overflow-hidden">

      {/* SIDEBAR — branch gets its own inline nav, others use Sidebar component */}
      {isBranch ? (
        <nav className="w-72 bg-white border-r border-[#E5E0D8] p-8 flex flex-col shrink-0">
          <h1 className="text-2xl font-black text-[#4A6741] mb-10 tracking-tighter">Eco-Collect</h1>
          <div className="flex flex-col items-center gap-2 mb-8 pb-8 border-b border-[#E5E0D8]">
            <Avatar role="branch" size={56} showLabel companyName={userData?.companyName} />
            <p className="font-black text-black text-sm">{userData?.branchName}</p>
            <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest">— {userData?.companyName}</p>
          </div>
          <div className="space-y-2 flex-1 font-bold">
            <button
              onClick={() => router.push(`/branch/${userData?.docId}/dashboard`)}
              className="w-full text-left p-4 rounded-2xl text-gray-400 hover:text-[#4A6741] transition-all text-sm"
            >
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
              className="w-full text-left p-4 rounded-2xl bg-[#4A6741] text-white shadow-lg text-sm"
            >
              MESSAGES
            </button>
          </div>
          <div className="pt-8 border-t border-[#E5E0D8]">
            <button
              onClick={handleLogout}
              className="w-full text-left p-4 text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:text-black transition-colors"
            >
              Log Out
            </button>
          </div>
        </nav>
      ) : (
        userData && (
          <Sidebar
            role={role}
            active="messages"
            displayName={isCollector ? (userData.displayName || userData.email?.split("@")[0]) : userData.companyName}
            companyName={role === "business" ? userData.companyName : undefined}
            onDeleteAccount={async () => { try { await deleteUserAccount(); } catch {} }}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        )
      )}

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* CHAT HEADER */}
        <header className="bg-white border-b border-[#E5E0D8] px-10 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/messages")}
              className="text-[#8C6D51] font-black text-sm hover:text-black transition-colors mr-2"
            >
              ←
            </button>
            <Avatar role={isCollector ? "business" : "collector"} size={48} />
            <div>
              <h2 className="text-lg font-black text-black tracking-tight">
                {chatData?.itemTitle || "Bargain Room"}
              </h2>
              <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">
                {dealClosed
                  ? `✓ Deal closed at ₦${chatData?.agreedPrice?.toLocaleString()}`
                  : "Negotiation in progress"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCollector && (otherPartyData || branchData) && (
              <button
                onClick={() => setShowPortfolio(!showPortfolio)}
                className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#8C6D51] text-[#8C6D51] hover:bg-[#8C6D51] hover:text-white transition-all"
              >
                {showPortfolio ? "HIDE PROFILE" : "VIEW COMPANY"}
              </button>
            )}
            {(isBranch) && otherPartyData && (
              <button
                onClick={() => setShowCollectorProfile(!showCollectorProfile)}
                className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#5C7FC2] text-[#5C7FC2] hover:bg-[#5C7FC2] hover:text-white transition-all"
              >
                {showCollectorProfile ? "HIDE COLLECTOR" : "VIEW COLLECTOR"}
              </button>
            )}
            {!chatEnded && (
              <>
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-red-300 text-red-400 hover:bg-red-50 transition-all"
                >
                  LEAVE OFFER
                </button>
                {closeRequestPending && closeRequestedBy !== currentUserId ? (
                  // Other side requested close — show confirm/leave buttons
                  <button
                    onClick={confirmCloseDeal}
                    className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#4A6741] bg-[#4A6741] text-white animate-pulse transition-all"
                  >
                    CONFIRM CLOSE
                  </button>
                ) : closeRequestPending && closeRequestedBy === currentUserId ? (
                  <div className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#8C6D51] text-[#8C6D51] opacity-60">
                    AWAITING CONFIRMATION…
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741] hover:text-white transition-all"
                  >
                    CLOSE DEAL
                  </button>
                )}
              </>
            )}
            {dealClosed && (
              <div className="bg-[#4A6741] text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                CLOSED
              </div>
            )}
            {dealLeft && (
              <div className="bg-red-100 text-red-500 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                OFFER LEFT
              </div>
            )}
            {accountDeleted && (
              <div className="bg-gray-200 text-gray-500 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                ACCOUNT DELETED
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">

          {/* MESSAGES FEED */}
          <main className="flex-1 overflow-y-auto px-10 py-8 space-y-4">

            {/* Account deleted banner */}
            {accountDeleted && (
              <div className="sticky top-0 z-10 bg-gray-100 border border-gray-200 rounded-3xl px-8 py-5 text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">⚠️ Account Deleted</p>
                <p className="text-sm font-bold text-gray-600">
                  {deletedParty === "collector"
                    ? "The collector's account has been deleted. This listing no longer exists."
                    : deletedParty === "branch"
                    ? "The branch account that contacted you has been deleted."
                    : "The other party's account has been deleted."}
                </p>
              </div>
            )}

            {/* Close-deal request banner — visible to the other party */}
            {closeRequestPending && closeRequestedBy !== currentUserId && !chatEnded && (
              <div className="sticky top-0 z-10 bg-[#4A6741] text-white rounded-3xl px-8 py-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">🤝 Close Deal Request</p>
                  <p className="text-sm font-bold">The other party wants to close this deal. Confirm if you're happy, or leave the offer.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={confirmCloseDeal}
                    className="bg-white text-[#4A6741] px-5 py-2 rounded-2xl font-black text-xs active:scale-95 transition-all"
                  >
                    CONFIRM
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="bg-red-500 text-white px-5 py-2 rounded-2xl font-black text-xs active:scale-95 transition-all"
                  >
                    LEAVE
                  </button>
                </div>
              </div>
            )}

            {/* Waiting banner — visible to the side who requested */}
            {closeRequestPending && closeRequestedBy === currentUserId && !chatEnded && (
              <div className="sticky top-0 z-10 bg-[#F2E8CF] border border-[#8C6D51]/30 rounded-3xl px-8 py-4 text-center">
                <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">⏳ Waiting for the other party to confirm closing the deal…</p>
              </div>
            )}
            {messages.map((msg) => {

              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-[#F2E8CF] text-[#8C6D51] px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              if (msg.type === "price_offer") {
                const mine = isMine(msg);
                const canAccept = !mine && !chatEnded && isCollector;
                const canCounter = !mine && !chatEnded && (isBranch || isCollector);

                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-sm w-full">
                      <p className={`text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 ${mine ? "text-right" : "text-left"}`}>
                        {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""}
                      </p>
                      <div
                        className="p-6 rounded-[2rem] border-2"
                        style={
                          mine
                            ? { borderColor: "#4A6741", backgroundColor: "white" }
                            : { borderColor: "#F2E8CF", backgroundColor: "#FDFBF7" }
                        }
                      >
                        <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">
                          {mine ? "Your offer" : "Incoming offer"}
                        </p>
                        <p className="text-3xl font-black text-black tracking-tighter">
                          ₦{msg.price?.toLocaleString()}
                        </p>
                        <div className="mt-4 flex gap-2">
                          {canAccept && (
                            <button
                              onClick={() => acceptOffer(msg.price)}
                              className="flex-1 bg-[#4A6741] text-white py-3 rounded-xl font-black text-xs hover:bg-[#3d5535] active:scale-95 transition-all"
                            >
                              ACCEPT DEAL
                            </button>
                          )}
                          {canCounter && (
                            <button
                              onClick={() => sendCounterOffer(msg.price)}
                              className="flex-1 border-2 border-[#E5E0D8] text-[#8C6D51] py-3 rounded-xl font-black text-xs hover:border-[#8C6D51] active:scale-95 transition-all"
                            >
                              COUNTER
                            </button>
                          )}
                        </div>
                        {!mine && !isCollector && !chatEnded && (
                          <p className="mt-3 text-[10px] text-[#8C6D51] font-bold opacity-60">Only the collector can accept this offer.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isMine(msg) ? "justify-end" : "justify-start"}`}>
                  <div>
                    <p className={`text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 ${isMine(msg) ? "text-right" : "text-left"}`}>
                      {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""}
                    </p>
                    <div
                      className="max-w-md px-6 py-4 font-bold text-sm leading-relaxed"
                      style={{
                        backgroundColor: isMine(msg) ? "#4A6741" : "white",
                        color: isMine(msg) ? "white" : "black",
                        borderRadius: isMine(msg) ? "1.5rem 1.5rem 0.25rem 1.5rem" : "1.5rem 1.5rem 1.5rem 0.25rem",
                        border: isMine(msg) ? "none" : "1px solid #F3F4F6",
                        boxShadow: isMine(msg) ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <div className="w-16 h-16 bg-[#F2E8CF] rounded-3xl flex items-center justify-center text-3xl mb-4">🤝</div>
                <p className="font-black text-black">Start the negotiation.</p>
                <p className="text-[#8C6D51] font-bold text-sm mt-1">Send a message or make a price offer below.</p>
              </div>
            )}

            {/* Reminder banner */}
            {messages.length === 0 && (
              <div className="mx-auto max-w-md mt-6 p-5 bg-[#EAF0FD] border border-[#5C7FC2]/30 rounded-3xl text-center">
                <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mb-2">📋 A few things to sort out in chat</p>
                <ul className="text-xs font-bold text-[#3D5E9E] space-y-1 text-left list-disc list-inside">
                  <li>Agree on a <strong>meetup time and location</strong> for handover</li>
                  <li>Discuss your <strong>payment plan</strong> here in the chat</li>
                  <li>Note: <strong>actual payment happens outside the app</strong></li>
                </ul>
              </div>
            )}

            <div ref={bottomRef} />
          </main>

          {/* COMPANY PROFILE SIDEBAR — visible to collector */}
          {showPortfolio && (otherPartyData || branchData) && (
            <aside className="w-80 bg-white border-l border-[#E5E0D8] p-8 overflow-y-auto shrink-0">
              <div className="flex flex-col items-center mb-6 pb-6 border-b border-[#E5E0D8]">
                <Avatar role="business" size={64} showLabel companyName={otherPartyData?.companyName || branchData?.companyName} />
                <h3 className="text-lg font-black text-black mt-3 text-center">{otherPartyData?.companyName || branchData?.companyName}</h3>
                {branchData?.branchName && (
                  <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mt-1">Branch: {branchData.branchName}</p>
                )}
              </div>
              <div className="space-y-4">
                {branchData?.branchName && (
                  <div>
                    <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Branch Name</p>
                    <p className="text-sm font-bold text-black">{branchData.branchName}</p>
                  </div>
                )}
                {branchData?.location && (
                  <div>
                    <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Location</p>
                    <p className="text-sm font-bold text-black">{branchData.location}</p>
                  </div>
                )}
                {branchData?.dealsCount != null && (
                  <div>
                    <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Deals Closed</p>
                    <p className="text-sm font-black text-black">{branchData.dealsCount}</p>
                  </div>
                )}
              </div>
              {companyPortfolio && (
                <div className="mt-6 pt-6 border-t border-[#E5E0D8] space-y-4">
                  {companyPortfolio.description && (
                    <div>
                      <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">About</p>
                      <p className="text-sm font-bold text-black leading-relaxed">{companyPortfolio.description}</p>
                    </div>
                  )}
                  {companyPortfolio.materialsWanted?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">Materials They Buy</p>
                      <div className="flex flex-wrap gap-2">
                        {companyPortfolio.materialsWanted.map((m: string) => (
                          <span key={m} className="px-3 py-1 bg-[#F2E8CF] text-[#8C6D51] rounded-full text-[10px] font-black uppercase">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {companyPortfolio.states?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">Operates In</p>
                      <div className="flex flex-wrap gap-2">
                        {companyPortfolio.states.map((s: string) => (
                          <span key={s} className="px-3 py-1 bg-[#EAF0FD] text-[#5C7FC2] rounded-full text-[10px] font-black uppercase">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {companyPortfolio.website && (
                    <div>
                      <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Website</p>
                      <a href={companyPortfolio.website} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-[#5C7FC2] hover:underline break-all">
                        {companyPortfolio.website}
                      </a>
                    </div>
                  )}
                  {companyPortfolio.contactEmail && (
                    <div>
                      <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Contact</p>
                      <p className="text-sm font-black text-black break-all">{companyPortfolio.contactEmail}</p>
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}

          {/* COLLECTOR PROFILE SIDEBAR */}
          {showCollectorProfile && otherPartyData && (
            <aside className="w-80 bg-white border-l border-[#E5E0D8] p-8 overflow-y-auto shrink-0">
              <div className="flex flex-col items-center mb-6 pb-6 border-b border-[#E5E0D8]">
                <Avatar role="collector" size={64} />
                <h3 className="text-lg font-black text-black mt-3 text-center">
                  {otherPartyData.displayName || otherPartyData.email?.split("@")[0] || "Collector"}
                </h3>
                <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mt-1">Waste Collector</p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Email</p>
                  <p className="text-sm font-bold text-black break-all">{otherPartyData.email || "—"}</p>
                </div>
                {chatData?.itemTitle && (
                  <div>
                    <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Listing</p>
                    <p className="text-sm font-bold text-black">{chatData.itemTitle}</p>
                  </div>
                )}
                {chatData?.suggestedPrice && (
                  <div>
                    <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Asking Price</p>
                    <p className="text-sm font-black text-[#4A6741]">₦{chatData.suggestedPrice.toLocaleString()}</p>
                  </div>
                )}
                {chatData?.agreedPrice && (
                  <div>
                    <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Agreed Price</p>
                    <p className="text-sm font-black text-[#4A6741]">₦{chatData.agreedPrice.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Impact Points</p>
                  <p className="text-sm font-black text-black">{otherPartyData.impactPoints || 0} ECO</p>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* INPUT AREA */}
        {!chatEnded ? (
          <footer className="bg-white border-t border-[#E5E0D8] px-10 py-6 shrink-0">
            {showOfferInput && (
              <div className="flex items-center gap-4 mb-4 p-4 bg-[#F9F7F2] rounded-2xl border border-[#E5E0D8]">
                <span className="font-black text-[#8C6D51] text-sm shrink-0">₦</span>
                <input
                  type="number"
                  placeholder="Enter offer amount"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="flex-1 bg-transparent outline-none font-black text-black text-lg placeholder:text-gray-300"
                  autoFocus
                />
                <button
                  onClick={sendPriceOffer}
                  className="bg-[#4A6741] text-white px-6 py-2 rounded-xl font-black text-xs active:scale-95 transition-all"
                >
                  SEND OFFER
                </button>
                <button
                  onClick={() => { setShowOfferInput(false); setOfferPrice(""); }}
                  className="text-[#8C6D51] font-black text-xs hover:text-black"
                >
                  CANCEL
                </button>
              </div>
            )}

            <form onSubmit={sendMessage} className="flex items-center gap-4">
              {isBranch && (
                <button
                  type="button"
                  onClick={openPriceOffer}
                  title="Make a price offer"
                  className="shrink-0 w-12 h-12 bg-[#F2E8CF] rounded-2xl flex items-center justify-center font-black text-[#8C6D51] hover:bg-[#4A6741] hover:text-white transition-all text-base"
                >
                  ₦
                </button>
              )}
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isBranch ? "Send a message to the collector..." : "Send a message..."}
                className="flex-1 bg-[#F9F7F2] px-6 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#4A6741] font-bold text-sm transition-all"
              />
              <button
                type="submit"
                className="shrink-0 bg-[#4A6741] text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg hover:bg-[#3d5535] active:scale-95 transition-all shadow-lg"
              >
                →
              </button>
            </form>
          </footer>
        ) : (
          <footer className="bg-white border-t border-[#E5E0D8] px-10 py-6 text-center shrink-0">
            {dealLeft ? (
              <>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                  This offer was left. The listing is back on the marketplace.
                </p>
                <button
                  onClick={() => router.push("/marketplace")}
                  className="mt-2 text-[10px] font-black text-[#4A6741] uppercase tracking-widest hover:underline"
                >
                  Open Marketplace →
                </button>
              </>
            ) : (
              <>
                <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">
                  This bargain has been closed. Head to the marketplace for new deals.
                </p>
                <button
                  onClick={() => router.push("/marketplace")}
                  className="mt-2 text-[10px] font-black text-[#4A6741] uppercase tracking-widest hover:underline"
                >
                  Open Marketplace →
                </button>
              </>
            )}
          </footer>
        )}
      </div>

      {/* LEAVE OFFER CONFIRMATION MODAL */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-black mb-3">Leave this offer?</h3>
            <p className="text-sm font-bold text-[#8C6D51] mb-6 leading-relaxed">
              {isCollector
                ? "Your listing will go back to the marketplace and this branch will no longer be able to message you here. They can still send a new request from the marketplace."
                : "The collector's listing will go back to the marketplace and this chat will be archived."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={leaveOffer}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-black text-xs hover:bg-red-600 active:scale-95 transition-all"
              >
                YES, LEAVE OFFER
              </button>
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 border-2 border-[#E5E0D8] text-[#8C6D51] py-3 rounded-2xl font-black text-xs hover:border-[#8C6D51] active:scale-95 transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE DEAL CONFIRMATION MODAL */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-black mb-2">Close this deal?</h3>

            {!chatData?.priceAccepted && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">⚠️ Price not yet agreed</p>
                <p className="text-xs font-bold text-red-400 leading-relaxed">
                  Neither side has accepted a price offer yet. It is strongly recommended to agree on a price before closing.
                </p>
              </div>
            )}

            <div className="mb-5 p-4 bg-[#EAF0FD] border border-[#5C7FC2]/30 rounded-2xl">
              <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mb-1">✅ Recommended when:</p>
              <ul className="text-xs font-bold text-[#3D5E9E] space-y-1 list-disc list-inside">
                <li>Both sides have <strong>agreed on a price</strong></li>
                <li>You have <strong>met up and completed</strong> the exchange</li>
                <li>Payment has been <strong>settled outside the app</strong></li>
              </ul>
            </div>
            <p className="text-sm font-bold text-[#8C6D51] mb-6 leading-relaxed">
              Closing the deal is permanent. The listing will be marked as sold and the chat will be archived.
            </p>
            <div className="flex gap-3">
              <button
                onClick={requestCloseDeal}
                className="flex-1 bg-[#4A6741] text-white py-3 rounded-2xl font-black text-xs hover:bg-[#3d5535] active:scale-95 transition-all"
              >
                YES, REQUEST CLOSE
              </button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 border-2 border-[#E5E0D8] text-[#8C6D51] py-3 rounded-2xl font-black text-xs hover:border-[#8C6D51] active:scale-95 transition-all"
              >
                NOT YET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
