export interface Category {
  id: string;
  name: string;
  created_at?: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  stock_qty: number;
  image_url?: string;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id?: string;
  total_amount: number;
  payment_method: string;
  cash_tendered: number;
  change_given: number;
  created_at?: string;
}

export interface SaleItem {
  id?: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface Sale {
  id?: string;
  created_at?: string;
  total_amount: number;
  cash_tendered: number;
  change_given: number;
}

export interface DailySummary {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
}