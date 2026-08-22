cat << 'EOF' > README.md
# 🛒 Next.js POS & Inventory Management System

A modern, fast, and scalable **Point of Sale (POS) and Inventory Management System** designed for small businesses. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and powered by **Supabase** for real-time database management, storage, and authentication.

---

## ✨ Core Features

### 📦 Inventory & Product Management (`/products`)
* **Dynamic Product Catalog:** View, search, and filter products by custom categories.
* **Inline Quick Updates:** Instantly adjust prices and stock levels directly on product cards.
* **Product Management Modal:** Create and edit products with automated stock initialization and category selection.
* **Image Upload Support:** Upload and store product visual assets via Supabase Storage buckets.
* **Category Management:** Dynamically create and organize categories mapped to your specific store.

### 💳 Point of Sale (POS) Interface
* **Fast Checkout:** Responsive cart interface tailored for rapid in-person customer service.
* **Automated Stock Deduction:** Real-time stock calculation and inventory updates upon sale completion.
* **Cart Summary & Totals:** Live subtotal, taxes, and price calculations.

### 🔐 Authentication & Multi-Store Security
* **Secure Auth Flow:** Multi-user access control powered by Supabase Auth.
* **Data Isolation:** Store-level user mapping (`store_users`) ensuring data confidentiality and security across separate store instances.

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 14+](https://nextjs.org/) (App Router)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL & Row-Level Security)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/Gino156/next.js-pos-inventory-system.git](https://github.com/Gino156/next.js-pos-inventory-system.git)
cd next.js-pos-inventory-system