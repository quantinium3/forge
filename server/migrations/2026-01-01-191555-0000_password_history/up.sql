-- Your SQL goes here
create table password_history (
	id uuid primary key,
	user_id uuid not null references users(id) on delete cascade,
	password varchar(255) not null,
	created_at timestamptz not null default now()
);

create index idx_password_history_user_id_created_at on password_history(user_id, created_at desc);
