-- Add FB Approved flag to tickets
alter table tickets add column if not exists fb_approved boolean not null default false;
