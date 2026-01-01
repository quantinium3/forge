-- Your SQL goes here
create table roles (
	id uuid primary key default gen_random_uuid(),
	slug varchar(255) not null unique, -- 'admin', 'user'
	name varchar(255) not null unique,
	created_at timestamptz not null default now()
);

create table permissions (
	id uuid primary key default gen_random_uuid(),
	name varchar(255) not null unique,
	description text not null,
	category varchar(255) not null,
	created_at timestamptz not null default now()
);

create table user_roles (
	user_id uuid not null references users(id) on delete cascade,
	role_id uuid not null references roles(id) on delete cascade,
	assigned_by uuid references users(id) on delete set null,
	assigned_at timestamptz not null default now(),
	primary key (user_id, role_id)
);

create table role_permissions (
	role_id uuid not null references roles(id) on delete cascade,
	permission_id uuid not null references permissions(id) on delete cascade,
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

create index idx_permissions_category on permissions(category);
create index idx_user_roles_user_id on user_roles(user_id);
create index idx_user_permissions_user_id on user_permissions(user_id);
create index idx_role_permissions_permission_id on role_permissions(permission_id);
