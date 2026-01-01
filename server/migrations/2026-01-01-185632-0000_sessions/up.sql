-- Your SQL goes here
create table sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users(id) on delete cascade,

	token_hash varchar(255) not null unique,
	device_name varchar(255),
	device_type varchar(50),
	ip_address inet not null,
	user_agent text,
	country_code varchar(2),
	city varchar(255),

	created_at timestamptz not null default now(),
	last_used_at timestamptz not null default now(),
	expires_at timestamptz not null default now(),
	revoked boolean not null default false,
	revoked_at timestamptz,
	revoke_reason varchar(255)
);

create index idx_sessions_user_id on sessions (user_id);
create index idx_sessions_expires_at on sessions (expires_at) where revoked = false;
