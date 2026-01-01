-- Your SQL goes here
create table users (
	id uuid primary key default gen_random_uuid(),
	username varchar(255) unique not null,
	email varchar(255) unique not null,
	email_verified boolean not null default false,

	role varchar(255) not null default 'user',

	is_active boolean not null default true,
	is_banned boolean not null default false,
	banned_until timestampz,
	ban_reason varchar(255),

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	last_login timestamptz,
);

create unique index idx_email on users(email);
create unique index idx_username on users(username);
create index idx_role on users(role);
