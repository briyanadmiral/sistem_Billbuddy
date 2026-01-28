-- BillBuddy Database Schema
-- Social Debt & Split Bill Manager

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- 2. Payment accounts table (bank accounts, QRIS, etc.)
create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  is_primary boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.payment_accounts enable row level security;

create policy "payment_accounts_select_own" on public.payment_accounts for select using (auth.uid() = user_id);
create policy "payment_accounts_insert_own" on public.payment_accounts for insert with check (auth.uid() = user_id);
create policy "payment_accounts_update_own" on public.payment_accounts for update using (auth.uid() = user_id);
create policy "payment_accounts_delete_own" on public.payment_accounts for delete using (auth.uid() = user_id);

-- 3. Rooms table (for collaborative sessions)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  host_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text unique not null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.rooms enable row level security;

-- 4. Room members table (created before rooms policies since rooms policies reference it)
create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(room_id, user_id)
);

alter table public.room_members enable row level security;

-- Now create policies for rooms (after room_members exists)
create policy "rooms_select_members" on public.rooms for select using (
  exists (
    select 1 from public.room_members where room_members.room_id = rooms.id and room_members.user_id = auth.uid()
  ) or host_id = auth.uid()
);
create policy "rooms_insert_own" on public.rooms for insert with check (auth.uid() = host_id);
create policy "rooms_update_host" on public.rooms for update using (auth.uid() = host_id);
create policy "rooms_delete_host" on public.rooms for delete using (auth.uid() = host_id);

-- Policies for room_members
create policy "room_members_select" on public.room_members for select using (
  user_id = auth.uid() or exists (
    select 1 from public.room_members rm where rm.room_id = room_members.room_id and rm.user_id = auth.uid()
  )
);
create policy "room_members_insert" on public.room_members for insert with check (auth.uid() = user_id);
create policy "room_members_delete" on public.room_members for delete using (auth.uid() = user_id);

-- 5. Activities table (receipts/bills within a room)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  description text,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  subtotal numeric(15,2) default 0,
  tax_amount numeric(15,2) default 0,
  service_charge numeric(15,2) default 0,
  discount_amount numeric(15,2) default 0,
  total_amount numeric(15,2) default 0,
  receipt_image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.activities enable row level security;

create policy "activities_select_room_members" on public.activities for select using (
  exists (
    select 1 from public.room_members where room_members.room_id = activities.room_id and room_members.user_id = auth.uid()
  )
);
create policy "activities_insert_room_members" on public.activities for insert with check (
  exists (
    select 1 from public.room_members where room_members.room_id = activities.room_id and room_members.user_id = auth.uid()
  )
);
create policy "activities_update_payer" on public.activities for update using (auth.uid() = payer_id);
create policy "activities_delete_payer" on public.activities for delete using (auth.uid() = payer_id);

-- 6. Activity items table (individual items in a receipt)
create table if not exists public.activity_items (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  name text not null,
  quantity integer default 1,
  unit_price numeric(15,2) not null,
  total_price numeric(15,2) not null,
  created_at timestamp with time zone default now()
);

alter table public.activity_items enable row level security;

create policy "activity_items_select" on public.activity_items for select using (
  exists (
    select 1 from public.activities a
    join public.room_members rm on rm.room_id = a.room_id
    where a.id = activity_items.activity_id and rm.user_id = auth.uid()
  )
);
create policy "activity_items_insert" on public.activity_items for insert with check (
  exists (
    select 1 from public.activities a
    join public.room_members rm on rm.room_id = a.room_id
    where a.id = activity_items.activity_id and rm.user_id = auth.uid()
  )
);
create policy "activity_items_update" on public.activity_items for update using (
  exists (
    select 1 from public.activities a where a.id = activity_items.activity_id and a.payer_id = auth.uid()
  )
);
create policy "activity_items_delete" on public.activity_items for delete using (
  exists (
    select 1 from public.activities a where a.id = activity_items.activity_id and a.payer_id = auth.uid()
  )
);

-- 7. Item splits table (who consumes which item)
create table if not exists public.item_splits (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.activity_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(15,2) not null,
  created_at timestamp with time zone default now(),
  unique(item_id, user_id)
);

alter table public.item_splits enable row level security;

create policy "item_splits_select" on public.item_splits for select using (
  exists (
    select 1 from public.activity_items ai
    join public.activities a on a.id = ai.activity_id
    join public.room_members rm on rm.room_id = a.room_id
    where ai.id = item_splits.item_id and rm.user_id = auth.uid()
  )
);
create policy "item_splits_insert" on public.item_splits for insert with check (auth.uid() = user_id);
create policy "item_splits_delete" on public.item_splits for delete using (auth.uid() = user_id);

-- 8. Settlements table (final debt calculations)
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  debtor_id uuid not null references public.profiles(id) on delete cascade,
  creditor_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(15,2) not null,
  is_paid boolean default false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.settlements enable row level security;

create policy "settlements_select" on public.settlements for select using (
  auth.uid() = debtor_id or auth.uid() = creditor_id
);
create policy "settlements_insert" on public.settlements for insert with check (
  exists (
    select 1 from public.room_members where room_members.room_id = settlements.room_id and room_members.user_id = auth.uid()
  )
);
create policy "settlements_update" on public.settlements for update using (
  auth.uid() = debtor_id or auth.uid() = creditor_id
);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Function to generate unique invite codes
create or replace function generate_invite_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists_check boolean;
begin
  loop
    code := upper(substring(md5(random()::text) from 1 for 6));
    select exists(select 1 from public.rooms where invite_code = code) into exists_check;
    exit when not exists_check;
  end loop;
  return code;
end;
$$;
