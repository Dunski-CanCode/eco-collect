"use client";
import React from "react";

type AvatarRole = "collector" | "business" | "branch";

interface AvatarProps {
  role: AvatarRole;
  size?: number;
  companyName?: string;
  showLabel?: boolean;
}

function CollectorIcon({ size }: { size: number }) {
  return (
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 40 44" fill="none">
      {/* Head */}
      <circle cx="20" cy="9" r="7" fill="#4A6741" />
      {/* Body */}
      <path d="M8 28C8 21 12 18 20 18C28 18 32 21 32 28V32H8V28Z" fill="#4A6741" />
      {/* Recycling bag */}
      <rect x="13" y="30" width="14" height="12" rx="3" fill="#2D4A28" />
      {/* Recycling arrows on bag */}
      <path d="M17 34L20 31L23 34" stroke="#A8D5A2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M23 38L20 41L17 38" stroke="#A8D5A2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M15 36H25" stroke="#A8D5A2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function BusinessIcon({ size }: { size: number }) {
  return (
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 40 44" fill="none">
      {/* Building base */}
      <rect x="4" y="14" width="32" height="28" rx="2" fill="#8C6D51" />
      {/* Roof */}
      <path d="M2 16L20 4L38 16H2Z" fill="#6B4F38" />
      {/* Door */}
      <rect x="15" y="30" width="10" height="12" rx="1" fill="#FDF3E3" />
      {/* Windows */}
      <rect x="7" y="19" width="7" height="6" rx="1" fill="#FDF3E3" />
      <rect x="26" y="19" width="7" height="6" rx="1" fill="#FDF3E3" />
      <rect x="7" y="28" width="7" height="6" rx="1" fill="#FDF3E3" />
      <rect x="26" y="28" width="7" height="6" rx="1" fill="#FDF3E3" />
      {/* Chimney */}
      <rect x="26" y="6" width="5" height="10" rx="1" fill="#6B4F38" />
    </svg>
  );
}

function BranchIcon({ size }: { size: number }) {
  return (
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 40 44" fill="none">
      {/* Building */}
      <rect x="4" y="14" width="28" height="28" rx="2" fill="#5C7FC2" />
      {/* Roof */}
      <path d="M2 16L18 5L34 16H2Z" fill="#3D5E9E" />
      {/* Door */}
      <rect x="12" y="30" width="8" height="12" rx="1" fill="#EAF0FD" />
      {/* Windows */}
      <rect x="6" y="19" width="6" height="5" rx="1" fill="#EAF0FD" />
      <rect x="20" y="19" width="6" height="5" rx="1" fill="#EAF0FD" />
      <rect x="6" y="27" width="6" height="5" rx="1" fill="#EAF0FD" />
      <rect x="20" y="27" width="6" height="5" rx="1" fill="#EAF0FD" />
      {/* Branch node badge */}
      <circle cx="33" cy="11" r="8" fill="#3D5E9E" stroke="#EAF0FD" strokeWidth="1.5" />
      <path d="M33 7V11M33 11L30 14M33 11L36 14" stroke="#EAF0FD" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function Avatar({ role, size = 64, companyName, showLabel = false }: AvatarProps) {
  const isCircle = role === "collector";
  const configs = {
    collector: { bg: "#E8F5E2", border: "#4A6741", label: "Collector" },
    business: { bg: "#FDF3E3", border: "#8C6D51", label: "Business" },
    branch: { bg: "#EAF0FD", border: "#5C7FC2", label: "Branch" },
  };
  const config = configs[role];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: config.bg,
          border: `2.5px solid ${config.border}`,
          borderRadius: isCircle ? "50%" : `${size * 0.22}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <>
            {role === "collector" && <CollectorIcon size={size} />}
            {role === "business" && <BusinessIcon size={size} />}
            {role === "branch" && <BranchIcon size={size} />}
          </>
      </div>

      {showLabel && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.12em",
            color: config.border,
            textTransform: "uppercase",
          }}
        >
          {companyName ? `${companyName}` : config.label}
        </span>
      )}
    </div>
  );
}