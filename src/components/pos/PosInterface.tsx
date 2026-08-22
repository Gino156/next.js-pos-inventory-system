'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Category, Product, CartItem } from '@/types';
import CheckoutModal from './CheckoutModal';
import { ShoppingCart, Plus, Minus, Trash2, Coffee, RefreshCw, Image as ImageIcon, LayoutDashboard, LogOut } from 'lucide-react';

export default function PosInterface() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    setLoading(true);

    // 1. Kunin ang kasalukuyang Auth User
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // 2. Hanapin ang store_id sa `store_users` table
    const { data: storeUserData, error: storeUserError } = await supabase
      .from('store_users')
      .select('store_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (storeUserError || !storeUserData) {
      console.error('Store association error:', storeUserError);
      setLoading(false);
      return;
    }

    const currentStoreId = storeUserData.store_id;
    setStoreId(currentStoreId);

    // 3. Filter Categories at Products gamit ang `store_id`
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', currentStoreId);

    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', currentStoreId);

    if (catError) console.error('Categories Error:', catError);
    if (prodError) console.error('Products Error:', prodError);

    if (catData) setCategories(catData);
    if (prodData) setProducts(prodData);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  const addToCart = (product: Product) => {
    if (product.stock_qty <= 0) return;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
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

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleConfirmCheckout = async (cashTendered: number, changeGiven: number) => {
    if (!storeId) return;

    const payloadItems = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
    }));

    // I-pass ang `p_store_id` pabalik sa Stored Procedure sa Supabase
    const { error } = await supabase.rpc('process_sale', {
      p_store_id: storeId,
      p_total: totalAmount,
      p_cash: cashTendered,
      p_change: changeGiven,
      p_items: payloadItems,
    });

    if (error) throw error;

    setCart([]);
    await checkUserAndFetch();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Left Main View: Products & Categories */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
        {/* Top Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-2">
            <Coffee className="text-amber-600" size={28} />
            <h1 className="text-xl font-bold text-slate-800">MiniPOS Express</h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* Dashboard Button */}
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>

            {/* Refresh Button */}
            <button
              onClick={checkUserAndFetch}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-rose-500 hover:text-rose-700 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Category Horizontal Filter Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const outOfStock = product.stock_qty <= 0;
                return (
                  <button
                    key={product.id}
                    disabled={outOfStock}
                    onClick={() => addToCart(product)}
                    className={`p-3 rounded-2xl text-left flex items-center justify-between gap-3 border transition-all active:scale-95 shadow-sm ${
                      outOfStock
                        ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-md'
                    }`}
                  >
                    {/* Image Thumbnail Placeholder */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative flex items-center justify-center border border-slate-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="text-slate-300" size={24} />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate">
                        {product.name}
                      </h3>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Stock: {product.stock_qty}
                      </span>
                      <span className="font-extrabold text-slate-900 text-base mt-1 block">
                        ₱{product.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Add Button */}
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700 flex-shrink-0">
                      <Plus size={16} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Order Cart */}
      <div className="w-full md:w-96 bg-white h-full flex flex-col border-t md:border-t-0 md:border-l border-slate-200 shadow-lg">
        <div className="p-4 border-b border-slate-200 flex items-center space-x-2 bg-slate-50">
          <ShoppingCart size={20} className="text-slate-700" />
          <h2 className="font-bold text-slate-800">Current Order</h2>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShoppingCart size={48} strokeWidth={1.5} />
              <p className="text-sm font-medium">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex-1 mr-2 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate">
                    {item.product.name}
                  </h4>
                  <span className="text-xs text-slate-500">
                    ₱{item.product.price.toFixed(2)} x {item.quantity}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-l-lg"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-2 text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-r-lg"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="flex justify-between items-center text-slate-600 text-sm">
            <span>Subtotal</span>
            <span>₱{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-900 font-extrabold text-xl">
            <span>Total</span>
            <span>₱{totalAmount.toFixed(2)}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={() => setIsModalOpen(true)}
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all ${
              cart.length > 0
                ? 'bg-slate-900 hover:bg-slate-800 active:scale-95'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Charge ₱{totalAmount.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Modal */}
      <CheckoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cart={cart}
        totalAmount={totalAmount}
        onConfirmCheckout={handleConfirmCheckout}
      />
    </div>
  );
}