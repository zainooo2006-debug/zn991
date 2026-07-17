
-- Lock down SECURITY DEFINER functions from direct anon/authenticated execution.
REVOKE EXECUTE ON FUNCTION public.get_user_branch(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_warranty_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.warranties_enforce_customer_pending() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_warranty_public(text) FROM PUBLIC, anon, authenticated;

-- has_role is called by RLS policies as the querying role; authenticated must retain EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Ensure service_role still has access for server-side calls.
GRANT EXECUTE ON FUNCTION public.get_user_branch(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_warranty_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.warranties_enforce_customer_pending() TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_warranty_public(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
