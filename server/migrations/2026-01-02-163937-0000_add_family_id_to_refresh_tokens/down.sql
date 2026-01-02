-- Revert family_id addition
drop index if exists idx_refresh_tokens_family_id;

alter table refresh_tokens drop column family_id;
