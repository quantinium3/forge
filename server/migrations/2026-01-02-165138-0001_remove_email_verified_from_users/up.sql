-- Remove email_verified column (not needed for self-hosted without email verification)
alter table users drop column email_verified;
