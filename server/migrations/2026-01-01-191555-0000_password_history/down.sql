-- This file should undo anything in `up.sql`
drop table if exists password_history;
drop index if exists idx_user_id;
