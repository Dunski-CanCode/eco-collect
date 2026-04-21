"use client";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PasswordChecklist, { validatePassword } from "@/components/passwordChecklist";
import { getAuthError } from "@/lib/errs";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"collector" | "business">("collector");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Field-specific errors
  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [confirmErr, setConfirmErr] = useState("");
  const [companyErr, setCompanyErr] = useState("");
  const [bannerErr, setBannerErr] = useState("");

  const clearErrors = () => {
    setEmailErr(""); setPasswordErr(""); setConfirmErr("");
    setCompanyErr(""); setBannerErr("");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    clearErrors();

    let hasError = false;

    if (!validatePassword(password)) {
      setPasswordErr("Please meet all password requirements below.");
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmErr("These passwords don't match.");
      hasError = true;
    }
    if (role === "business" && !companyName.trim()) {
      setCompanyErr("Please enter your company name.");
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        role,
        companyName: role === "business" ? companyName.trim() : null,
        impactPoints: 0,
        createdAt: new Date().toISOString(),
        portfolio: null,
      });
      router.push("/dashboard");
      router.refresh();
      setTimeout(() => { window.location.href = "/dashboard"; }, 800);
    } catch (err: any) {
      const { field, message } = getAuthError(err.code);
      if (field === "email") setEmailErr(message);
      else if (field === "password") setPasswordErr(message);
      else setBannerErr(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 border border-[#E5E0D8]">
        <h1 className="text-3xl font-black text-[#4A6741] mb-1 tracking-tighter">Eco-Collect</h1>
        <p className="text-[#8C6D51] font-bold text-sm mb-8">Start your sustainability journey.</p>

        {bannerErr && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl border border-red-100">
            {bannerErr}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5">

          {/* Role Selector */}
          <div>
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">I am a...</label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {(["collector", "business"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3"
                  style={
                    role === r
                      ? { borderColor: r === "collector" ? "#4A6741" : "#8C6D51", backgroundColor: r === "collector" ? "#F0F7EE" : "#FDF3E3" }
                      : { borderColor: "#E5E0D8", backgroundColor: "transparent" }
                  }
                >
                  <Avatar role={r} size={52} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: r === "collector" ? "#4A6741" : "#8C6D51" }}>
                    {r === "collector" ? "Collector" : "Business"}
                  </span>
                  <span className="text-[10px] font-bold text-center leading-relaxed" style={{ color: "#8C6D51" }}>
                    {r === "collector"
                      ? "Pick up materials & earn"
                      : "Buy materials & manage branches"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Company Name - only for business */}
          {role === "business" && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setCompanyErr(""); }}
                className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8C6D51] transition-all font-bold text-sm"
                placeholder="Your company's official name"
              />
              {companyErr && <p className="text-xs text-red-500 font-bold ml-1">{companyErr}</p>}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#4A6741] transition-all font-bold text-sm"
            />
            {emailErr && <p className="text-xs text-red-500 font-bold ml-1">{emailErr}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#4A6741] transition-all font-bold text-sm"
            />
            <PasswordChecklist password={password} submitted={submitted} />
            {passwordErr && <p className="text-xs text-red-500 font-bold ml-1 mt-1">{passwordErr}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] ml-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmErr(""); }}
              className="w-full bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#4A6741] transition-all font-bold text-sm"
            />
            {confirmErr && <p className="text-xs text-red-500 font-bold ml-1">{confirmErr}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-2xl font-black shadow-lg hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 text-white"
            style={{ backgroundColor: role === "collector" ? "#4A6741" : "#8C6D51" }}
          >
            {loading ? "SETTING UP YOUR ACCOUNT..." : "JOIN NOW"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-[#8C6D51]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#4A6741] underline">Log In</Link>
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