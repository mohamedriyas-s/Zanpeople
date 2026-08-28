'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, Bell, X, User, Users, Loader2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import type { SearchResults, Notification } from '@/types';
import toast from 'react-hot-toast';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();

  // ─── Search State ────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // ─── Notification State ──────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // ─── Profile State ───────────────────────────────
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus mobile search when opened
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data.unreadCount);
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.data);
        setShowSearchResults(true);
      } catch (err: any) {
        toast.error(err.response?.data?.error?.message || 'Search failed');
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=10');
      setNotifications(res.data.data.items);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to load notifications');
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) fetchNotifications();
    setShowNotifications(!showNotifications);
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to mark as read');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try { await api.patch(`/notifications/${notif.id}/read`); } catch { }
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotifications(false);
    const path = notif.referenceType === 'CANDIDATE'
      ? `/candidates/${notif.referenceId}`
      : `/employees/${notif.referenceId}`;
    router.push(path);
  };

  const handleSearchSelect = (type: 'candidate' | 'employee', id: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    setMobileSearchOpen(false);
    router.push(type === 'candidate' ? `/candidates/${id}` : `/employees/${id}`);
  };

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (e.key === 'Escape') {
        setMobileSearchOpen(false);
        setShowSearchResults(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Shared search results dropdown
  const SearchResultsDropdown = () => {
    if (!showSearchResults || !searchResults) return null;
    return (
      <div className="absolute top-full left-0 right-0 mt-1.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl shadow-black/15 overflow-hidden max-h-[400px] overflow-y-auto z-50">
        {searchResults.candidates.length === 0 && searchResults.employees.length === 0 ? (
          <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No results found for &quot;{searchQuery}&quot;
          </div>
        ) : (
          <>
            {searchResults.candidates.length > 0 && (
              <div>
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)]">
                  Candidates
                </div>
                {searchResults.candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSearchSelect('candidate', c.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[hsl(var(--accent))] transition-smooth text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{c.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{c.positionApplied}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-medium shrink-0">
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searchResults.employees.length > 0 && (
              <div>
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)]">
                  Employees
                </div>
                {searchResults.employees.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => handleSearchSelect('employee', e.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[hsl(var(--accent))] transition-smooth text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{e.fullName}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{e.department.name} · {e.designation.name}</p>
                    </div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono shrink-0">{e.employeeCode}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-14 sm:h-16 bg-[hsl(var(--card)/0.8)] backdrop-blur-xl border-b border-[hsl(var(--border))] flex items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-smooth shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Search */}
        <div ref={searchRef} className="hidden sm:block flex-1 max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              id="global-search"
              type="text"
              placeholder="Search candidates & employees... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[hsl(var(--muted)/0.5)] border border-transparent rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:bg-[hsl(var(--background))] focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring))] transition-smooth"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] animate-spin" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <SearchResultsDropdown />
        </div>

        {/* Mobile spacer */}
        <div className="flex-1 sm:hidden" />

        {/* Mobile search toggle */}
        <button
          onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-smooth"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} className="relative shrink-0">
          <button
            onClick={toggleNotifications}
            className="relative p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-smooth"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[hsl(var(--destructive))] text-white text-[10px] font-bold rounded-full animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-1.5 w-[min(360px,calc(100vw-2rem))] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl shadow-black/15 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium transition-smooth"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground)/0.3)]" />
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-[hsl(var(--accent))] transition-smooth text-left border-b border-[hsl(var(--border)/0.5)] last:border-0 ${!notif.isRead ? 'bg-[hsl(var(--primary)/0.03)]' : ''}`}
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-[hsl(var(--primary))]' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notif.isRead ? 'font-medium text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          {new Date(notif.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center pl-2 sm:pl-3 border-l border-[hsl(var(--border))] shrink-0">
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 text-left rounded-lg hover:bg-[hsl(var(--accent))] p-1.5 transition-smooth"
            >
              <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-[hsl(var(--foreground))] leading-tight">{user?.name}</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{user?.role}</p>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 left-0 top-full mt-1 w-48 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl shadow-black/15 overflow-hidden z-50 py-1">
                {isAdmin && (
                  <button
                    onClick={() => { setShowProfileMenu(false); router.push('/settings'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-smooth"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] transition-smooth"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSearchOpen(false)} />
          <div className="relative bg-[hsl(var(--card))] px-3 py-3 shadow-xl border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); setShowSearchResults(false); }}
                className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="Search candidates & employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                />
              </div>
            </div>
            {/* Mobile search results */}
            {showSearchResults && searchResults && (
              <div className="mt-2 max-h-[60vh] overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                {searchResults.candidates.length === 0 && searchResults.employees.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <>
                    {searchResults.candidates.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)]">
                          Candidates
                        </div>
                        {searchResults.candidates.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleSearchSelect('candidate', c.id)}
                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[hsl(var(--accent))] text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{c.name}</p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{c.positionApplied}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.employees.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)]">
                          Employees
                        </div>
                        {searchResults.employees.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => handleSearchSelect('employee', e.id)}
                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[hsl(var(--accent))] text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] flex items-center justify-center">
                              <Users className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{e.fullName}</p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{e.department.name} · {e.designation.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
