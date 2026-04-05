import { Link, useLocation } from "wouter";
import { LayoutDashboard, BookOpen, MessageCircle, Stethoscope, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: BookOpen },
  { href: "/chat", label: "AI Coach", icon: MessageCircle },
  { href: "/derm", label: "Derm", icon: Stethoscope },
];

function Logo() {
  return (
    <svg aria-label="Skincare Companion" viewBox="0 0 36 36" fill="none" className="w-8 h-8 shrink-0">
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline text-foreground">
            <Logo />
            <div>
              <p className="font-display text-sm leading-tight text-foreground">Skincare</p>
              <p className="text-xs text-muted-foreground leading-tight">Daily Companion</p>
            </div>
          </Link>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground" aria-label="Toggle theme" data-testid="button-theme">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-28">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto grid grid-cols-4 h-16">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href} className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-xs transition-colors no-underline",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )} data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}>
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
