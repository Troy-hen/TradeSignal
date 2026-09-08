-- Closes the last uncovered item from plan section 17's audit_logs
-- checklist ("territory claimed/cancelled, subscription changed, admin
-- role grants" — the first two are now covered by
-- lib/stripe/webhook-handlers.ts and reserve_territory()). There is no
-- in-app mechanism to grant admin_users at all by design (MVP scope has
-- no admin-invite UI — the first grant necessarily happens via direct SQL
-- by whoever has project access), so an application-level audit_logs
-- insert would never actually run for the one action this line item
-- names. A trigger is the only way to guarantee it's logged regardless of
-- how the row got there — dashboard table editor, SQL editor, or a future
-- admin-invite RPC.
create or replace function public.trg_log_admin_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, after_state)
    values ('admin', new.granted_by, 'admin.role_granted', 'admin_user', new.profile_id, to_jsonb(new));
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (actor_type, actor_id, action, entity_type, entity_id, before_state)
    values ('admin', (select auth.uid()), 'admin.role_revoked', 'admin_user', old.profile_id, to_jsonb(old));
  end if;
  return null;
end;
$$;

drop trigger if exists trg_audit_admin_grant on public.admin_users;
create trigger trg_audit_admin_grant
  after insert or delete on public.admin_users
  for each row execute function public.trg_log_admin_grant();

-- Trigger-only, not public API surface (same pattern as every other trg_*
-- function closed off in the security_hardening migration).
revoke execute on function public.trg_log_admin_grant() from public, anon, authenticated;
