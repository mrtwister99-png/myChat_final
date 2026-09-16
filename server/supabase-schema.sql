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
  created_at timestamptz not null default now()
);

insert into active_pins (type, pin)
values ('user', '33065'), ('admin', '66601')
on conflict (type) do nothing;
