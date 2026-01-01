-- This file should undo anything in `up.sql`
drop index if exists idx_role_permissions_permission_id;
drop index if exists idx_user_permissions_user_id;
drop index if exists idx_user_roles_user_id;
drop index if exists idx_permissions_category;

drop table if exists user_permissions;
drop table if exists role_permissions;
drop table if exists user_roles;
drop table if exists permissions;
drop table if exists roles;
