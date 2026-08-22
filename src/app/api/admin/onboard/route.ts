import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    const { email, password, storeName } = await req.json();

    if (!email || !password || !storeName) {
      return NextResponse.json(
        { error: 'Email, password, and storeName are required.' },
        { status: 400 }
      );
    }

    // 1. Gawaran ng Account (Supabase Auth User)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 2. Gumawa ng Entry sa `stores` Table
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        name: storeName,
        owner_id: userId,
      })
      .select()
      .single();

    if (storeError) throw storeError;
    const storeId = storeData.id;

    // 3. I-link ang User sa Store bilang 'owner' sa `store_users`
    const { error: storeUserError } = await supabaseAdmin
      .from('store_users')
      .insert({
        store_id: storeId,
        user_id: userId,
        role: 'owner',
      });

    if (storeUserError) throw storeUserError;

    // 4. Mag-add ng Default Categories para sa Store
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .insert([
        { name: 'Coffee', store_id: storeId },
        { name: 'Non-Coffee', store_id: storeId },
        { name: 'Snacks', store_id: storeId },
      ])
      .select();

    if (catError) throw catError;

    const coffeeCat = categories.find((c) => c.name === 'Coffee');
    const nonCoffeeCat = categories.find((c) => c.name === 'Non-Coffee');
    const snacksCat = categories.find((c) => c.name === 'Snacks');

    // 5. Mag-add ng Default Products
    const defaultProducts = [
      {
        store_id: storeId,
        category_id: coffeeCat?.id,
        name: 'Iced Caramel Macchiato',
        price: 120.0,
        stock_qty: 50,
      },
      {
        store_id: storeId,
        category_id: coffeeCat?.id,
        name: 'Americano',
        price: 80.0,
        stock_qty: 100,
      },
      {
        store_id: storeId,
        category_id: coffeeCat?.id,
        name: 'Spanish Latte',
        price: 110.0,
        stock_qty: 40,
      },
      {
        store_id: storeId,
        category_id: nonCoffeeCat?.id,
        name: 'Matcha Green Tea',
        price: 130.0,
        stock_qty: 30,
      },
      {
        store_id: storeId,
        category_id: snacksCat?.id,
        name: 'Chocolate Fudge Cake',
        price: 100.0,
        stock_qty: 25,
      },
      {
        store_id: storeId,
        category_id: snacksCat?.id,
        name: 'Classic Waffle',
        price: 65.0,
        stock_qty: 60,
      },
      {
        store_id: storeId,
        category_id: snacksCat?.id,
        name: 'Cheese Croissant',
        price: 85.0,
        stock_qty: 20,
      },
    ];

    const { error: prodError } = await supabaseAdmin
      .from('products')
      .insert(defaultProducts);

    if (prodError) throw prodError;

    return NextResponse.json({
      message: 'Store and Owner onboarded successfully!',
      store: storeData,
      user: { id: userId, email },
    });
  } catch (error: any) {
    console.error('Onboarding Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to onboard store owner.' },
      { status: 500 }
    );
  }
}
