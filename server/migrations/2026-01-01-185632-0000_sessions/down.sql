-- This file should undo anything in `up.sql`
drop table if exists sessions;
drop index if exists idx_user_id;
drop index if exists idx_token_hash;
drop index if exists idx_expires_at;
