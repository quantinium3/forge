-- This file should undo anything in `up.sql`
drop table if existsusers;
drop index if exists idx_email;
drop index if exists idx_username;
drop index if exists idx_role;
