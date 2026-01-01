-- Your SQL goes here
create table sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users(id) on delete cascade,

	token_hash varchar(255) not null unique,
	device_name varchar(255) not null,
	device_type varchar(50) not null,
	ip_address inet not null,
	user_agent text not null,
	country_code varchar(2) not null,
	city varchar(255) not null,

	created_at timestamp not null default now(),
	last_used_at timestamp not null default now(),
	expires_at timestamp not null default now(),
	revoked boolean not null default false,
	revoked_at timestampz,
	revoke_reason varchar(255),
);

create index idx_user_id on sessions (user_id);
create index idx_token_hash on sessions (token_hash);
create index idx_expires_at on sessions (expires_at);
