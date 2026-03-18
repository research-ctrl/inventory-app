"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, CheckSquare, Building2,
  ShoppingCart, Truck, PackageCheck, Package, ArrowUpFromLine,
  RotateCcw, MessageSquare, BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth/roles";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",                      icon: LayoutDashboard },
  { label: "Requirements",  href: "/requirements",                   icon: ClipboardList },
  { label: "Approvals",     href: "/approvals",                      icon: CheckSquare },
  { label: "Vendors",       href: "/vendors",                        icon: Building2 },
  { label: "Purchase Orders", href: "/procurement/purchase-orders",  icon: ShoppingCart },
  { label: "Deliveries",    href: "/procurement/deliveries",         icon: Truck },
  { label: "Receiving",     href: "/receiving",                      icon: PackageCheck },
  { label: "QC",            href: "/qc",                             icon: ClipboardList },
  { label: "Inventory",     href: "/inventory",                      icon: Package },
  { label: "Issues",        href: "/issues",                         icon: ArrowUpFromLine },
  { label: "Recovery",      href: "/recovery",                       icon: RotateCcw },
  { label: "Chatbot",       href: "/chatbot",                        icon: MessageSquare },
  { label: "Reports",       href: "/reports",                        icon: BarChart3 },
  { label: "Settings",      href: "/settings",                       icon: Settings },
];

interface SidebarProps {
  role?: Role;
}

export function Sidebar({ role: _role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-sm font-bold leading-tight">
          Shipyard Material<br />Lifecycle System
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
