"use client";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthError } from "@/lib/errs";

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [bannerErr, setBannerErr] = useState("");
  const [bannerWarn, setBannerWarn] = useState("");

  const clearErrors = () => {
    setEmailErr(""); setPasswordErr(""); setBannerErr(""); setBannerWarn("");
  };

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    clearErrors();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
      router.refresh();
      setTimeout(() => { window.location.href = "/dashboard"; }, 800);
    } catch (err: any) {
      const { field, message } = getAuthError(err.code);
      if (field === "email") setEmailErr(message);
      else if (field === "password") setPasswordErr(message);
      else if (err.code === "auth/too-many-requests") setBannerWarn(message);
      else if (err.code === "auth/network-request-failed") setBannerWarn(message);
      else setBannerErr(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 border border-[#E5E0D8]">
        <h1 className="text-3xl font-black text-[#4A6741] mb-2 tracking-tighter text-center">Welcome Back</h1>
        <p className="text-[#8C6D51] font-bold text-sm mb-10 text-center">Log in to your Eco-Collect profile.</p>

        {bannerErr && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl border border-red-100">
            {bannerErr}
          </div>
        )}
        {bannerWarn && (
          <div className="mb-6 p-4 bg-orange-50 text-orange-500 text-xs font-bold rounded-2xl border border-orange-100">
            {bannerWarn}
          </div>
        )}

        <form onSubmit={handleLogIn} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#4A6741] transition-all font-bold text-sm"
            />
            {emailErr && <p className="text-xs text-red-500 font-bold ml-1">{emailErr}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#4A6741] transition-all font-bold text-sm"
            />
            {passwordErr && <p className="text-xs text-red-500 font-bold ml-1">{passwordErr}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A6741] text-white py-5 rounded-2xl font-black shadow-lg hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "CHECKING YOUR DETAILS..." : "LOG IN"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-[#8C6D51]">
          New here?{" "}
          <Link href="/signup" className="text-[#4A6741] underline">Create Account</Link>
        </p>
        <p className="mt-3 text-center text-xs font-bold text-[#8C6D51]">
          Logging into a branch?{" "}
          <Link href="/branch-login" className="text-[#5C7FC2] underline">Branch Login</Link>
        </p>
        <div className="mt-6 text-center">
          <Link href="/" className="text-[10px] font-black text-gray-300 uppercase hover:text-[#8C6D51] transition-all tracking-widest">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}