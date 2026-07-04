-- Add subscription fields to profiles
alter table public.profiles 
add column if not exists subscription_tier text default 'free',
add column if not exists subscription_expires_at timestamptz;

-- Update transactions to accommodate subscription plan metadata easily
-- (No structural change needed for transactions as it already has jsonb metadata)
