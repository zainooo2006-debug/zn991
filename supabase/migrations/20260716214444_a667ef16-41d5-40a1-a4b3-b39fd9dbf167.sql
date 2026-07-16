DROP POLICY IF EXISTS "customers update own cars" ON public.cars;
CREATE POLICY "customers update own cars"
ON public.cars
FOR UPDATE
TO authenticated
USING (
  (customer_id IN (SELECT customers.id FROM public.customers WHERE customers.user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (customer_id IN (SELECT customers.id FROM public.customers WHERE customers.user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);