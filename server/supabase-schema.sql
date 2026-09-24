create table if not exists active_pins (
  type text primary key check (type in ('user', 'admin')),
  pin text not null check (pin ~ '^[0-9]{5}$'),
  updated_at timestamptz not null default now()
);

create table if not exists admin_config (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists ip_history (
  id text primary key,
  ip text not null,
  type text not null,
  reason text not null default '',
  user_id text,
  created_at bigint not null
);

create table if not exists kicked_ips (
  ip text primary key,
  reason text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists recovery_requests (
  id text primary key,
  ip text not null,
  user_id text,
  reason text not null default '',
  status text not null default 'pending',
  created_at bigint not null,
  approved_at bigint,
  approved_by text
);

create table if not exists special_pins (
  user_id text primary key,
  pin text not null check (pin ~ '^[0-9]{5}$'),
  device_id text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  use_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists chat_users (
  id text primary key,
  name text not null,
  device_id text,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  user_id text not null,
  sender text not null,
  text text not null,
  created_at bigint not null,
  self_destruct boolean not null default false
);

alter table messages add column if not exists self_destruct boolean not null default false;

create table if not exists trusted_devices (
  device_id text primary key,
  device_fingerprint text,
  device_model text,
  temp_name text,
  first_ip text,
  current_ip text,
  email text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  is_trusted boolean not null default true,
  badge text not null default 'DŮVĚRYHODNÝ'
);

create table if not exists push_tokens (
  device_id text primary key,
  user_id text not null,
  expo_token text not null,
  role text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_trusted_email on trusted_devices(email);

create table if not exists honey_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text,
  device_id text,
  tried_pin text,
  attempted_at timestamptz not null default now()
);

alter table special_pins add column if not exists device_id text;
alter table special_pins add column if not exists expires_at timestamptz default (now() + interval '24 hours');
alter table special_pins add column if not exists use_count integer default 0;
alter table special_pins add column if not exists is_active boolean default true;
alter table kicked_ips add column if not exists is_active boolean default true;
alter table trusted_devices add column if not exists temp_name text;
alter table trusted_devices add column if not exists current_ip text;
alter table trusted_devices add column if not exists is_pending boolean default true;
alter table trusted_devices add column if not exists device_fingerprint text;
alter table trusted_devices add column if not exists device_model text;

alter table active_pins enable row level security;
alter table admin_config enable row level security;
alter table chat_users enable row level security;
alter table messages enable row level security;
alter table ip_history enable row level security;
alter table recovery_requests enable row level security;
alter table special_pins enable row level security;
alter table kicked_ips enable row level security;
alter table trusted_devices enable row level security;
alter table honey_attempts enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'active_pins', 'admin_config', 'chat_users', 'messages', 'ip_history',
    'recovery_requests', 'special_pins', 'kicked_ips', 'trusted_devices', 'honey_attempts', 'push_tokens'
  ] loop
    execute format('drop policy if exists "deny anon all" on %I', table_name);
    execute format('create policy "deny anon all" on %I for all using (false) with check (false)', table_name);
  end loop;
end $$;

