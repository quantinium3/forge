-- Restore email_verified column
alter table users add column email_verified boolean not null default false;
