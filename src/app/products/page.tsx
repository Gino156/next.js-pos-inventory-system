'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Product, Category } from '@/types';
import { ArrowLeft, Plus, Edit2, Package, Tag, DollarSign, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProductsManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  const fetchStoreData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: storeUserData } = await supabase
      .from('store_users')
      .select('store_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!storeUserData) {
      alert("No store associated with this user.");
      setLoading(false);
      return;
    }

    const currentStoreId = storeUserData.store_id;
    setStoreId(currentStoreId);

    // Fetch Store Categories
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', currentStoreId);

    if (catData) setCategories(catData);

    // Fetch Store Products
    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', currentStoreId)
      .order('name', { ascending: true });

    if (prodData) {
      // Map properties safely to handle nulls or alternate schema names (stock_qty vs stock_quantity)
      const mappedProducts = prodData.map((p: any) => ({
        ...p,
        price: p.price ?? 0,
        stock_qty: p.stock_qty ?? p.stock_quantity ?? 0,
      }));
      setProducts(mappedProducts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name || '');
      setPrice(product.price != null ? product.price.toString() : '0');
      setStockQty((product as any).stock_qty != null ? (product as any).stock_qty.toString() : '0');
      setImageUrl(product.image_url || '');
      setCategoryId(product.category_id || '');
    } else {
      setEditingProduct(null);
      setName('');
      setPrice('');
      setStockQty('50');
      setImageUrl('');
      setCategoryId(categories[0]?.id || '');
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;

    setSaving(true);
    const parsedStock = parseInt(stockQty, 10) || 0;
    
    // Supports both database column naming conventions
    const payload = {
      store_id: storeId,
      name,
      price: parseFloat(price) || 0,
      stock_qty: parsedStock,
      stock_quantity: parsedStock,
      image_url: imageUrl || null,
      category_id: categoryId || null,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
          .eq('store_id', storeId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(payload);

        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchStoreData();
    } catch (err: any) {
      alert(`Error saving product: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
              <p className="text-xs text-slate-500">Add, edit pricing, update stocks & product images</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        </div>

        {/* Product List Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading products...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod: any) => (
              <div
                key={prod.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-slate-300" size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{prod.name}</h3>
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">
                      ₱{Number(prod.price || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Stock: <span className="font-semibold text-slate-700">{prod.stock_qty ?? prod.stock_quantity ?? 0}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenModal(prod)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="e.g. Iced Caramel Macchiato"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="120.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stock Qty</label>
                  <input
                    type="number"
                    required
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
