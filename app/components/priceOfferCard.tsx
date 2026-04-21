"use client";

interface PriceOfferCardProps {
  price: number;
  isMine: boolean;
  dealClosed: boolean;
  isCollector: boolean;
  createdAt?: any;
  onAccept: (price: number) => void;
  onCounter: (price: number) => void;
}

export default function PriceOfferCard({
  price,
  isMine,
  dealClosed,
  isCollector,
  createdAt,
  onAccept,
  onCounter,
}: PriceOfferCardProps) {
  const canAccept = !isMine && !dealClosed && isCollector;
  const canCounter = !isMine && !dealClosed;

  const timeString = createdAt?.toDate?.()?.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }) || "";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-sm w-full">
        {/* Timestamp */}
        {timeString && (
          <p
            className={`text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 ${
              isMine ? "text-right" : "text-left"
            }`}
          >
            {timeString}
          </p>
        )}

        {/* Card */}
        <div
          className="p-6 rounded-[2rem] border-2 transition-all"
          style={
            isMine
              ? { borderColor: "#4A6741", backgroundColor: "white" }
              : { borderColor: "#F2E8CF", backgroundColor: "#FDFBF7" }
          }
        >
          {/* Label */}
          <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-2">
            {isMine ? "Your offer" : "Incoming offer"}
          </p>

          {/* Price */}
          <p className="text-3xl font-black text-black tracking-tighter">
            ₦{price.toLocaleString()}
          </p>

          {/* Actions */}
          {(canAccept || canCounter) && (
            <div className="mt-4 flex gap-2">
              {canAccept && (
                <button
                  onClick={() => onAccept(price)}
                  className="flex-1 bg-[#4A6741] text-white py-3 rounded-xl font-black text-xs hover:bg-[#3d5535] active:scale-95 transition-all shadow-md"
                >
                  ACCEPT DEAL
                </button>
              )}
              {canCounter && (
                <button
                  onClick={() => onCounter(price)}
                  className="flex-1 border-2 border-[#E5E0D8] text-[#8C6D51] py-3 rounded-xl font-black text-xs hover:border-[#8C6D51] hover:text-[#4A6741] active:scale-95 transition-all"
                >
                  COUNTER
                </button>
              )}
            </div>
          )}

          {/* Info for business users viewing an incoming offer */}
          {!isMine && !isCollector && !dealClosed && (
            <p className="mt-3 text-[10px] text-[#8C6D51] font-bold opacity-60">
              Only the collector can accept this offer.
            </p>
          )}

          {/* Closed state label */}
          {dealClosed && !isMine && (
            <p className="mt-3 text-[10px] font-black text-gray-300 uppercase tracking-widest">
              Negotiation closed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}