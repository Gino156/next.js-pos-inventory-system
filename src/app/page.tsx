'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Product, Category, CartItem } from '@/types';
import { ShoppingCart, Plus, Minus, CheckCircle2 } from 'lucide-react';
import ReceiptModal from '@/components/ReceiptModal';

export default function PosInterface() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('My Store');
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{
    orderId: string;
    items: { name: string; quantity: number; price: number }[];
    subtotal: number;
    cashTendered: number;
    change: number;
  } | null>(null);

  const fetchStoreAndProducts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: storeUserData } = await supabase
      .from('store_users')
      .select('store_id, stores(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!storeUserData) {
      setLoading(false);
      return;
    }

    const currentStoreId = storeUserData.store_id;
    setStoreId(currentStoreId);

    if (storeUserData.stores) {
      const name = Array.isArray(storeUserData.stores)
        ? storeUserData.stores[0]?.name
        : (storeUserData.stores as any).name;
      if (name) setStoreName(name);
    }

    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', currentStoreId);

    if (catData) setCategories(catData);

    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', currentStoreId);

    if (prodData) setProducts(prodData);

    setLoading(false);
  };

  useEffect(() => {
    fetchStoreAndProducts();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cashNum = parseFloat(cashTendered) || 0;
  const change = cashNum >= subtotal ? cashNum - subtotal : 0;

  const handleCheckout = async () => {
    if (cart.length === 0 || cashNum < subtotal || !storeId) return;

    setIsProcessing(true);
    try {
      // 1. Create Sale Record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          store_id: storeId,
          total_amount: subtotal,
          cash_tendered: cashNum,
          change_given: change,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Create Sale Items
      const saleItems = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // 3. Deduct Stock Quantities
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ stock_qty: item.product.stock_qty - item.quantity })
          .eq('id', item.product.id);
      }

      // 4. Set Receipt Details & Show Modal
      const receiptItems = cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.product.price),
      }));

      setLastOrderDetails({
        orderId: saleData.id,
        items: receiptItems,
        subtotal,
        cashTendered: cashNum,
        change,
      });

      setIsReceiptOpen(true);

      // Reset Cart and Cash
      setCart([]);
      setCashTendered('');
      await fetchStoreAndProducts();
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p) => p.category_id === selectedCategory);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden font-sans">
      {/* Left Product Catalog */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
        
        {/* Category Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading catalog...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="w-full h-28 rounded-xl bg-slate-100 border border-slate-100 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        No Image
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{product.name}</h3>
                    <p className="text-[11px] text-slate-400">Stock: {product.stock_qty}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                  <span className="font-extrabold text-slate-900 text-sm">₱{Number(product.price).toFixed(2)}</span>
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Plus size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-2">
          <ShoppingCart size={18} className="text-slate-700" />
          <h2 className="font-bold text-slate-900 text-base">Current Order</h2>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShoppingCart size={32} className="opacity-30" />
              <p className="text-xs font-medium">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-1 pr-2">
                  <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{item.product.name}</h4>
                  <p className="text-[11px] text-slate-500">₱{Number(item.product.price).toFixed(2)}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-bold text-slate-800 w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-slate-900 text-base pt-1">
              <span>Total</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cash Tendered</label>
            <input
              type="number"
              value={cashTendered}
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {cashNum > 0 && (
            <div className="flex justify-between text-xs font-bold text-emerald-600">
              <span>Change</span>
              <span>₱{change.toFixed(2)}</span>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || cashNum < subtotal || isProcessing}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all disabled:opacity-40 text-sm flex items-center justify-center space-x-2"
          >
            <CheckCircle2 size={16} />
            <span>{isProcessing ? 'Processing...' : `Charge ₱${subtotal.toFixed(2)}`}</span>
          </button>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      {lastOrderDetails && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          storeName={storeName}
          orderId={lastOrderDetails.orderId}
          items={lastOrderDetails.items}
          subtotal={lastOrderDetails.subtotal}
          cashTendered={lastOrderDetails.cashTendered}
          change={lastOrderDetails.change}
        />
      )}
    </div>
  );
}
