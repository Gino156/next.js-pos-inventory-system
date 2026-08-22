'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName: string;
  orderId: string;
  items: ReceiptItem[];
  subtotal: number;
  cashTendered: number;
  change: number;
  dateStr?: string;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  storeName,
  orderId,
  items,
  subtotal,
  cashTendered,
  change,
  dateStr = new Date().toLocaleString(),
}: ReceiptModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      
      {/* Modal Box */}
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 print:p-0 print:shadow-none print:border-none">
        
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between border-b pb-3 print:hidden">
          <h3 className="font-bold text-slate-800 text-sm">Receipt Preview</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* --- THERMAL RECEIPT CONTAINER (Printed Area) --- */}
        <div id="receipt-paper" className="p-2 font-mono text-xs text-slate-900 space-y-3">
          <div className="text-center space-y-1">
            <h2 className="font-extrabold text-base uppercase tracking-wider">{storeName}</h2>
            <p className="text-[10px] text-slate-500">Official Sales Receipt</p>
            <p className="text-[10px] text-slate-400">{dateStr}</p>
            <p className="text-[10px] text-slate-400">Order #{orderId.slice(0, 8)}</p>
          </div>

          <div className="border-b border-dashed border-slate-400 my-2" />

          {/* Items List */}
          <div className="space-y-1.5">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <div className="font-bold">{item.name}</div>
                  <div className="text-[10px] text-slate-500">{item.quantity} x ₱{item.price.toFixed(2)}</div>
                </div>
                <div className="font-bold">₱{(item.quantity * item.price).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-slate-400 my-2" />

          {/* Totals */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between font-extrabold text-sm pt-1">
              <span>TOTAL</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CASH</span>
              <span>₱{cashTendered.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CHANGE</span>
              <span>₱{change.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-slate-400 my-2" />

          <div className="text-center text-[10px] text-slate-500 space-y-0.5 pt-2">
            <p>Thank you for your purchase!</p>
            <p>Please come again.</p>
          </div>
        </div>

        {/* Actions - Hidden on Print */}
        <div className="flex space-x-2 pt-2 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-2"
          >
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
        </div>

      </div>

      {/* --- CSS PRINT STYLES --- */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-paper, #receipt-paper * {
            visibility: visible;
          }
          #receipt-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm; /* Dynamic length for 80mm/58mm thermal printers */
          }
        }
      `}</style>
    </div>
  );
}
