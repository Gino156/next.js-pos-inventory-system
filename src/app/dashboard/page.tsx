'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { TrendingUp, ShoppingBag, DollarSign, Printer, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import SalesSummaryModal from '@/components/SalesSummaryModal';

interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  products: { name: string } | null;
}

interface TransactionRecord {
  id: string;
  created_at: string;
  total_amount: number;
  cash_tendered: number;
  change_given: number;
  sale_items: SaleItem[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('My Store');
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeUserData } = await supabase
        .from('store_users')
        .select('store_id, stores(name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!storeUserData) return;

      const currentStoreId = storeUserData.store_id;
      if (storeUserData.stores) {
        const name = Array.isArray(storeUserData.stores)
          ? storeUserData.stores[0]?.name
          : (storeUserData.stores as any).name;
        if (name) setStoreName(name);
      }

      // Fetch Sales and nested Sale Items
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          created_at,
          total_amount,
          cash_tendered,
          change_given,
          sale_items (
            id,
            quantity,
            unit_price,
            products ( name )
          )
        `)
        .eq('store_id', currentStoreId)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      if (salesData) {
        const typedSales = salesData as any;
        setTransactions(typedSales);

        const revenue = typedSales.reduce((acc: number, curr: any) => acc + Number(curr.total_amount), 0);
        setTotalSales(revenue);
        setTotalOrders(typedSales.length);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales & Audit Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time transaction history for <span className="font-semibold text-slate-700">{storeName}</span></p>
        </div>

        <button
          onClick={() => setIsSummaryOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
        >
          <Printer size={16} />
          <span>Print Sales Audit Summary</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Total Revenue</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900">
              ₱{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center space-x-1 text-emerald-600 text-xs font-semibold mt-2">
              <TrendingUp size={14} />
              <span>Gross Sales Collected</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Completed Orders</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900">{totalOrders}</span>
            <p className="text-xs text-slate-500 font-medium mt-2">Total Transactions</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Average Basket</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Receipt size={20} />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-slate-900">
              ₱{averageOrderValue.toFixed(2)}
            </span>
            <p className="text-xs text-slate-500 font-medium mt-2">Average Sales Per Ticket</p>
          </div>
        </div>
      </div>

      {/* Real-World Professional Transaction History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Transaction Logs</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click any transaction row to view itemized breakdowns.</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {transactions.length} Records
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">No sales recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-center">Items Purchased</th>
                  <th className="py-3 px-4 text-right">Cash Tendered</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {transactions.map((tx) => {
                  const dateObj = new Date(tx.created_at);
                  const isExpanded = expandedTxId === tx.id;
                  const itemQuantityTotal = tx.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                  return (
                    <React.Fragment key={tx.id}>
                      <tr
                        onClick={() => toggleExpand(tx.id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          #{tx.id.slice(0, 8)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                          <span className="text-slate-400 text-[11px]">
                            {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {itemQuantityTotal} {itemQuantityTotal === 1 ? 'item' : 'items'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600">
                          ₱{Number(tx.cash_tendered || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                          ₱{Number(tx.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400 group-hover:text-slate-900">
                          {isExpanded ? <ChevronUp size={16} className="mx-auto" /> : <ChevronDown size={16} className="mx-auto" />}
                        </td>
                      </tr>

                      {/* Expanded Item Breakdown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4 border-l-4 border-slate-900">
                            <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                                Order Items Breakdown
                              </h4>
                              <div className="divide-y divide-slate-100">
                                {tx.sale_items?.map((item) => (
                                  <div key={item.id} className="py-2 flex justify-between text-xs">
                                    <div>
                                      <span className="font-bold text-slate-800">
                                        {item.products?.name || 'Item'}
                                      </span>
                                      <span className="text-slate-400 ml-2">
                                        ({item.quantity} x ₱{Number(item.unit_price).toFixed(2)})
                                      </span>
                                    </div>
                                    <span className="font-bold text-slate-900">
                                      ₱{(item.quantity * Number(item.unit_price)).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-extrabold text-slate-900">
                                <span>Grand Total</span>
                                <span>₱{Number(tx.total_amount).toFixed(2)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Audit Modal */}
      <SalesSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        storeName={storeName}
        totalSales={totalSales}
        totalOrders={totalOrders}
      />
    </div>
  );
}
