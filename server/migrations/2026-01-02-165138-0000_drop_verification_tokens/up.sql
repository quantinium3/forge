-- Drop verification_tokens table (not needed for self-hosted without email)
drop index if exists idx_verification_tokens_user_id;
drop table if exists verification_tokens;
drop type if exists verification_token_type;
