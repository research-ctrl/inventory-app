-- ─── 013: Bootstrap admin + auto-create profiles on signup ────────────────────
-- 1. Trigger to auto-insert a profile row whenever a new auth user is created.
-- 2. Bootstrap myron@bennetandbernard.com as super_admin.
--
-- Run this in the Supabase SQL editor OR via: supabase db push


-- ── 1. Auto-create profile on auth signup ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      CASE
        WHEN (NEW.raw_user_meta_data->>'role') IS NOT NULL
          THEN (NEW.raw_user_meta_data->>'role')::public.user_role
      END,
      'viewer'::public.user_role
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 2. Bootstrap myron@bennetandbernard.com as super_admin ────────────────────

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'myron@bennetandbernard.com';

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, role)
    VALUES (v_user_id, 'myron@bennetandbernard.com', 'super_admin'::public.user_role)
    ON CONFLICT (id) DO UPDATE
      SET role = 'super_admin'::public.user_role;

    RAISE NOTICE 'Bootstrap: myron@bennetandbernard.com promoted to super_admin (id: %)', v_user_id;
  ELSE
    RAISE NOTICE 'Bootstrap: myron@bennetandbernard.com not found in auth.users — sign up first then re-run.';
  END IF;
END;
$$;
