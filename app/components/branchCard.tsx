"use client";
import { useState } from "react";

interface BranchCardProps {
  branchId: string;
  branchName: string;
  companyName: string;
  contactedCount: number;
  respondedCount: number;
  dealsCount: number;
  active: boolean;
  branchPassword?: string;
  onView: (id: string) => void;
  onDelete?: (docId: string) => void;
  docId?: string;
}

export default function BranchCard({
  branchId,
  branchName,
  companyName,
  contactedCount,
  respondedCount,
  dealsCount,
  active,
  branchPassword,
  onView,
  onDelete,
  docId
}: BranchCardProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
      <div className="p-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-black text-black text-lg mb-1">{branchName}</h3>
            <p className="text-[#8C6D51] font-bold text-sm">{companyName}</p>
            <p className="text-[#5C7FC2] font-black text-xs mt-2 uppercase tracking-wider">ID: {branchId}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
            active ? 'bg-[#4A6741] text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {active ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-black text-[#4A6741]">{contactedCount}</div>
            <div className="text-xs font-bold text-[#8C6D51] uppercase tracking-widest">Contacted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-[#4A6741]">{respondedCount}</div>
            <div className="text-xs font-bold text-[#8C6D51] uppercase tracking-widest">Responded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-[#4A6741]">{dealsCount}</div>
            <div className="text-xs font-bold text-[#8C6D51] uppercase tracking-widest">Deals</div>
          </div>
        </div>

        {branchPassword !== undefined && (
          <div className="mb-4 p-4 bg-[#F9F7F2] rounded-2xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest">Branch Password</p>
              <button
                onClick={() => setShowPassword(p => !p)}
                className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest hover:text-[#4A6741] transition-colors"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
            <p className="mt-2 font-black text-sm text-black tracking-wider">
              {showPassword ? branchPassword : "••••••••"}
            </p>
          </div>
        )}

        <button
          onClick={() => onView(branchId)}
          className="w-full bg-[#4A6741] text-white py-3 rounded-xl font-black text-sm hover:bg-[#3a5331] transition-colors"
        >
          VIEW DASHBOARD →
        </button>
        {onDelete && docId && (
          <button
            onClick={() => onDelete(docId)}
            className="w-full mt-2 border-2 border-red-200 text-red-400 py-3 rounded-xl font-black text-sm hover:bg-red-50 hover:border-red-400 transition-colors"
          >
            DELETE BRANCH
          </button>
        )}
      </div>
    </div>
  );
}