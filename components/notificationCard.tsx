"use client";
import { useRouter } from "next/navigation";

interface NotificationCardProps {
  id: string;
  title: string;
  body: string;
  type: string;
  chatId?: string;
}

export default function NotificationCard({ title, body, type, chatId }: NotificationCardProps) {
  const router = useRouter();
  const dotColor = type === "price" ? "#F97316" : type === "deal" ? "#4A6741" : "#5C7FC2";

  return (
    <div
      onClick={() => chatId && router.push(`/messages/${chatId}`)}
      className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-xl cursor-pointer transition-all active:scale-95"
    >
      <div className="flex gap-3">
        <div
          className="w-2 h-2 mt-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <div>
          <p className="text-xs font-black text-black leading-tight">{title}</p>
          <p className="text-[10px] text-[#8C6D51] font-bold mt-1 line-clamp-2">{body}</p>
        </div>
      </div>
    </div>
  );
}