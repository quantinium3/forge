-- This file should undo anything in `up.sql`
drop table if exists user_permissions;
drop table if exists role_permissions;
drop table if exists permissions;
drop table if exists roles;
drop index if exists idx_user_permissions_user;
drop index if exists idx_permission_category;
