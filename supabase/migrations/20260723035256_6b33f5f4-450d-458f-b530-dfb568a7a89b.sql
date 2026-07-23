GRANT EXECUTE ON FUNCTION public.get_user_branch(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.compute_expiry_date(date, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;