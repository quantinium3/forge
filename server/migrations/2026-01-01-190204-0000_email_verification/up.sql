-- Your SQL goes here
create type token_type as enum ('email_verification', 'password_reset');
create table email_verification (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users(id) on delete cascade,
	token_hash varchar(255) not null,
	token_type token_type not null,
	email varchar(255) not null,
	expires_at timestamptz not null,
	used_at timestamptz,
	created_at timestamptz not null default now(),
);

create index idx_token_hash on email_verification(token_hash);
create index idx_user_id on email_verification(user_id);
