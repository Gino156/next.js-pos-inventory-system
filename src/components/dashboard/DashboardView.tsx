'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Sale, DailySummary } from '@/types';
import { ArrowLeft, DollarSign, ShoppingBag, TrendingUp, RefreshCw, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardView() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resetting, setResetting] = useState<boolean>(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary>({
    totalRevenue: 0,
    totalTransactions: 0,
    averageOrderValue: 0,
  });

  const router = useRouter();

  // Helper para makuha ang kasalukuyang store_id ng user
  const getCurrentStoreId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return null;
    }

    const { data: storeUserData, error } = await supabase
      .from('store_users')
      .select('store_id')
      .eq('user_id', user.id)
      .single();

    if (error || !storeUserData) {
      console.error('Failed to get store user association:', error);
      return null;
    }

    return storeUserData.store_id;
  };

  const fetchTodaySales = async () => {
    setLoading(true);

    const currentStoreId = await getCurrentStoreId();
    if (!currentStoreId) {
      setLoading(false);
      return;
    }

    setStoreId(currentStoreId);
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Fetch sales filtering strictly by current tenant's store_id
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', currentStoreId)
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching today sales:', error);
    } else if (data) {
      setSales(data);

      const totalRev = data.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
      const totalTx = data.length;
      const avgOrder = totalTx > 0 ? totalRev / totalTx : 0;

      setSummary({
        totalRevenue: totalRev,
        totalTransactions: totalTx,
        averageOrderValue: avgOrder,
      });
    }

    setLoading(false);
  };

  const handleEndShift = async () => {
    if (!storeId) return;

    const confirmReset = window.confirm(
      "Are you sure you want to end your shift? This will reset today's sales log and restore default product stocks for your store."
    );

    if (!confirmReset) return;

    setResetting(true);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    try {
      // 1. Get today's sales IDs for THIS store only
      const { data: todaySales } = await supabase
        .from('sales')
        .select('id')
        .eq('store_id', storeId)
        .gte('created_at', startOfToday.toISOString());

      if (todaySales && todaySales.length > 0) {
        const saleIds = todaySales.map((s) => s.id);

        // 2. Delete related items from sale_items first
        await supabase
          .from('sale_items')
          .delete()
          .in('sale_id', saleIds);

        // 3. Delete today's sales records for THIS store
        const { error: salesError } = await supabase
          .from('sales')
          .delete()
          .eq('store_id', storeId)
          .gte('created_at', startOfToday.toISOString());

        if (salesError) throw salesError;
      }

      // 4. Reset product stocks back to default for THIS store only
      const { error: stockResetError } = await supabase
        .from('products')
        .update({ stock_qty: 50 })
        .eq('store_id', storeId);

      if (stockResetError) throw stockResetError;

      // 5. Refresh display
      await fetchTodaySales();
      alert("Shift ended successfully! Sales logs cleared and inventory restored.");
    } catch (err: any) {
      console.error('Error resetting shift:', err);
      alert(`Failed to reset shift: ${err.message || 'Check RLS policies.'}`);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchTodaySales();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Daily Sales Dashboard</h1>
              <p className="text-xs text-slate-500">Real-time performance summary for today</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchTodaySales}
              disabled={loading || resetting}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleEndShift}
              disabled={resetting || loading}
              className="flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <LogOut size={16} />
              <span>{resetting ? 'Resetting...' : 'End Shift / Reset'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">₱{summary.totalRevenue.toFixed(2)}</h2>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transactions</p>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{summary.totalTransactions}</h2>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Order Value</p>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">₱{summary.averageOrderValue.toFixed(2)}</h2>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Today's Transactions Log</h3>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading transactions...</div>
            ) : sales.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No sales recorded today yet.</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Sale ID</th>
                    <th className="px-6 py-3">Cash Tendered</th>
                    <th className="px-6 py-3">Change Given</th>
                    <th className="px-6 py-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {sale.created_at
                          ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {sale.id ? `${sale.id.slice(0, 8)}...` : '—'}
                      </td>
                      <td className="px-6 py-4">₱{Number(sale.cash_tendered).toFixed(2)}</td>
                      <td className="px-6 py-4">₱{Number(sale.change_given).toFixed(2)}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-right">
                        ₱{Number(sale.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}