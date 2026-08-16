"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, BarChart3, Grid3x3, Settings } from "lucide-react";
import { CheckListSquare } from "reicon-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/evaluations", label: "Evaluations", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: Grid3x3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-default-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-2 py-2 border-b border-default-200">
        <div className="px-4 py-2 flex items-center gap-3">
          <CheckListSquare size={42} className="bg-cyan-100  text-cyan-600 rounded-xl" />
          <div>
            <p className="text-cyan-600 font-semibold text-base leading-none">OMRly</p>
            <p className="text-cyan-500 text-sm mt-0.5">Evaluator</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-full hover:bg-surface-tertiary transition-all duration-200 group text-base ${
                isActive
                  ? "bg-surface-tertiary text-foreground"
                  : "text-default-600 hover:text-foreground hover:bg-default-100"
              }`}
            >
              <Icon size={18} className={`${isActive ? "text-primary" : "text-default-400 group-hover:text-default-600"} transition-colors`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-default-200">
        <p className="text-default-400 text-xs text-center">Local-first · No login required</p>
      </div>
    </aside>
  );
}
