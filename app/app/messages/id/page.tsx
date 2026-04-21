"use client";
import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc, collection, addDoc, onSnapshot, query,
  orderBy, updateDoc, getDoc, serverTimestamp, deleteDoc
} from "firebase/firestore";
import { signOut, deleteUser } from "firebase/auth";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/sidebar";
import Avatar from "@/components/Avatar";
import { deleteUserAccount } from "@/lib/accountUtils";

export default function BargainRoom() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [chatData, setChatData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [otherPartyData, setOtherPartyData] = useState<any>(null);
  const [companyPortfolio, setCompanyPortfolio] = useState<any>(null);
  const [text, setText] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dealClosed, setDealClosed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // Auth + user data
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push("/login"); return; }
      setCurrentUser(user);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());
    });
    return () => unsubAuth();
  }, [router]);

  // Chat metadata
  useEffect(() => {
    if (!chatId) return;
    const unsubChat = onSnapshot(doc(db, "chats", chatId), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setChatData(data);
        setDealClosed(data.status === "closed");

        // Load other party
        const user = auth.currentUser;
        if (user) {
          const otherId = data.participants?.find((id: string) => id !== user.uid);
          if (otherId) {
            const otherSnap = await getDoc(doc(db, "users", otherId));
            if (otherSnap.exists()) {
              const otherData = otherSnap.data();
              setOtherPartyData(otherData);
              // If collector, load the business portfolio
              if (otherData.role === "business") {
                setCompanyPortfolio(otherData.portfolio || null);
              }
            }
          }
        }
      }
      setLoading(false);
    });
    return () => unsubChat();
  }, [chatId]);

  // Messages
  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsubMsgs = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubMsgs();
  }, [chatId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    const msgText = text;
    setText("");
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: msgText,
      senderId: currentUser.uid,
      type: "text",
      createdAt: serverTimestamp(),
    });
  };

  const sendPriceOffer = async () => {
    if (!offerPrice || !currentUser) return;
    const price = Number(offerPrice);
    if (isNaN(price) || price <= 0) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: `Price offer: ₦${price.toLocaleString()}`,
      senderId: currentUser.uid,
      type: "price_offer",
      price,
      createdAt: serverTimestamp(),
    });

    // Notify other party
    const otherUserId = chatData?.participants?.find((id: string) => id !== currentUser.uid);
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

  const sendCounterOffer = async (originalPrice: number) => {
    setShowOfferInput(true);
    setOfferPrice(String(Math.round(originalPrice * 1.1)));
  };

  const acceptOffer = async (price: number) => {
    if (!currentUser || !userData) return;

    await updateDoc(doc(db, "chats", chatId), { status: "closed", agreedPrice: price });

    if (chatData?.listingId) {
      await updateDoc(doc(db, "listings", chatData.listingId), { status: "sold" });
    }

    // Award ECO points to collector
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

    // Update branch stats if applicable
    if (chatData?.initiatingBranchId) {
      const branchRef = doc(db, "branches", chatData.initiatingBranchId);
      const branchSnap = await getDoc(branchRef);
      if (branchSnap.exists()) {
        const d = branchSnap.data();
        await updateDoc(branchRef, { dealsCount: (d.dealsCount || 0) + 1 });
      }
    }

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: `Deal closed at ₦${price.toLocaleString()}. Congratulations! 🎉`,
      senderId: "system",
      type: "system",
      createdAt: serverTimestamp(),
    });

    // Notify both parties
    for (const uid of chatData?.participants || []) {
      await addDoc(collection(db, "notifications"), {
        recipientId: uid,
        chatId,
        type: "deal",
        title: "Deal Closed!",
        body: `Your deal for ${chatData?.itemTitle || "materials"} was closed at ₦${price.toLocaleString()}.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  };

  const isMyMessage = (msg: any) => msg.senderId === currentUser?.uid;
  const isCollector = userData?.role === "collector";
  const role = userData?.role || "collector";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center font-black text-[#4A6741] animate-pulse">
        LOADING CHAT...
      </div>
    );
  }

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
        />
      )}

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* CHAT HEADER */}
        <header className="bg-white border-b border-[#E5E0D8] px-10 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Avatar
              role={isCollector ? "business" : "collector"}
              size={48}
            />
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
            {/* View portfolio button - only shown to collector */}
            {isCollector && companyPortfolio && (
              <button
                onClick={() => setShowPortfolio(!showPortfolio)}
                className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-[#8C6D51] text-[#8C6D51] hover:bg-[#8C6D51] hover:text-white transition-all"
              >
                {showPortfolio ? "HIDE PROFILE" : "VIEW COMPANY"}
              </button>
            )}
            {dealClosed && (
              <div className="bg-[#4A6741] text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                CLOSED
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">

          {/* MESSAGES FEED */}
          <main className="flex-1 overflow-y-auto px-10 py-8 space-y-4">
            {messages.map((msg) => {

              // System message
              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-[#F2E8CF] text-[#8C6D51] px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              // Price offer
              if (msg.type === "price_offer") {
                const mine = isMyMessage(msg);
                const canAccept = !mine && !dealClosed && isCollector;
                const canCounter = !mine && !dealClosed;

                return (
                  <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-sm w-full">
                      {/* Timestamp */}
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
                        {!mine && !isCollector && !dealClosed && (
                          <p className="mt-3 text-[10px] text-[#8C6D51] font-bold opacity-60">Only the collector can accept this offer.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Regular text
              return (
                <div key={msg.id} className={`flex ${isMyMessage(msg) ? "justify-end" : "justify-start"}`}>
                  <div>
                    <p className={`text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 ${isMyMessage(msg) ? "text-right" : "text-left"}`}>
                      {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""}
                    </p>
                    <div
                      className="max-w-md px-6 py-4 font-bold text-sm leading-relaxed"
                      style={{
                        backgroundColor: isMyMessage(msg) ? "#4A6741" : "white",
                        color: isMyMessage(msg) ? "white" : "black",
                        borderRadius: isMyMessage(msg) ? "1.5rem 1.5rem 0.25rem 1.5rem" : "1.5rem 1.5rem 1.5rem 0.25rem",
                        border: isMyMessage(msg) ? "none" : "1px solid #F3F4F6",
                        boxShadow: isMyMessage(msg) ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
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

            <div ref={bottomRef} />
          </main>

          {/* COMPANY PORTFOLIO SIDEBAR - only visible when toggled by collector */}
          {showPortfolio && companyPortfolio && (
            <aside className="w-80 bg-white border-l border-[#E5E0D8] p-8 overflow-y-auto shrink-0">
              <div className="flex flex-col items-center mb-6 pb-6 border-b border-[#E5E0D8]">
                <Avatar role="business" size={64} showLabel companyName={otherPartyData?.companyName} />
                <h3 className="text-lg font-black text-black mt-3 text-center">{otherPartyData?.companyName}</h3>
              </div>

              {companyPortfolio.description && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">About</p>
                  <p className="text-sm font-bold text-black leading-relaxed">{companyPortfolio.description}</p>
                </div>
              )}

              {companyPortfolio.materialsWanted?.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">Materials They Buy</p>
                  <div className="flex flex-wrap gap-2">
                    {companyPortfolio.materialsWanted.map((m: string) => (
                      <span key={m} className="px-3 py-1 bg-[#F2E8CF] text-[#8C6D51] rounded-full text-[10px] font-black uppercase">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {companyPortfolio.states?.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">Operates In</p>
                  <div className="flex flex-wrap gap-2">
                    {companyPortfolio.states.map((s: string) => (
                      <span key={s} className="px-3 py-1 bg-[#EAF0FD] text-[#5C7FC2] rounded-full text-[10px] font-black uppercase">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {companyPortfolio.website && (
                <div className="mb-4">
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-1">Website</p>
                  <a href={companyPortfolio.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-black text-[#5C7FC2] hover:underline break-all">
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
            </aside>
          )}
        </div>

        {/* INPUT AREA */}
        {!dealClosed ? (
          <footer className="bg-white border-t border-[#E5E0D8] px-10 py-6 shrink-0">

            {/* Price Offer Input */}
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
              <button
                type="button"
                onClick={() => setShowOfferInput(!showOfferInput)}
                title="Make a price offer"
                className="shrink-0 w-12 h-12 bg-[#F2E8CF] rounded-2xl flex items-center justify-center font-black text-[#8C6D51] hover:bg-[#4A6741] hover:text-white transition-all text-base"
              >
                ₦
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Send a message..."
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
            <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">
              This bargain has been closed. Head to the marketplace for new deals.
            </p>
            <button
              onClick={() => router.push("/marketplace")}
              className="mt-2 text-[10px] font-black text-[#4A6741] uppercase tracking-widest hover:underline"
            >
              Open Marketplace →
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}