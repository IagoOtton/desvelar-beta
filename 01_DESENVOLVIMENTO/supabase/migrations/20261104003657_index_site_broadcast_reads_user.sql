-- Supports account cleanup and user-centric read-state lookups.
create index if not exists site_broadcast_reads_user_id_idx
  on private.site_broadcast_reads (user_id);
