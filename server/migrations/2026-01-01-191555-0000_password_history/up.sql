-- Your SQL goes here
create table password_history (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references users(id) on delete cascade,
	password varchar(255) not null,
	created_at timestamptz not null default now()
);

create index idx_user_id on password_history(user_id);
