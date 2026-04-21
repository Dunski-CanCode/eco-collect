"use client";

interface PasswordChecklistProps {
  password: string;
  submitted?: boolean;
}

const checks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least one number", test: (p: string) => /[0-9]/.test(p) },
  { label: "At least one special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export function validatePassword(password: string): boolean {
  return checks.every(c => c.test(password));
}

export default function PasswordChecklist({ password, submitted = false }: PasswordChecklistProps) {
  if (!password && !submitted) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {checks.map((check, i) => {
        const passed = check.test(password);
        const failed = submitted && !passed;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all"
              style={{
                backgroundColor: passed ? "#4A6741" : failed ? "#EF4444" : "#E5E0D8",
              }}
            >
              {passed && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {failed && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M2 2L6 6M6 2L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <span
              className="text-[11px] font-bold transition-colors"
              style={{
                color: passed ? "#4A6741" : failed ? "#EF4444" : "#8C6D51",
              }}
            >
              {check.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}