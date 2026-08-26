REVOKE EXECUTE ON FUNCTION public.generate_warranty_number(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_warranty_number(uuid) TO service_role;