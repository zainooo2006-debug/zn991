-- Only the caller's own identity may be inspected through these helpers.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role'
     AND auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_branch(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role'
     AND auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT branch_id FROM public.user_roles WHERE user_id = _user_id AND role = 'branch_staff' LIMIT 1);
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_branch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compute_expiry_date(date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_branch(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_expiry_date(date, integer) TO authenticated, service_role;