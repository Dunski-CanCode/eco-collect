"use client";
import Avatar from "@/components/Avatar";

interface SidebarProps {
  role: string;
  active: string;
  displayName: string;
  companyName?: string;
  onDeleteAccount: () => Promise<void>;
  onNavigate: (page: 'dashboard' | 'messages' | 'marketplace') => void;
  onLogout?: () => void;
}

export default function Sidebar({ role, active, displayName, companyName, onDeleteAccount, onNavigate, onLogout }: SidebarProps) {
  const avatarRole = role === "business" ? "business" : role === "branch" ? "branch" : "collector";
  return (
    <nav className="w-72 bg-white border-r border-[#E5E0D8] p-8 flex flex-col shrink-0">
      <h1 className="text-2xl font-black text-[#4A6741] mb-6 tracking-tighter">Eco-Collect</h1>

      {/* User identity */}
      <div className="flex items-center gap-3 mb-8 pb-8 border-b border-[#E5E0D8]">
        <Avatar role={avatarRole} size={48} />
        <div className="min-w-0">
          <p className="font-black text-black text-sm truncate">{displayName}</p>
          {companyName && <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest truncate">{companyName}</p>}
        </div>
      </div>
      <div className="space-y-2 flex-1 font-bold">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full text-left p-4 rounded-2xl ${active === 'dashboard' ? 'bg-[#4A6741] text-white shadow-lg' : 'text-gray-400 hover:text-[#4A6741] transition-all'}`}
        >
          DASHBOARD
        </button>
        {role !== "business" && (
          <button
            onClick={() => onNavigate('messages')}
            className={`w-full text-left p-4 rounded-2xl ${active === 'messages' ? 'bg-[#4A6741] text-white shadow-lg' : 'text-gray-400 hover:text-[#4A6741] transition-all'}`}
          >
            MESSAGES
          </button>
        )}
        <button
          onClick={() => onNavigate('marketplace')}
          className={`w-full text-left p-4 rounded-2xl ${active === 'marketplace' ? 'bg-[#4A6741] text-white shadow-lg' : 'text-gray-400 hover:text-[#4A6741] transition-all'}`}
        >
          MARKETPLACE
        </button>
      </div>
      <div className="mt-auto">
        <div className="text-sm text-gray-600 mb-4">
          <p className="font-bold">{displayName}</p>
          {companyName && <p className="text-xs">{companyName}</p>}
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full text-left p-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-all text-sm mb-2"
          >
            Logout
          </button>
        )}
        <button
          onClick={onDeleteAccount}
          className="w-full text-left p-3 rounded-xl text-red-600 hover:bg-red-50 transition-all text-sm"
        >
          Delete Account
        </button>
      </div>
    </nav>
  );
}