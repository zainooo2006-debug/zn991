CREATE TABLE IF NOT EXISTS public.test_connection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);
