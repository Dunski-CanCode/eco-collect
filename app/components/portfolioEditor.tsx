"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

const MATERIAL_OPTIONS = ["Plastic", "Metal", "Paper", "Glass", "E-Waste", "Rubber", "Textile", "Organic", "Other"];
const NIGERIAN_STATES = [
  "All States",
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
];

interface PortfolioEditorProps {
  userId: string;
  initial?: {
    description?: string;
    materialsWanted?: string[];
    customMaterials?: string;
    states?: string[];
    website?: string;
    contactEmail?: string;
  };
  onSave?: () => void;
}

export default function PortfolioEditor({ userId, initial = {}, onSave }: PortfolioEditorProps) {
  const [description, setDescription] = useState(initial.description || "");
  const [materialsWanted, setMaterialsWanted] = useState<string[]>(initial.materialsWanted || []);
  const [customMaterials, setCustomMaterials] = useState(initial.customMaterials || "");
  const [states, setStates] = useState<string[]>(initial.states || []);
  const [website, setWebsite] = useState(initial.website || "");
  const [contactEmail, setContactEmail] = useState(initial.contactEmail || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        portfolio: { description, materialsWanted, customMaterials, states, website, contactEmail },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSave?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Company Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Tell collectors what your company does and why you buy recyclable materials..."
          className="w-full mt-2 bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8C6D51] transition-all font-bold text-sm resize-none"
        />
      </div>

      <div>
        <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Materials We Buy</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {MATERIAL_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleItem(materialsWanted, setMaterialsWanted, m)}
              className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2"
              style={
                materialsWanted.includes(m)
                  ? { backgroundColor: "#8C6D51", color: "white", borderColor: "#8C6D51" }
                  : { backgroundColor: "transparent", color: "#8C6D51", borderColor: "#E5E0D8" }
              }
            >
              {m}
            </button>
          ))}
        </div>
        {materialsWanted.includes("Other") && (
          <input
            type="text"
            value={customMaterials}
            onChange={(e) => setCustomMaterials(e.target.value)}
            placeholder="Specify other materials (e.g. Copper wire, Tyres, Industrial scrap...)"
            className="w-full mt-3 bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8C6D51] transition-all font-bold text-sm"
          />
        )}
      </div>

      <div>
        <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">States We Operate In</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {NIGERIAN_STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleItem(states, setStates, s)}
              className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2"
              style={
                states.includes(s)
                  ? { backgroundColor: "#8C6D51", color: "white", borderColor: "#8C6D51" }
                  : { backgroundColor: "transparent", color: "#8C6D51", borderColor: "#E5E0D8" }
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
            className="w-full mt-2 bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8C6D51] transition-all font-bold text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-[#8C6D51] uppercase tracking-[0.2em]">Contact Email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contact@company.com"
            className="w-full mt-2 bg-[#F9F7F2] p-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#8C6D51] transition-all font-bold text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50"
        style={{ backgroundColor: "#8C6D51", color: "white" }}
      >
        {saved ? "✓ SAVED" : saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            SAVING...
          </span>
        ) : "SAVE PORTFOLIO"}
      </button>
    </div>
  );
}