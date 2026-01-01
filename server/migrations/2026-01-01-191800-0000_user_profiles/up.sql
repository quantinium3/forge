-- Your SQL goes here
create table user_profiles (
	user_id uuid primary key references users(id) on delete cascade,
	display_name varchar(255) not null,
	avatar_url varchar(2048),
	bio text,
	country varchar(255),
	date_of_birth date,

	language varchar(10) not null default 'en',
	theme varchar(10) not null default 'dark',

	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
