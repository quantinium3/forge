-- Add family_id for token rotation tracking
alter table refresh_tokens add column family_id uuid not null;

create index idx_refresh_tokens_family_id on refresh_tokens (family_id);
