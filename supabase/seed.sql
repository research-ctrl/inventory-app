-- Seed data for development
-- Run: supabase db reset

-- Default roles
INSERT INTO public.profiles (id, email, full_name, role, department)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@shipyard.com', 'System Admin', 'admin', 'IT'),
  ('00000000-0000-0000-0000-000000000002', 'procmgr@shipyard.com', 'Proc Manager', 'procurement_manager', 'Procurement'),
  ('00000000-0000-0000-0000-000000000003', 'storekeeper@shipyard.com', 'Store Keeper', 'store_keeper', 'Stores')
ON CONFLICT (id) DO NOTHING;
