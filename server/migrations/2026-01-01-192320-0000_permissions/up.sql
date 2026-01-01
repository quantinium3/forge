-- Your SQL goes here
create table roles (
	id uuid primary key default gen_random_uuid(),
	slug varchar(255) not null unique, -- 'admin', 'user'
	name varchar(255) not null unique,
);

create table permissions (
	id uuid primary key default gen_random_uuid(),
	name varchar(255) not null unique,
	description text not null,
	category varchar(255) not null,
	created_at timestamptz not null default now(),
);

create table role_permissions (
	role_id uuid references roles(id) not null on delete cascade,
	permission_id uuid references permissions(id) on delete cascade,
	primary key (role_id, permission_id)
);

create table user_permissions (
	user_id uuid not null references users(id) on delete cascade,
	permission_id uuid not null references permissions(id) on delete cascade,
	granted boolean not null default true,
	granted_by uuid references users(id) on delete set null,
	granted_at timestamptz not null default now(),
	primary key (user_id, permission_id)
);

create index idx_permission_category on permissions(category);
create index idx_user_permissions_user on user_permissions(user_id);
