"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, doc, deleteDoc } from "firebase/firestore";
import { signOut, deleteUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";

const NIGERIAN_STATES = ["Lagos", "Kano", "Oyo", "Rivers", "Kaduna", "Enugu", "Abia", "Delta", "Ogun", "FCT", "Kogi", "Benue", "Anambra", "Imo", "Cross River"];
const MATERIAL_CATEGORIES = [
  { label: "Plastic", icon: "♻️" },
  { label: "Metal", icon: "🔩" },
  { label: "Paper", icon: "📄" },
  { label: "Glass", icon: "🫙" },
  { label: "E-Waste", icon: "💻" },
  { label: "Rubber", icon: "⚙️" },
  { label: "Textile", icon: "🧵" },
  { label: "Organic", icon: "🌿" },
];

export default function CreateListing() {
  const router = useRouter();
  const [material, setMaterial] = useState("");
  const [customMaterial, setCustomMaterial] = useState("");
  const [weight, setWeight] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [state, setState] = useState("Lagos");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Field errors
  const [materialErr, setMaterialErr] = useState("");
  const [weightErr, setWeightErr] = useState("");
  const [priceErr, setPriceErr] = useState("");
  const [bannerErr, setBannerErr] = useState("");

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push("/login"); return; }
      const { doc, getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());
    });
    return () => unsubAuth();
  }, [router]);

  const deleteAccount = async () => {
    if (confirm("Permanently delete your account? This cannot be undone.")) {
      const user = auth.currentUser;
      if (user) {
        try {
          await deleteDoc(doc(db, "users", user.uid));
          await deleteUser(user);
          window.location.assign("/");
        } catch {
          alert("Please log in again before deleting your account for security reasons.");
        }
      }
    }
  };

  const logout = () => signOut(auth).then(() => window.location.assign("/"));

  const handleNavigate = (page: 'dashboard' | 'messages' | 'marketplace') => {
    router.push(`/${page}`);
  };

  const finalMaterial = material === "Other" ? customMaterial : material;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerErr("");
    setMaterialErr(""); setWeightErr(""); setPriceErr("");

    let hasError = false;
    if (!finalMaterial.trim()) { setMaterialErr("Please select or enter a material type."); hasError = true; }
    if (!weight || Number(weight) < 5) { setWeightErr("Minimum weight is 5kg."); hasError = true; }
    if (price !== "" && Number(price) < 0) { setPriceErr("Price cannot be negative."); hasError = true; }
    if (hasError) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, "listings"), {
        material: finalMaterial.trim(),
        weight: Number(weight),
        price: price !== "" ? Number(price) : null,
        state,
        description: description.trim(),
        userId: user.uid,
        status: "available",
        createdAt: new Date().toISOString(),
      });

      router.push("/marketplace");
    } catch (err: any) {
      setBannerErr("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex h-screen overflow-hidden">
      {userData && (
        <Sidebar
          role="collector"
          active="marketplace"
          displayName={userData.email?.split("@")[0]}
          onDeleteAccount={deleteAccount}
          onNavigate={handleNavigate}
          onLogout={logout}
        />
      )}

      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-2xl mx-auto">
          <header className="mb-10">
            <h1 className="text-4xl font-black text-black tracking-tight">Post a Listing</h1>
            <p className="text-[#8C6D51] font-bold mt-1">Tell buyers what material you have available.</p>
          </header>

          {bannerErr && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl border border-red-100">
              {bannerErr}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Material Category */}
            <div>
              <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Material Type</label>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {MATERIAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => { setMaterial(cat.label); setMaterialErr(""); }}
                    className="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2"
                    style={
                      material === cat.label
                        ? { borderColor: "#4A6741", backgroundColor: "#F0F7EE" }
                        : { borderColor: "#E5E0D8", backgroundColor: "white" }
                    }
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[10px] font-black text-[#8C6D51] uppercase">{cat.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setMaterial("Other"); setMaterialErr(""); }}
                  className="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2"
                  style={
                    material === "Other"
                      ? { borderColor: "#4A6741", backgroundColor: "#F0F7EE" }
                      : { borderColor: "#E5E0D8", backgroundColor: "white" }
                  }
                >
                  <span className="text-xl">📦</span>
                  <span className="text-[10px] font-black text-[#8C6D51] uppercase">Other</span>
                </button>
              </div>
              {material === "Other" && (
                <input
                  type="text"
                  value={customMaterial}
                  onChange={(e) => { setCustomMaterial(e.target.value); setMaterialErr(""); }}
                  placeholder="Describe the material..."
                  className="w-full mt-3 bg-white p-4 rounded-2xl border border-[#E5E0D8] outline-none focus:ring-2 focus:ring-[#4A6741] font-bold text-sm"
                />
              )}
              {materialErr && <p className="text-xs text-red-500 font-bold mt-2">{materialErr}</p>}
            </div>

            {/* Weight + Price */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Weight (kg) — min 5kg</label>
                <input
                  type="number"
                  min="5"
                  value={weight}
                  onChange={(e) => { setWeight(e.target.value === "" ? "" : Number(e.target.value)); setWeightErr(""); }}
                  className="w-full bg-white p-4 rounded-2xl border border-[#E5E0D8] outline-none focus:ring-2 focus:ring-[#4A6741] font-bold text-sm"
                  placeholder="e.g. 20"
                />
                {weightErr && <p className="text-xs text-red-500 font-bold">{weightErr}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Asking Price (₦) — optional</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value === "" ? "" : Number(e.target.value)); setPriceErr(""); }}
                  className="w-full bg-white p-4 rounded-2xl border border-[#E5E0D8] outline-none focus:ring-2 focus:ring-[#4A6741] font-bold text-sm"
                  placeholder="e.g. 5000"
                />
                {priceErr && <p className="text-xs text-red-500 font-bold">{priceErr}</p>}
              </div>
            </div>

            {/* State */}
            <div>
              <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">State (Nigeria)</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full mt-2 bg-white p-4 rounded-2xl border border-[#E5E0D8] outline-none focus:ring-2 focus:ring-[#4A6741] font-bold text-sm"
              >
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the condition, source, or any relevant details about your material..."
                className="w-full mt-2 bg-white p-4 rounded-2xl border border-[#E5E0D8] outline-none focus:ring-2 focus:ring-[#4A6741] font-bold text-sm resize-none"
              />
            </div>

            {/* Preview */}
            {finalMaterial && (
              <div className="bg-[#F2E8CF] p-6 rounded-[2rem] border border-[#E5DCC3]">
                <p className="text-[10px] font-black text-[#8C6D51] uppercase tracking-widest mb-3">Listing Preview</p>
                <p className="font-black text-black text-xl">{finalMaterial}</p>
                <div className="flex gap-4 mt-2">
                  {weight && <span className="text-sm font-bold text-[#8C6D51]">{weight} kg</span>}
                  {price && <span className="text-sm font-bold text-[#4A6741]">₦{Number(price).toLocaleString()}</span>}
                  <span className="text-sm font-bold text-[#8C6D51]">{state}</span>
                </div>
                {description && <p className="text-xs font-bold text-[#8C6D51] mt-2 opacity-70">{description}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#4A6741] text-white rounded-2xl font-black shadow-lg hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "POSTING YOUR LISTING..." : "POST LISTING"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}