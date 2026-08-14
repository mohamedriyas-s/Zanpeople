'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  LogOut,
  X,
  Briefcase,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/candidates', label: 'Candidates', icon: UserPlus },
  { href: '/jobs', label: 'Job Openings', icon: Briefcase },
  { href: '/employees', label: 'Employees', icon: Users },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 h-full w-64 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]
        flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[hsl(var(--border))]">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] text-white flex items-center justify-center text-sm font-bold shadow-md shadow-[hsl(var(--primary)/0.2)]">
            Z
          </div>
          <div>
            <span className="text-sm font-bold text-[hsl(var(--foreground))]">Zansphere</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] block -mt-0.5">HR Portal</span>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-smooth"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth group
                ${active
                  ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
                }
              `}
            >
              <item.icon className={`w-[18px] h-[18px] ${active ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'} transition-smooth`} />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />}
            </Link>
          );
        })}

        {/* Settings — Admin only (FR-AUTH-06) */}
        {isAdmin && (
          <Link
            href="/settings"
            onClick={onClose}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth group
              ${isActive('/settings')
                ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
              }
            `}
          >
            <Settings className={`w-[18px] h-[18px] ${isActive('/settings') ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'} transition-smooth`} />
            Settings
            {isActive('/settings') && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />}
          </Link>
        )}
      </nav>

      {/* User Info + Logout */}
      <div className="p-3 border-t border-[hsl(var(--border))]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{user?.name}</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))] transition-smooth"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
