-- Run this in your Supabase SQL editor

create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  site_id text,
  customer_email text,
  total numeric(10,2) not null default 0,
  status text not null default 'paid',
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  product_id text,
  product_name text,
  quantity int not null default 1,
  price numeric(10,2) not null default 0
);

alter table orders enable row level security;
alter table order_items enable row level security;

-- Store owners can read orders belonging to their sites
create policy "users_read_own_orders" on orders
  for select using (auth.uid() = user_id);

-- Order items are accessible if you own the parent order
create policy "users_read_own_order_items" on order_items
  for select using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );
