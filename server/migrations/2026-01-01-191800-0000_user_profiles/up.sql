-- Your SQL goes here
create table user_profiles (
	user_id uuid primary key references users(id) on delete cascade,
	display_name varchar(255) not null,
	avatar_url varchar(255),
	bio varchar(255),
	country varchar(255),
	date_of_birth date,

	language varchar(10) default 'en',
	theme varchar(10) default 'dark',
);
