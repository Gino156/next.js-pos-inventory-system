'use client';

import React, { useState } from 'react';
import { CartItem } from '@/types';
import { CheckCircle2, X } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  totalAmount: number;
  onConfirmCheckout: (cashTendered: number, changeGiven: number) => Promise<void>;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  totalAmount,
  onConfirmCheckout,
}: CheckoutModalProps) {
  const [cash, setCash] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const cashNum = parseFloat(cash) || 0;
  const change = cashNum >= totalAmount ? cashNum - totalAmount : 0;
  const isValidPayment = cashNum >= totalAmount;

  const quickAmounts = [totalAmount, 100, 200, 500, 1000];

  const handleCheckout = async () => {
    if (!isValidPayment || loading) return;
    setLoading(true);
    try {
      await onConfirmCheckout(cashNum, change);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCash('');
        onClose();
      }, 1500);
    } catch (err) {
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl transition-all">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold">Process Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <CheckCircle2 size={60} className="text-emerald-500 animate-bounce" />
            <h3 className="text-2xl font-bold text-slate-800">Transaction Complete!</h3>
            <p className="text-slate-500 text-sm">Change: ₱{change.toFixed(2)}</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Total Amount Display */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <span className="text-sm font-medium text-slate-500">Total Amount Due</span>
              <div className="text-4xl font-extrabold text-slate-900 mt-1">
                ₱{totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Quick Tender Buttons */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
                Quick Tender
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCash(amt.toString())}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-slate-700 text-sm active:scale-95 transition-all"
                  >
                    {amt === totalAmount ? 'Exact' : `₱${amt}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Input */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 block">
                Cash Tendered (₱)
              </label>
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl font-bold p-3 border-2 border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none text-right"
              />
            </div>

            {/* Change Display */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-600">Change:</span>
              <span className={`text-2xl font-bold ${isValidPayment ? 'text-emerald-600' : 'text-slate-400'}`}>
                ₱{change.toFixed(2)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              disabled={!isValidPayment || loading}
              onClick={handleCheckout}
              aria-busy={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg ${
                isValidPayment && !loading
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}