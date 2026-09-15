-- Trial credits are claimed by the authenticated server route using the
-- service role. Keep the SECURITY DEFINER helper out of the public client API.
revoke execute on function public.claim_trial_lead_unlock(uuid, uuid) from authenticated;
grant execute on function public.claim_trial_lead_unlock(uuid, uuid) to service_role;
