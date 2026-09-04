CREATE OR REPLACE FUNCTION public.warranties_enforce_customer_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'branch_staff'::app_role)
  ) THEN
    NEW.status := 'pending'::warranty_status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TABLE public.car_makes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.car_makes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_makes TO authenticated;
GRANT ALL ON public.car_makes TO service_role;

ALTER TABLE public.car_makes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "car_makes_public_read" ON public.car_makes FOR SELECT USING (true);
CREATE POLICY "car_makes_admin_write" ON public.car_makes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER trg_car_makes_updated BEFORE UPDATE ON public.car_makes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.car_makes (name, sort_order) VALUES
  ('تويوتا', 1), ('لكزس', 2), ('مرسيدس', 3), ('نيسان', 4), ('هيونداي', 5),
  ('كيا', 6), ('جي إم سي', 7), ('شيفروليه', 8), ('فورد', 9), ('لاند كروزر', 10),
  ('لاند روفر', 11), ('أودي', 12), ('هوندا', 13), ('مازدا', 14), ('ميتسوبيشي', 15),
  ('إنفينيتي', 16), ('بورش', 17), ('أخرى', 99);

UPDATE public.cars SET brand_id = NULL WHERE brand_id IS NOT NULL;
ALTER TABLE public.cars DROP CONSTRAINT IF EXISTS cars_brand_id_fkey;
ALTER TABLE public.cars ADD CONSTRAINT cars_brand_id_fkey
  FOREIGN KEY (brand_id) REFERENCES public.car_makes(id) ON DELETE SET NULL;