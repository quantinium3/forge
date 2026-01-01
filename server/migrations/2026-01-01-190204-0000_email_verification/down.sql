-- This file should undo anything in `up.sql`
drop table if exists email_verification;
drop type if exists token_type;
drop index if exists idx_token_hash;
drop index if exists idx_user_id;
