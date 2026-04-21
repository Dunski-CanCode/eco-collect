"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Avatar from "@/components/Avatar";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBranchSession, setIsBranchSession] = useState(false);
  const [branchDocId, setBranchDocId] = useState<string | null>(null);

  useEffect(() => {
    // Check branch session first
    const branchSession = sessionStorage.getItem("branchSession");
    if (branchSession) {
      const parsed = JSON.parse(branchSession);
      setIsBranchSession(true);
      setBranchDocId(parsed.docId || null);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F7F2] selection:bg-[#4A6741] selection:text-white">

      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-black text-[#4A6741] tracking-tighter">Eco-Collect</h1>
        <div className="flex gap-6 items-center">
          <Link href={isLoggedIn || isBranchSession ? "/marketplace" : "/login"} className="text-sm font-black text-[#8C6D51] hover:text-[#4A6741] transition-colors">
            MARKETPLACE
          </Link>
          <Link
            href="/branch-login"
            className="text-sm font-black text-[#5C7FC2] hover:text-[#3D5E9E] transition-colors border-b-2 border-[#5C7FC2]"
          >
            BRANCH LOGIN
          </Link>
          {isBranchSession ? (
            <Link href={branchDocId ? `/branch/${branchDocId}/dashboard` : "/branch-login"} className="bg-[#5C7FC2] text-white px-8 py-3 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95">
              BRANCH DASHBOARD
            </Link>
          ) : isLoggedIn ? (
            <Link href="/dashboard" className="bg-[#4A6741] text-white px-8 py-3 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95">
              GO TO DASHBOARD
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-black text-[#8C6D51] hover:text-[#4A6741] transition-colors">
                LOG IN
              </Link>
              <Link href="/signup" className="bg-[#4A6741] text-white px-8 py-3 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95">
                JOIN NOW
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <main className="max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-block bg-[#F2E8CF] text-[#8C6D51] px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] mb-6">
              THE CIRCULAR ECONOMY
            </div>
            <h2 className="text-7xl font-black text-black leading-[0.9] mb-8">
              Turn your <span className="text-[#4A6741]">waste</span> into a resource.
            </h2>
            <p className="text-lg text-[#8C6D51] font-medium max-w-md leading-relaxed mb-10">
              Connecting local collectors with businesses across Nigeria. Post recyclables, bargain for prices, and earn ECO points for every deal closed.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={isBranchSession ? (branchDocId ? `/branch/${branchDocId}/dashboard` : "/branch-login") : isLoggedIn ? "/dashboard" : "/login"}
                className="bg-[#4A6741] text-white px-10 py-5 rounded-[2.5rem] font-black text-lg hover:shadow-2xl transition-all active:scale-95"
              >
                {isBranchSession ? "Branch Dashboard" : isLoggedIn ? "Open Dashboard" : "Log In"}
              </Link>
              <Link
                href={isLoggedIn || isBranchSession ? "/marketplace" : "/login"}
                className="bg-white border-2 border-[#E5E0D8] text-black px-10 py-5 rounded-[2.5rem] font-black text-lg hover:bg-[#F2E8CF] transition-all"
              >
                Browse Market
              </Link>
            </div>
          </div>

          {/* Feature Card */}
          <div className="relative hidden lg:block">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 relative z-10">
              <div className="w-20 h-20 bg-[#F2E8CF] rounded-3xl mb-8 flex items-center justify-center text-3xl">🌱</div>
              <h3 className="text-3xl font-black text-black mb-4">Verified Impact</h3>
              <p className="text-[#8C6D51] font-medium leading-relaxed">
                Earn ECO points for every deal you close. Track your real contribution to a cleaner Nigeria through financial transactions.
              </p>
            </div>
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#4A6741] opacity-5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#8C6D51] opacity-10 rounded-full blur-3xl" />
          </div>
        </div>
      </main>

      {/* WHO IS THIS FOR */}
      <section className="bg-white border-y border-[#E5E0D8] py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h4 className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.3em] mb-4">Who It's For</h4>
            <h3 className="text-4xl font-black text-black tracking-tight">Built for two sides of the same mission.</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Collector Card */}
            <div className="bg-[#F9F7F2] p-10 rounded-[3rem] border-2 border-[#E5E0D8] hover:border-[#4A6741] transition-all group">
              <div className="mb-6">
                <Avatar role="collector" size={72} showLabel />
              </div>
              <h4 className="text-2xl font-black text-black mb-3">For Collectors</h4>
              <p className="text-[#8C6D51] font-medium leading-relaxed mb-6">
                Pick up recyclable materials from your area, list them on the marketplace, negotiate with buyers, and earn money for every deal you close. Your impact points grow with every transaction.
              </p>
              <Link
                href="/signup"
                className="inline-block bg-[#4A6741] text-white px-8 py-4 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95"
              >
                JOIN AS COLLECTOR
              </Link>
            </div>

            {/* Business Card */}
            <div className="bg-[#F9F7F2] p-10 rounded-[3rem] border-2 border-[#E5E0D8] hover:border-[#8C6D51] transition-all group">
              <div className="mb-6">
                <Avatar role="business" size={72} showLabel />
              </div>
              <h4 className="text-2xl font-black text-black mb-3">For Businesses</h4>
              <p className="text-[#8C6D51] font-medium leading-relaxed mb-6">
                Browse listed materials, contact collectors directly through branch accounts, negotiate prices, and manage your entire procurement network from one dashboard.
              </p>
              <Link
                href="/signup"
                className="inline-block bg-[#8C6D51] text-white px-8 py-4 rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95"
              >
                JOIN AS BUSINESS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h4 className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.3em] mb-4">The Process</h4>
            <h3 className="text-4xl font-black text-black tracking-tight">Three steps to a cleaner world.</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "Collect & Post", desc: "List your scrap, plastic, or metal with a suggested price and location." },
              { step: "02", title: "Bargain & Chat", desc: "Businesses send price offers. Negotiate until you reach a deal that works for both." },
              { step: "03", title: "Earn & Impact", desc: "Get paid and instantly receive ECO points on your dashboard." },
            ].map((item) => (
              <div key={item.step} className="space-y-4 group">
                <div className="text-5xl font-black text-[#F2E8CF] group-hover:text-[#4A6741] transition-colors duration-500">{item.step}</div>
                <h5 className="text-xl font-black text-black">{item.title}</h5>
                <p className="text-[#8C6D51] font-medium text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 border-t border-[#E5E0D8] bg-white">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl font-black text-[#4A6741] mb-1">Eco-Collect</h2>
            <p className="text-[#8C6D51] text-xs font-bold">Nigeria's circular economy marketplace.</p>
          </div>
          <div className="flex gap-8">
            <Link href="/marketplace" className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:text-[#4A6741]">Marketplace</Link>
            <Link href="/login" className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:text-[#4A6741]">Login</Link>
            <Link href="/signup" className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:text-[#4A6741]">Sign Up</Link>
            <Link href="/branch-login" className="text-[10px] font-black text-[#5C7FC2] uppercase tracking-widest hover:text-[#3D5E9E]">Branch Login</Link>
          </div>
          <p className="text-[#8C6D51] text-[10px] font-black uppercase tracking-widest">
            © 2026 Eco-Collect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}