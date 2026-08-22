'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, LayoutDashboard, Package, LogOut, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [storeName, setStoreName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStoreInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStoreName('');
        setLoading(false);
        return;
      }

      // Query store_users linked to stores table
      const { data: storeUserData, error } = await supabase
        .from('store_users')
        .select('stores(name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching store name:', error);
      }

      if (storeUserData?.stores) {
        const name = Array.isArray(storeUserData.stores)
          ? storeUserData.stores[0]?.name
          : (storeUserData.stores as any).name;
        
        if (name) setStoreName(name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreInfo();

    // Listen to Auth State changes (Login, Logout, Session Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchStoreInfo();
      } else if (event === 'SIGNED_OUT') {
        setStoreName('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Safe condition return AFTER all hooks
  if (pathname === '/login' || pathname === '/admin/onboard') {
    return null;
  }

  const navItems = [
    { label: 'POS Terminal', href: '/', icon: ShoppingBag },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Inventory', href: '/products', icon: Package },
  ];

  return (
    <nav className="w-full bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Dynamic Brand / Store Name */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-xl text-emerald-400">
              <Store size={20} />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-wide block leading-none text-white">
                {loading ? 'Loading store...' : storeName || 'POS Store'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1 block">
                SaaS POS System
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-emerald-400' : ''} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}

            <div className="h-6 w-px bg-slate-800 mx-2" />

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
