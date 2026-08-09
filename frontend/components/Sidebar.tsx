"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/tests", label: "Tests", icon: "📋" },
  { href: "/evaluations", label: "Evaluations", icon: "📊" },
  { href: "/templates", label: "Templates", icon: "⚙" },
  { href: "/settings", label: "Settings", icon: "🔧" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
            OMR
          </div>
          <div>
            <p className="text-slate-900 font-semibold text-sm leading-none">OMRly</p>
            <p className="text-slate-500 text-xs mt-0.5">Evaluator</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group text-sm ${
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                ? "bg-blue-50 text-blue-600 border border-blue-100"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-200">
        <p className="text-slate-400 text-xs text-center">Local-first · No login required</p>
      </div>
    </aside>
  );
}
