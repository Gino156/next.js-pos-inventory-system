'use client';

import React, { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface SaleItemDetail {
  id: string;
  quantity: number;
  unit_price: number;
  products: { name: string } | null;
}

interface DetailedTransaction {
  id: string;
  created_at: string;
  total_amount: number;
  cash_tendered: number;
  change_given: number;
  sale_items: SaleItemDetail[];
}

interface SalesSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  totalSales: number;
  totalOrders: number;
}

export default function SalesSummaryModal({
  isOpen,
  onClose,
  storeName,
  totalSales,
  totalOrders,
}: SalesSummaryProps) {
  const [transactions, setTransactions] = useState<DetailedTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDetailedTransactions = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeUserData } = await supabase
        .from('store_users')
        .select('store_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!storeUserData) return;

      const { data: sales } = await supabase
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
        .eq('store_id', storeUserData.store_id)
        .order('created_at', { ascending: true });

      if (sales) {
        setTransactions(sales as any);
      }
      setLoading(false);
    };

    fetchDetailedTransactions();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      
      {/* Modal Box with Viewport Constraints */}
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden print:p-0 print:shadow-none print:border-none print:max-h-none print:overflow-visible">
        
        {/* Fixed Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shrink-0 print:hidden">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Official Sales Summary Audit</h3>
            <p className="text-[11px] text-slate-400">Scroll below to preview before printing</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          <div id="summary-paper" className="font-mono text-xs text-slate-900 space-y-3">
            <div className="text-center space-y-0.5">
              <h2 className="font-extrabold text-base uppercase tracking-wider">{storeName}</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">End of Day Sales Audit Report</p>
              <p className="text-[10px] text-slate-400">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-[10px] text-slate-400">Generated: {new Date().toLocaleTimeString()}</p>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Transactions List */}
            <div className="space-y-3">
              <span className="font-bold text-[10px] uppercase text-slate-500 block pb-1">TRANSACTION DETAILS</span>

              {loading ? (
                <p className="text-center text-[10px] text-slate-400 py-2">Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 py-2">No recorded sales.</p>
              ) : (
                transactions.map((tx, idx) => {
                  const dateObj = new Date(tx.created_at);
                  const timeStr = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <div key={tx.id} className="space-y-1 text-[11px] border-b border-slate-100 pb-2">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>#{idx + 1} | {timeStr}</span>
                        <span>Ref: {tx.id.slice(0, 8)}</span>
                      </div>

                      {/* Purchased Items */}
                      <div className="pl-2 space-y-0.5 text-slate-600">
                        {tx.sale_items?.map((item) => {
                          const prodName = item.products?.name || 'Item';
                          const itemTotal = item.quantity * Number(item.unit_price);
                          return (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.quantity}x {prodName} @ ₱{Number(item.unit_price).toFixed(2)}</span>
                              <span>₱{itemTotal.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between font-bold text-slate-900 pt-0.5 pl-2">
                        <span>Total Amount:</span>
                        <span>₱{Number(tx.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            {/* Summary Totals */}
            <div className="space-y-1 text-xs font-bold pt-1">
              <div className="flex justify-between text-slate-700">
                <span>TOTAL TRANSACTIONS:</span>
                <span>{totalOrders}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                <span>GRAND TOTAL REVENUE:</span>
                <span>₱{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-400 my-2" />

            <div className="text-center text-[10px] text-slate-400 space-y-0.5 pt-1">
              <p>Official Sales Audit Log</p>
              <p>Confidential - System Generated</p>
            </div>
          </div>
        </div>

        {/* Always Visible Fixed Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex space-x-2 shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-all"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>
        </div>

      </div>

      {/* Print CSS Rules */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #summary-paper, #summary-paper * {
            visibility: visible;
          }
          #summary-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
        }
      `}</style>
    </div>
  );
}
