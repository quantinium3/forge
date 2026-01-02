-- Your SQL goes here
create table user_credentials (
	id uuid primary key,
	user_id uuid unique not null references users(id) on delete cascade,
	password varchar(255) not null,
	password_changed_at timestamptz not null default now(),

	is_locked boolean not null default false,
	locked_until timestamptz,
	failed_login_attempts int not null default 0,
	last_failed_login_at timestamptz,

	totp_secret varchar(64),
	totp_enabled boolean not null default false,
	backup_codes_hashed text[],

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
