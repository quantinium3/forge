-- Your SQL goes here
create type verification_token_type as enum ('email_verification', 'password_reset');
create table verification_tokens (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users(id) on delete cascade,
	token_hash varchar(255) not null unique,
	token_type verification_token_type not null,
	email varchar(255) not null,
	expires_at timestamptz not null,
	used_at timestamptz,
	created_at timestamptz not null default now()
);

create index idx_verification_tokens_user_id on verification_tokens(user_id);
