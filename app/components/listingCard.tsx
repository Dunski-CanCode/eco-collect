"use client";
import Avatar from "@/components/Avatar";

interface ListingCardProps {
  id: string;
  material: string;
  weight: number;
  description?: string;
  createdAt: string;
  state?: string;
  price?: number;
  collectorRole?: "collector";
  collectorName?: string;
  onAction: (id: string) => void;
  actionLabel: string;
  isOwn?: boolean;
  isCollectorViewing?: boolean;
}

export default function ListingCard({
  id, material, weight, description, createdAt,
  state, price, onAction, actionLabel, isOwn, isCollectorViewing, collectorName
}: ListingCardProps) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
      {isOwn && (
        <div className="absolute top-4 right-4 z-10 bg-[#4A6741] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow">
          YOUR LISTING
        </div>
      )}

      {/* Image placeholder */}
      <div className="h-52 bg-[#F2E8CF] relative overflow-hidden">
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Avatar role="collector" size={48} />
          <span className="text-[#8C6D51] font-black uppercase tracking-widest text-[10px] opacity-50">{material}</span>
        </div>
        <div className="absolute top-4 left-4 bg-[#4A6741] text-white px-4 py-1 rounded-full text-xs font-black shadow-lg">
          {weight} KG
        </div>
        {state && (
          <div className="absolute bottom-4 left-4 bg-white/90 text-[#8C6D51] px-3 py-1 rounded-full text-[10px] font-black shadow">
            {state}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-8">
        <h3 className="text-xl font-black text-black mb-1">{material}</h3>
        {collectorName && (
          <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mb-2">by {collectorName}</p>
        )}
        {price && (
          <p className="text-[#4A6741] font-black text-lg mb-2">₦{price.toLocaleString()}</p>
        )}
        <p className="text-gray-400 text-sm line-clamp-2 mb-6 leading-relaxed">
          {description || "No description provided."}
        </p>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-[10px] font-black text-[#8C6D51] uppercase tracking-tighter">
            {new Date(createdAt).toLocaleDateString()}
          </span>
          {!isOwn && !isCollectorViewing && (
            <button
              onClick={() => onAction(id)}
              className="bg-[#4A6741] text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-[#3d5535] active:scale-95 transition-all shadow-md"
            >
              {actionLabel}
            </button>
          )}
          {!isOwn && isCollectorViewing && (
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">VIEW ONLY</span>
          )}
        </div>
      </div>
    </div>
  );
}