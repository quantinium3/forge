-- Your SQL goes here
create extension if not exists citext;

create table users (
	id uuid primary key default gen_random_uuid(),
	username citext unique not null,
	email citext unique not null,
	email_verified boolean not null default false,

	is_active boolean not null default true,
	is_banned boolean not null default false,
	banned_until timestamptz,
	ban_reason varchar(255),

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	last_login timestamptz
);
