"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { getBranchError } from "@/lib/errs";

export default function BranchLogin() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchPassword, setBranchPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [companyErr, setCompanyErr] = useState("");
  const [branchIdErr, setBranchIdErr] = useState("");
  const [branchPasswordErr, setBranchPasswordErr] = useState("");
  const [bannerErr, setBannerErr] = useState("");

  const clearErrors = () => {
    setCompanyErr(""); setBranchIdErr(""); setBranchPasswordErr(""); setBannerErr("");
  };

  const handleBranchLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;
    if (!companyName.trim()) { setCompanyErr("Please enter a company name."); hasError = true; }
    if (!branchId.trim()) { setBranchIdErr("Please enter your branch ID."); hasError = true; }
    if (!branchPassword.trim()) { setBranchPasswordErr("Please enter the branch password."); hasError = true; }
    if (hasError) return;

    setLoading(true);
    try {
      // Look up branch by branchId
      const q = query(collection(db, "branches"), where("branchId", "==", branchId.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        const { field, message } = getBranchError("not-found");
        setBranchIdErr(message);
        setLoading(false);
        return;
      }

      const branchDoc = snap.docs[0];
      const branchData = branchDoc.data();

      // Check company name match
      if (branchData.companyName?.toLowerCase() !== companyName.trim().toLowerCase()) {
        const { message } = getBranchError("company-mismatch");
        setCompanyErr(message);
        setLoading(false);
        return;
      }

      // Check branch password
      if (branchData.branchPassword !== branchPassword) {
        const { message } = getBranchError("wrong-password");
        setBranchPasswordErr(message);
        setLoading(false);
        return;
      }

      // Check if active
      if (branchData.active === false) {
        const { message } = getBranchError("inactive");
        setBannerErr(message);
        setLoading(false);
        return;
      }

      // Store branch session in sessionStorage and redirect
      sessionStorage.setItem("branchSession", JSON.stringify({
        branchId: branchData.branchId,
        branchName: branchData.branchName,
        companyName: branchData.companyName,
        parentBusinessId: branchData.parentBusinessId,
        docId: branchDoc.id,
      }));

      router.push(`/branch/${branchDoc.id}/dashboard`);
    } catch (err) {
      setBannerErr("Something went wrong on our end. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF0FD] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 border border-[#C5D5F0]">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Avatar role="branch" size={72} showLabel />
          <h1 className="text-3xl font-black text-[#5C7FC2] mt-4 mb-1 tracking-tighter text-center">Branch Login</h1>
          <p className="text-[#8C6D51] font-bold text-sm text-center max-w-xs leading-relaxed">
            Branch accounts are sub-accounts created by a business. Enter your branch credentials below.
          </p>
        </div>

        {bannerErr && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl border border-red-100">
            {bannerErr}
          </div>
        )}

        <form onSubmit={handleBranchLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setCompanyErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#5C7FC2] transition-all font-bold text-sm"
              placeholder="Your parent company's name"
            />
            {companyErr && <p className="text-xs text-red-500 font-bold ml-1">{companyErr}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Branch ID</label>
            <input
              type="text"
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setBranchIdErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#5C7FC2] transition-all font-bold text-sm font-mono"
              placeholder="e.g. BR-4821"
            />
            {branchIdErr && <p className="text-xs text-red-500 font-bold ml-1">{branchIdErr}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Branch Password</label>
            <input
              type="password"
              value={branchPassword}
              onChange={(e) => { setBranchPassword(e.target.value); setBranchPasswordErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#5C7FC2] transition-all font-bold text-sm"
              placeholder="Set by your company admin"
            />
            {branchPasswordErr && <p className="text-xs text-red-500 font-bold ml-1">{branchPasswordErr}</p>}
          </div>

          <div className="bg-[#EAF0FD] p-4 rounded-2xl">
            <p className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest mb-1">Note</p>
            <p className="text-xs font-bold text-[#5C7FC2] leading-relaxed">
              The branch password is different from your personal account password. Contact your company admin if you've forgotten it.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5C7FC2] text-white py-5 rounded-2xl font-black shadow-lg hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "VERIFYING CREDENTIALS..." : "ENTER BRANCH ACCOUNT"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-[#8C6D51]">
          Not a branch account?{" "}
          <Link href="/login" className="text-[#4A6741] underline">Main Login</Link>
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-[10px] font-black text-gray-300 uppercase hover:text-[#8C6D51] transition-all tracking-widest">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}