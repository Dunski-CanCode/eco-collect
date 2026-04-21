"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import Avatar from "@/components/Avatar";

export default function CompanyPortfolio() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [companyData, setCompanyData] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Load company data
      const companySnap = await getDoc(doc(db, "users", companyId));
      if (!companySnap.exists() || companySnap.data().role !== "business") {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCompanyData(companySnap.data());

      // Load current user
      const user = auth.currentUser;
      if (user) {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) setCurrentUserData(userSnap.data());
      }

      setLoading(false);
    };
    load();
  }, [companyId]);

  const startBargain = async () => {
    const user = auth.currentUser;
    if (!user) { router.push("/login"); return; }
    // Navigate to marketplace for collector to find a listing to start with
    router.push("/marketplace");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center font-black text-[#8C6D51] animate-pulse">
        LOADING PROFILE...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center gap-4">
        <p className="font-black text-black text-2xl">Company not found.</p>
        <button onClick={() => router.back()} className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:text-black">
          ← Go Back
        </button>
      </div>
    );
  }

  const portfolio = companyData?.portfolio;

  return (
    <div className="min-h-screen bg-[#F9F7F2]">

      {/* NAVBAR */}
      <nav className="bg-white border-b border-[#E5E0D8] px-8 py-5 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest hover:text-black transition-colors">
          ← Back
        </button>
        <h1 className="text-xl font-black text-[#4A6741] tracking-tighter">Eco-Collect</h1>
        <div className="w-20" />
      </nav>

      <main className="max-w-3xl mx-auto px-8 py-16">

        {/* Company Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <Avatar role="business" size={96} showLabel companyName={companyData?.companyName} />
          <h2 className="text-4xl font-black text-black mt-6 tracking-tight">{companyData?.companyName}</h2>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2 h-2 bg-[#4A6741] rounded-full" />
            <span className="text-[10px] font-black text-[#4A6741] uppercase tracking-widest">Verified Business</span>
          </div>
        </div>

        {/* No portfolio yet */}
        {!portfolio && (
          <div className="text-center py-16 border-2 border-dashed border-[#E5E0D8] rounded-[3rem]">
            <p className="font-black text-[#8C6D51]">This company hasn't set up their profile yet.</p>
          </div>
        )}

        {/* Portfolio Content */}
        {portfolio && (
          <div className="space-y-8">

            {portfolio.description && (
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] mb-4">About This Company</p>
                <p className="text-base font-bold text-black leading-relaxed">{portfolio.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {portfolio.materialsWanted?.length > 0 && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] mb-4">Materials They Buy</p>
                  <div className="flex flex-wrap gap-2">
                    {portfolio.materialsWanted.filter((m: string) => m !== "Other").map((m: string) => (
                      <span key={m} className="px-4 py-2 bg-[#F2E8CF] text-[#8C6D51] rounded-full text-[10px] font-black uppercase tracking-widest">{m}</span>
                    ))}
                    {portfolio.materialsWanted.includes("Other") && portfolio.customMaterials && (
                      <span className="px-4 py-2 bg-[#F2E8CF] text-[#8C6D51] rounded-full text-[10px] font-black uppercase tracking-widest">{portfolio.customMaterials}</span>
                    )}
                  </div>
                </div>
              )}

              {portfolio.states?.length > 0 && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] mb-4">States They Operate In</p>
                  <div className="flex flex-wrap gap-2">
                    {portfolio.states.map((s: string) => (
                      <span
                        key={s}
                        className="px-4 py-2 bg-[#EAF0FD] text-[#5C7FC2] rounded-full text-[10px] font-black uppercase tracking-widest"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(portfolio.website || portfolio.contactEmail) && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em] mb-4">Contact Information</p>
                <div className="space-y-3">
                  {portfolio.website && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#8C6D51] uppercase w-20 shrink-0">Website</span>
                      <a
                        href={portfolio.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-black text-[#5C7FC2] hover:underline"
                      >
                        {portfolio.website}
                      </a>
                    </div>
                  )}
                  {portfolio.contactEmail && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#8C6D51] uppercase w-20 shrink-0">Email</span>
                      <span className="text-sm font-black text-black">{portfolio.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Portfolio Images removed */}

            {/* CTA for collectors */}
            {currentUserData?.role === "collector" && (
              <div className="bg-[#4A6741] p-10 rounded-[3rem] text-white text-center">
                <h3 className="text-2xl font-black mb-3">Interested in selling to {companyData?.companyName}?</h3>
                <p className="font-bold opacity-80 mb-6 text-sm leading-relaxed">
                  Head to the marketplace to find a listing and start a bargain. Deals are made directly between you and their team.
                </p>
                <button
                  onClick={startBargain}
                  className="bg-white text-[#4A6741] px-10 py-4 rounded-2xl font-black hover:shadow-xl transition-all active:scale-95"
                >
                  GO TO MARKETPLACE
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}