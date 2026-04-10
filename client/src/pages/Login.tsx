import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CORRECT_PIN = "101010";

function Logo() {
  return (
    <svg aria-label="Skincare Companion" viewBox="0 0 36 36" fill="none" className="w-12 h-12">
      <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.5" className="text-primary" opacity="0.25" />
      <path d="M18 8 C12 8 9 13 9 18 C9 24 13 28 18 28 C23 28 27 24 27 18 C27 13 24 8 18 8Z" fill="currentColor" className="text-primary" opacity="0.15" />
      <circle cx="18" cy="18" r="5" fill="currentColor" className="text-primary" opacity="0.9" />
      <circle cx="18" cy="9" r="2" fill="currentColor" className="text-primary" opacity="0.5" />
      <circle cx="27" cy="18" r="2" fill="currentColor" className="text-primary" opacity="0.4" />
      <circle cx="18" cy="27" r="2" fill="currentColor" className="text-primary" opacity="0.4" />
      <circle cx="9" cy="18" r="2" fill="currentColor" className="text-primary" opacity="0.3" />
    </svg>
  );
}

export default function Login({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError(false);

    if (next.length === CORRECT_PIN.length) {
      if (next === CORRECT_PIN) {
        setTimeout(() => onUnlock(), 200);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setPin(""); setShake(false); }, 600);
      }
    }
  };

  const handleDelete = () => { setPin(p => p.slice(0, -1)); setError(false); };

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <Logo />
          <div className="text-center">
            <p className="font-display text-lg text-foreground">Skincare</p>
            <p className="text-sm text-muted-foreground">Daily Companion</p>
          </div>
        </div>

        {/* PIN dots */}
        <div className={`flex justify-center gap-4 ${shake ? "animate-bounce" : ""}`}>
          {Array.from({ length: CORRECT_PIN.length }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                i < pin.length
                  ? error ? "bg-destructive border-destructive" : "bg-primary border-primary"
                  : "border-border bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive -mt-4">Incorrect PIN</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button
              key={i}
              onClick={() => d === "⌫" ? handleDelete() : d ? handleDigit(d) : undefined}
              disabled={!d && d !== "0"}
              className={`
                h-16 rounded-2xl text-xl font-semibold transition-all
                ${!d ? "invisible" : ""}
                ${d === "⌫"
                  ? "bg-muted text-muted-foreground hover:bg-muted/80 active:scale-95"
                  : "bg-card border border-border text-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-95 shadow-sm"
                }
              `}
              data-testid={`pin-${d}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
