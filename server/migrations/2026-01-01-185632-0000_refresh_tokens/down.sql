-- Revert refresh_tokens table
drop index if exists idx_refresh_tokens_user_id;
drop index if exists idx_refresh_tokens_expires_at;
drop table if exists refresh_tokens;
