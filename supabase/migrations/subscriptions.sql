create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  trial_end timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

-- Users can only read their own subscription
create policy "Users read own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Service role (webhooks) can do everything
-- (handled by service role key bypassing RLS)
