-- ============================================================
-- seed.sql — Shipyard Material Lifecycle System
-- Demo data for development and testing
-- Run: supabase db reset  (applies migrations then this file)
-- ============================================================
--
-- UUID legend
--   Profiles
--     00000000-0000-0000-0000-000000000001  admin@smls.com          super_admin
--     00000000-0000-0000-0000-000000000002  john.procurement@smls.com  procurement_manager
--     00000000-0000-0000-0000-000000000003  mary.officer@smls.com   procurement_officer
--     00000000-0000-0000-0000-000000000004  sam.stores@smls.com     store_manager
--     00000000-0000-0000-0000-000000000005  tony.keeper@smls.com    store_keeper
--     00000000-0000-0000-0000-000000000006  qc.alice@smls.com       qc_inspector
--     00000000-0000-0000-0000-000000000007  eng.bob@smls.com        engineer
--     00000000-0000-0000-0000-000000000008  finance.carol@smls.com  finance
--   Vessels
--     00000000-0000-0000-0000-000000000011  MV Pacific Star
--     00000000-0000-0000-0000-000000000012  MV Harbor Queen
--     00000000-0000-0000-0000-000000000013  MV Coastal Pride
--   Departments
--     00000000-0000-0000-0000-000000000021  MAINT
--     00000000-0000-0000-0000-000000000022  ENG
--     00000000-0000-0000-0000-000000000023  OPS
--     00000000-0000-0000-0000-000000000024  PROC
--   Store Locations
--     00000000-0000-0000-0000-000000000031  WH-A-01
--     00000000-0000-0000-0000-000000000032  WH-A-02
--     00000000-0000-0000-0000-000000000033  WH-B-01
--     00000000-0000-0000-0000-000000000034  YS-01
--     00000000-0000-0000-0000-000000000035  COLD-01
--     00000000-0000-0000-0000-000000000036  QHOLD-01
--   Vendors
--     00000000-0000-0000-0000-000000000041  VEN-001  Marine Parts Ltd
--     00000000-0000-0000-0000-000000000042  VEN-002  ElecSea Supplies
--     00000000-0000-0000-0000-000000000043  VEN-003  FastShip Hardware
--     00000000-0000-0000-0000-000000000044  VEN-004  PaintPro Marine
--     00000000-0000-0000-0000-000000000045  VEN-005  SafetyFirst Marine
--   Requirements
--     00000000-0000-0000-0000-000000000051  REQ-000001
--     00000000-0000-0000-0000-000000000052  REQ-000002
--     00000000-0000-0000-0000-000000000053  REQ-000003
--     00000000-0000-0000-0000-000000000054  REQ-000004
--     00000000-0000-0000-0000-000000000055  REQ-000005
--   Requirement Items
--     00000000-0000-0000-0000-000000000061 .. 000000000073
--   Purchase Orders
--     00000000-0000-0000-0000-000000000081  PO-000001
--     00000000-0000-0000-0000-000000000082  PO-000002
--     00000000-0000-0000-0000-000000000083  PO-000003
--   PO Items
--     00000000-0000-0000-0000-000000000091 .. 000000000098
--   Deliveries
--     00000000-0000-0000-0000-0000000000a1  DLV-000001
--     00000000-0000-0000-0000-0000000000a2  DLV-000002
--     00000000-0000-0000-0000-0000000000a3  DLV-000003
--     00000000-0000-0000-0000-0000000000a4  DLV-000004
--   Delivery Items
--     00000000-0000-0000-0000-0000000000b1 .. 0000000000ba
--   QC Inspections
--     00000000-0000-0000-0000-0000000000c1  QCI-000001
--     00000000-0000-0000-0000-0000000000c2  QCI-000002
--     00000000-0000-0000-0000-0000000000c3  QCI-000003
--   QC Defects
--     00000000-0000-0000-0000-0000000000d1
--     00000000-0000-0000-0000-0000000000d2
--   Inventory PINs
--     00000000-0000-0000-0000-0000000000e1  PIN-000001
--     00000000-0000-0000-0000-0000000000e2  PIN-000002
--     00000000-0000-0000-0000-0000000000e3  PIN-000003
--     00000000-0000-0000-0000-0000000000e4  PIN-000004
--     00000000-0000-0000-0000-0000000000e5  PIN-000005
--     00000000-0000-0000-0000-0000000000e6  PIN-000006
--   Inventory Transactions
--     00000000-0000-0000-0000-0000000000f1 .. 0000000000fc
--   Material Issues
--     00000000-0000-0000-0000-000000000101  ISS-000001
--     00000000-0000-0000-0000-000000000102  ISS-000002
--     00000000-0000-0000-0000-000000000103  ISS-000003
--     00000000-0000-0000-0000-000000000104  ISS-000004
--   Recoveries
--     00000000-0000-0000-0000-000000000111  REC-000001
--     00000000-0000-0000-0000-000000000112  REC-000002
--   Workflow History
--     00000000-0000-0000-0000-000000000121 .. 000000000129
-- ============================================================

-- ============================================================
-- 1. PROFILES
--    auth.users rows are managed by Supabase Auth; we insert
--    profile rows with ON CONFLICT DO NOTHING so this is safe
--    both on a fresh DB and on re-run.
-- ============================================================

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'john.procurement@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mary.officer@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sam.stores@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tony.keeper@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qc.alice@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eng.bob@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'finance.carol@smls.com', crypt('password123', gen_salt('bf')), now(), '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role, department, employee_id, phone, is_active, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@smls.com',             'System Administrator',  'super_admin',           'IT',          'EMP-001', '+1-555-0101', true, '2024-01-15 08:00:00+00', '2024-01-15 08:00:00+00'),
  ('00000000-0000-0000-0000-000000000002', 'john.procurement@smls.com',  'John Whitfield',         'procurement_manager',   'Procurement', 'EMP-002', '+1-555-0102', true, '2024-01-15 08:05:00+00', '2024-01-15 08:05:00+00'),
  ('00000000-0000-0000-0000-000000000003', 'mary.officer@smls.com',      'Mary Santos',            'procurement_officer',   'Procurement', 'EMP-003', '+1-555-0103', true, '2024-01-15 08:10:00+00', '2024-01-15 08:10:00+00'),
  ('00000000-0000-0000-0000-000000000004', 'sam.stores@smls.com',        'Samuel Okafor',          'store_manager',         'Stores',      'EMP-004', '+1-555-0104', true, '2024-01-15 08:15:00+00', '2024-01-15 08:15:00+00'),
  ('00000000-0000-0000-0000-000000000005', 'tony.keeper@smls.com',       'Tony Reyes',             'store_keeper',          'Stores',      'EMP-005', '+1-555-0105', true, '2024-01-15 08:20:00+00', '2024-01-15 08:20:00+00'),
  ('00000000-0000-0000-0000-000000000006', 'qc.alice@smls.com',          'Alice Thornton',         'qc_inspector',          'Quality',     'EMP-006', '+1-555-0106', true, '2024-01-15 08:25:00+00', '2024-01-15 08:25:00+00'),
  ('00000000-0000-0000-0000-000000000007', 'eng.bob@smls.com',           'Bob Nakamura',           'engineer',              'Engineering', 'EMP-007', '+1-555-0107', true, '2024-01-15 08:30:00+00', '2024-01-15 08:30:00+00'),
  ('00000000-0000-0000-0000-000000000008', 'finance.carol@smls.com',     'Carol Mbeki',            'finance',               'Finance',     'EMP-008', '+1-555-0108', true, '2024-01-15 08:35:00+00', '2024-01-15 08:35:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. VESSELS
-- ============================================================

INSERT INTO public.vessels (id, name, imo_number, vessel_type, flag, owner, is_active, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000011', 'MV Pacific Star',   '9123456', 'Bulk Carrier',    'Panama',   'Pacific Star Shipping Co.',   true, '2024-01-15 09:00:00+00', '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000012', 'MV Harbor Queen',   '9234567', 'Container Ship',  'Marshall Islands', 'Harbor Lines Ltd.',  true, '2024-01-15 09:05:00+00', '2024-01-15 09:05:00+00'),
  ('00000000-0000-0000-0000-000000000013', 'MV Coastal Pride',  '9345678', 'Tanker',          'Liberia',  'Coastal Tankers Inc.',        true, '2024-01-15 09:10:00+00', '2024-01-15 09:10:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. DEPARTMENTS
--    head_id set after profiles exist
-- ============================================================

INSERT INTO public.departments (id, code, name, head_id, is_active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000021', 'MAINT', 'Maintenance',  '00000000-0000-0000-0000-000000000007', true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000022', 'ENG',   'Engineering',  '00000000-0000-0000-0000-000000000007', true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000023', 'OPS',   'Operations',   '00000000-0000-0000-0000-000000000001', true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000024', 'PROC',  'Procurement',  '00000000-0000-0000-0000-000000000002', true, '2024-01-15 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. SEQ_COUNTERS — set initial values so that triggers will
--    not re-use sequence numbers that match seeded ref_numbers.
--    We set last_val BEFORE inserting records that carry
--    explicit ref_numbers, then leave the sequence at the
--    highest value used.
-- ============================================================

-- Reset to 0 first so the subsequent UPDATE is idempotent on re-run
UPDATE public.seq_counters SET last_val = 0 WHERE entity_type IN
  ('requirement', 'purchase_order', 'delivery', 'issue', 'recovery', 'qc_inspection');

-- ============================================================
-- 5. STORE LOCATIONS
-- ============================================================

INSERT INTO public.store_locations (id, code, name, warehouse, zone, aisle, rack, bin, capacity_kg, is_active, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000031', 'WH-A-01',  'Zone A / Aisle 1 / Rack 01', 'Main Warehouse', 'A', 'Aisle 1', 'Rack 01', NULL,  5000.00, true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000032', 'WH-A-02',  'Zone A / Aisle 2 / Rack 01', 'Main Warehouse', 'A', 'Aisle 2', 'Rack 01', NULL,  5000.00, true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000033', 'WH-B-01',  'Zone B / Aisle 1 / Rack 01', 'Main Warehouse', 'B', 'Aisle 1', 'Rack 01', NULL,  8000.00, true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000034', 'YS-01',    'Zone Y',                      'Yard Store',     'Y', NULL,      NULL,      NULL, 20000.00, true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000035', 'COLD-01',  'Zone C',                      'Cold Store',     'C', NULL,      NULL,      NULL,  2000.00, true, '2024-01-15 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000036', 'QHOLD-01', 'Zone Q',                      'QC Hold Area',   'Q', NULL,      NULL,      NULL,  3000.00, true, '2024-01-15 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. VENDORS
-- ============================================================

INSERT INTO public.vendors (id, code, name, email, phone, city, country, category, rating, payment_terms_days, currency, is_approved, approved_by, approved_at, notes, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000041', 'VEN-001', 'Marine Parts Ltd',     'sales@marineparts.com',     '+44-20-7123-4001', 'London',    'United Kingdom', 'mechanical', 4.5, 30, 'USD', true,  '00000000-0000-0000-0000-000000000002', '2024-02-01 10:00:00+00', 'Preferred supplier for engine spares',    '2024-01-20 10:00:00+00', '2024-02-01 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000042', 'VEN-002', 'ElecSea Supplies',     'orders@elecsea.com',        '+65-6234-5002',   'Singapore', 'Singapore',      'electrical', 4.2, 45, 'USD', true,  '00000000-0000-0000-0000-000000000002', '2024-02-03 10:00:00+00', 'Approved for electrical components',      '2024-01-22 10:00:00+00', '2024-02-03 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000043', 'VEN-003', 'FastShip Hardware',    'supply@fastshiphw.com',     '+1-713-555-5003',  'Houston',   'USA',            'hardware',   3.8, 30, 'USD', true,  '00000000-0000-0000-0000-000000000002', '2024-02-05 10:00:00+00', 'Deck and hull hardware',                  '2024-01-25 10:00:00+00', '2024-02-05 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000044', 'VEN-004', 'PaintPro Marine',      'sales@paintpromarine.com',  '+31-10-555-5004',  'Rotterdam', 'Netherlands',    'paint',      4.0, 60, 'USD', true,  '00000000-0000-0000-0000-000000000002', '2024-02-07 10:00:00+00', 'Anti-fouling and hull paints',            '2024-01-28 10:00:00+00', '2024-02-07 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000045', 'VEN-005', 'SafetyFirst Marine',   'info@safetyfirstmarine.com','+60-3-555-5005',   'Kuala Lumpur','Malaysia',      'safety',     0.0, 30, 'USD', false, NULL,                                    NULL,                     'Pending qualification audit',             '2024-03-01 10:00:00+00', '2024-03-01 10:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. REQUIREMENTS
--    We provide explicit ref_numbers to match the legend.
--    The trigger only fires when ref_number is '' or NULL,
--    so supplying a value bypasses the sequence — that is
--    intentional for seed data. We sync seq_counters after.
-- ============================================================

INSERT INTO public.requirements (
  id, ref_number, title, description,
  vessel_id, department_id, requested_by,
  urgency, status, required_date, budget_estimate, currency,
  approved_by, approved_at, created_at, updated_at
)
VALUES
  -- REQ-000001: closed, critical — engine spares for Pacific Star
  (
    '00000000-0000-0000-0000-000000000051',
    'REQ-000001',
    'Main Engine Spare Parts',
    'Replacement seals, bearings, and pump assembly for main engine overhaul during scheduled dry-dock.',
    '00000000-0000-0000-0000-000000000011',   -- Pacific Star
    '00000000-0000-0000-0000-000000000021',   -- MAINT
    '00000000-0000-0000-0000-000000000007',   -- eng.bob
    'critical', 'closed',
    '2024-11-30',
    48000.00, 'USD',
    '00000000-0000-0000-0000-000000000002',   -- john.procurement
    '2024-10-05 14:00:00+00',
    '2024-10-01 09:00:00+00', '2024-12-20 16:00:00+00'
  ),
  -- REQ-000002: approved, urgent — electrical cables for Harbor Queen
  (
    '00000000-0000-0000-0000-000000000052',
    'REQ-000002',
    'Electrical Cable Replacement',
    'Replace aging 50 m power cables in engine room; cables showing insulation degradation.',
    '00000000-0000-0000-0000-000000000012',   -- Harbor Queen
    '00000000-0000-0000-0000-000000000022',   -- ENG
    '00000000-0000-0000-0000-000000000007',   -- eng.bob
    'urgent', 'approved',
    '2025-01-15',
    13000.00, 'USD',
    '00000000-0000-0000-0000-000000000002',
    '2024-11-12 11:00:00+00',
    '2024-11-10 10:00:00+00', '2024-11-12 11:00:00+00'
  ),
  -- REQ-000003: pending_approval, routine — hull paint for Coastal Pride
  (
    '00000000-0000-0000-0000-000000000053',
    'REQ-000003',
    'Hull Paint Supplies',
    'Anti-fouling and topside paint for Coastal Pride next dry-dock. Two colours required.',
    '00000000-0000-0000-0000-000000000013',   -- Coastal Pride
    '00000000-0000-0000-0000-000000000021',   -- MAINT
    '00000000-0000-0000-0000-000000000003',   -- mary.officer
    'routine', 'pending_approval',
    '2025-03-01',
    8500.00, 'USD',
    NULL, NULL,
    '2025-01-08 09:30:00+00', '2025-01-08 09:30:00+00'
  ),
  -- REQ-000004: draft, urgent — safety equipment for Pacific Star
  (
    '00000000-0000-0000-0000-000000000054',
    'REQ-000004',
    'Safety Equipment Renewal',
    'Life jackets, fire extinguishers, and safety harnesses due for 5-year renewal per SOLAS requirements.',
    '00000000-0000-0000-0000-000000000011',   -- Pacific Star
    '00000000-0000-0000-0000-000000000023',   -- OPS
    '00000000-0000-0000-0000-000000000007',   -- eng.bob
    'urgent', 'draft',
    '2025-02-28',
    15000.00, 'USD',
    NULL, NULL,
    '2025-01-10 11:00:00+00', '2025-01-10 11:00:00+00'
  ),
  -- REQ-000005: in_progress, routine — deck hardware for Harbor Queen
  (
    '00000000-0000-0000-0000-000000000055',
    'REQ-000005',
    'Deck Hardware Fittings',
    'Assorted deck hardware including cleats, fairleads, and securing bolts for cargo hold maintenance.',
    '00000000-0000-0000-0000-000000000012',   -- Harbor Queen
    '00000000-0000-0000-0000-000000000021',   -- MAINT
    '00000000-0000-0000-0000-000000000003',   -- mary.officer
    'routine', 'in_progress',
    '2025-02-14',
    3500.00, 'USD',
    '00000000-0000-0000-0000-000000000002',
    '2025-01-07 09:00:00+00',
    '2025-01-05 14:00:00+00', '2025-01-07 09:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. REQUIREMENT ITEMS
-- ============================================================

INSERT INTO public.requirement_items (id, requirement_id, line_number, description, part_number, quantity, unit, estimated_unit_price, currency, specifications, notes, created_at)
VALUES
  -- REQ-000001 items
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000051', 1,
   'Main Engine Pump Seal Kit', 'ME-SEAL-4710', 10, 'EA', 350.00, 'USD',
   'OEM compatible, high-temperature nitrile rubber, 180mm OD', 'Confirm OEM part compatibility before ordering', '2024-10-01 09:10:00+00'),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000051', 2,
   'Bearing Assembly 6205 ZZ', 'BRG-6205-ZZ', 20, 'EA', 85.00, 'USD',
   'Deep groove ball bearing, 25x52x15mm, double shielded', NULL, '2024-10-01 09:12:00+00'),
  ('00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000051', 3,
   'Fuel Pump Gasket Set', 'FP-GSKT-220', 5, 'SET', 420.00, 'USD',
   'High-pressure rated, PTFE coated, includes all gaskets for one pump overhaul', NULL, '2024-10-01 09:14:00+00'),

  -- REQ-000002 items
  ('00000000-0000-0000-0000-000000000064', '00000000-0000-0000-0000-000000000052', 1,
   'Electrical Cable 4-Core 50m', 'ELEC-CAB-4C-50', 4, 'ROLL', 1800.00, 'USD',
   '4-core 35mm² armoured marine cable, 600/1000V, XLPE insulated', 'Must meet IEC 60092 standard', '2024-11-10 10:10:00+00'),
  ('00000000-0000-0000-0000-000000000065', '00000000-0000-0000-0000-000000000052', 2,
   'Cable Gland M32 Brass', 'CGLAND-M32-BR', 20, 'EA', 28.50, 'USD',
   'Nickel-plated brass, IP68 rated, M32 thread', NULL, '2024-11-10 10:12:00+00'),
  ('00000000-0000-0000-0000-000000000066', '00000000-0000-0000-0000-000000000052', 3,
   'Cable Tie 300mm Nylon Black', 'CTIE-300-BLK', 500, 'EA', 0.25, 'USD',
   'UV stabilised, 18kg tensile, marine grade', NULL, '2024-11-10 10:14:00+00'),

  -- REQ-000003 items
  ('00000000-0000-0000-0000-000000000067', '00000000-0000-0000-0000-000000000053', 1,
   'Anti-Fouling Paint Red 20L', 'PAINT-AF-RED-20', 15, 'EA', 210.00, 'USD',
   'Self-polishing copolymer, 24 months underwater protection', NULL, '2025-01-08 09:35:00+00'),
  ('00000000-0000-0000-0000-000000000068', '00000000-0000-0000-0000-000000000053', 2,
   'Topside Enamel White 5L', 'PAINT-TS-WHT-5', 20, 'EA', 95.00, 'USD',
   'High-gloss alkyd enamel, UV resistant, 2-coat system', NULL, '2025-01-08 09:37:00+00'),

  -- REQ-000004 items
  ('00000000-0000-0000-0000-000000000069', '00000000-0000-0000-0000-000000000054', 1,
   'Safety Harness Type-A Full Body', 'SAF-HAR-TYP-A', 10, 'EA', 185.00, 'USD',
   'EN 361 compliant, polyester webbing, stainless steel hardware', 'SOLAS compliant', '2025-01-10 11:10:00+00'),
  ('00000000-0000-0000-0000-000000000070', '00000000-0000-0000-0000-000000000054', 2,
   'CO2 Fire Extinguisher 9kg', 'FIRE-EXT-CO2-9', 8, 'EA', 320.00, 'USD',
   'Marine type, BSI certified, with bracket', NULL, '2025-01-10 11:12:00+00'),
  ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000054', 3,
   'Life Jacket SOLAS Approved', 'LIFE-JKT-SOLAS', 20, 'EA', 155.00, 'USD',
   'SOLAS 74/83 compliant, 150N buoyancy, retroreflective tape', NULL, '2025-01-10 11:14:00+00'),

  -- REQ-000005 items
  ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000055', 1,
   'Mooring Cleat 250mm SS316', 'CLEAT-250-SS316', 12, 'EA', 85.00, 'USD',
   'Stainless steel 316, 250mm length, through-bolt mounting', NULL, '2025-01-05 14:10:00+00'),
  ('00000000-0000-0000-0000-000000000073', '00000000-0000-0000-0000-000000000055', 2,
   'Fairlead Roller M20 Galv', 'FAIR-ROL-M20-GA', 8, 'EA', 145.00, 'USD',
   'Hot-dip galvanised, M20 bolts, 4-roller pattern', NULL, '2025-01-05 14:12:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. PURCHASE ORDERS
-- ============================================================

INSERT INTO public.purchase_orders (
  id, po_number, requirement_id, vendor_id,
  status, payment_terms, delivery_address, incoterms,
  total_amount, tax_amount, discount_amount, currency,
  expected_delivery, actual_delivery,
  approved_by, approved_at, ordered_by, ordered_at,
  created_by, notes, created_at, updated_at
)
VALUES
  -- PO-000001: closed, linked to REQ-000001
  (
    '00000000-0000-0000-0000-000000000081',
    'PO-000001',
    '00000000-0000-0000-0000-000000000051',   -- REQ-000001
    '00000000-0000-0000-0000-000000000041',   -- Marine Parts Ltd
    'closed',
    'Net 30',
    'SMLS Receiving Dock, Berth 7, Main Shipyard',
    'DDP',
    45000.00, 0.00, 0.00, 'USD',
    '2024-11-15',
    '2024-11-20',
    '00000000-0000-0000-0000-000000000002',   -- john.procurement
    '2024-10-10 09:00:00+00',
    '00000000-0000-0000-0000-000000000002',
    '2024-10-12 11:00:00+00',
    '00000000-0000-0000-0000-000000000003',   -- mary.officer
    'Split delivery accepted. Urgency item — expedite bearing assembly.',
    '2024-10-08 14:00:00+00', '2024-12-20 16:00:00+00'
  ),
  -- PO-000002: ordered, linked to REQ-000002
  (
    '00000000-0000-0000-0000-000000000082',
    'PO-000002',
    '00000000-0000-0000-0000-000000000052',   -- REQ-000002
    '00000000-0000-0000-0000-000000000042',   -- ElecSea Supplies
    'ordered',
    'Net 45',
    'SMLS Receiving Dock, Berth 7, Main Shipyard',
    'CIF',
    12500.00, 0.00, 0.00, 'USD',
    '2025-01-10',
    NULL,
    '00000000-0000-0000-0000-000000000002',
    '2024-11-15 10:00:00+00',
    '00000000-0000-0000-0000-000000000002',
    '2024-11-16 09:00:00+00',
    '00000000-0000-0000-0000-000000000003',
    'Partial delivery expected first week of January.',
    '2024-11-14 15:00:00+00', '2024-11-16 09:00:00+00'
  ),
  -- PO-000003: approved, linked to REQ-000005
  (
    '00000000-0000-0000-0000-000000000083',
    'PO-000003',
    '00000000-0000-0000-0000-000000000055',   -- REQ-000005
    '00000000-0000-0000-0000-000000000043',   -- FastShip Hardware
    'approved',
    'Net 30',
    'SMLS Receiving Dock, Berth 7, Main Shipyard',
    'FOB',
    3200.00, 0.00, 0.00, 'USD',
    '2025-02-10',
    NULL,
    '00000000-0000-0000-0000-000000000002',
    '2025-01-09 11:00:00+00',
    NULL, NULL,
    '00000000-0000-0000-0000-000000000003',
    NULL,
    '2025-01-08 16:00:00+00', '2025-01-09 11:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. PO ITEMS
--     Note: line_total is a GENERATED column; do not insert it.
--     quantity_received tracks partial receipt progress.
-- ============================================================

INSERT INTO public.po_items (id, po_id, line_number, description, part_number, quantity, unit, unit_price, currency, quantity_received, notes, created_at, updated_at)
VALUES
  -- PO-000001 items (engine spares)
  ('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000081', 1,
   'Main Engine Pump Seal Kit', 'ME-SEAL-4710',
   10, 'EA', 3500.0000, 'USD', 10, NULL, '2024-10-08 14:10:00+00', '2024-11-25 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000081', 2,
   'Bearing Assembly 6205 ZZ', 'BRG-6205-ZZ',
   20, 'EA', 850.0000, 'USD', 20, 'Expedited per procurement note', '2024-10-08 14:12:00+00', '2024-11-25 10:00:00+00'),
  ('00000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-000000000081', 3,
   'Fuel Pump Gasket Set', 'FP-GSKT-220',
   5, 'SET', 2100.0000, 'USD', 5, NULL, '2024-10-08 14:14:00+00', '2024-11-25 10:00:00+00'),

  -- PO-000002 items (electrical)
  ('00000000-0000-0000-0000-000000000094', '00000000-0000-0000-0000-000000000082', 1,
   'Electrical Cable 4-Core 50m', 'ELEC-CAB-4C-50',
   4, 'ROLL', 2500.0000, 'USD', 2, NULL, '2024-11-14 15:10:00+00', '2025-01-06 09:00:00+00'),
  ('00000000-0000-0000-0000-000000000095', '00000000-0000-0000-0000-000000000082', 2,
   'Cable Gland M32 Brass', 'CGLAND-M32-BR',
   20, 'EA', 32.5000, 'USD', 0, NULL, '2024-11-14 15:12:00+00', '2024-11-14 15:12:00+00'),
  ('00000000-0000-0000-0000-000000000096', '00000000-0000-0000-0000-000000000082', 3,
   'Cable Tie 300mm Nylon Black', 'CTIE-300-BLK',
   500, 'EA', 0.3000, 'USD', 0, NULL, '2024-11-14 15:14:00+00', '2024-11-14 15:14:00+00'),

  -- PO-000003 items (deck hardware)
  ('00000000-0000-0000-0000-000000000097', '00000000-0000-0000-0000-000000000083', 1,
   'Mooring Cleat 250mm SS316', 'CLEAT-250-SS316',
   12, 'EA', 195.0000, 'USD', 0, NULL, '2025-01-08 16:10:00+00', '2025-01-08 16:10:00+00'),
  ('00000000-0000-0000-0000-000000000098', '00000000-0000-0000-0000-000000000083', 2,
   'Fairlead Roller M20 Galv', 'FAIR-ROL-M20-GA',
   8, 'EA', 212.5000, 'USD', 0, NULL, '2025-01-08 16:12:00+00', '2025-01-08 16:12:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. DELIVERIES
-- ============================================================

INSERT INTO public.deliveries (
  id, delivery_ref, po_id, status,
  supplier_delivery_note, tracking_number, carrier,
  expected_date, actual_received_date, received_by,
  receiving_location_id, notes, created_at, updated_at
)
VALUES
  -- DLV-000001: first part-delivery of PO-000001, qc_passed
  (
    '00000000-0000-0000-0000-0000000000a1',
    'DLV-000001',
    '00000000-0000-0000-0000-000000000081',  -- PO-000001
    'qc_passed',
    'MPL-DN-20241120-001', 'TRACK-MPL-001', 'Marine Freight Ltd',
    '2024-11-20',
    '2024-11-20 08:30:00+00',
    '00000000-0000-0000-0000-000000000005', -- tony.keeper
    '00000000-0000-0000-0000-000000000031', -- WH-A-01
    'First partial delivery — seal kits and bearings only.',
    '2024-11-19 16:00:00+00', '2024-11-22 11:00:00+00'
  ),
  -- DLV-000002: second delivery of PO-000001, qc_conditional
  (
    '00000000-0000-0000-0000-0000000000a2',
    'DLV-000002',
    '00000000-0000-0000-0000-000000000081',  -- PO-000001
    'qc_conditional',
    'MPL-DN-20241125-002', 'TRACK-MPL-002', 'Marine Freight Ltd',
    '2024-11-25',
    '2024-11-25 09:00:00+00',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000036', -- QHOLD-01 (conditional hold)
    'Gasket sets — minor packaging damage noted on 2 of 5 sets; held pending QC review.',
    '2024-11-19 16:00:00+00', '2024-11-27 14:00:00+00'
  ),
  -- DLV-000003: partial delivery for PO-000002, received pending QC
  (
    '00000000-0000-0000-0000-0000000000a3',
    'DLV-000003',
    '00000000-0000-0000-0000-000000000082',  -- PO-000002
    'received',
    'ES-DN-20250105-003', 'TRACK-ES-003', 'SeaFreight Express',
    '2025-01-10',
    '2025-01-06 10:15:00+00',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000033', -- WH-B-01
    'Partial delivery — 2 of 4 cable rolls received. Remainder on backorder.',
    '2025-01-05 12:00:00+00', '2025-01-06 10:15:00+00'
  ),
  -- DLV-000004: delivery for PO-000003, pending_approval
  (
    '00000000-0000-0000-0000-0000000000a4',
    'DLV-000004',
    '00000000-0000-0000-0000-000000000083',  -- PO-000003
    'pending_approval',
    NULL, NULL, NULL,
    '2025-02-10',
    NULL, NULL,
    '00000000-0000-0000-0000-000000000031', -- WH-A-01
    'Expected delivery per vendor lead time of 30 days from PO approval.',
    '2025-01-09 11:30:00+00', '2025-01-09 11:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. DELIVERY ITEMS
-- ============================================================

INSERT INTO public.delivery_items (id, delivery_id, po_item_id, line_number, description, part_number, quantity_expected, quantity_received, unit, condition_notes, created_at, updated_at)
VALUES
  -- DLV-000001 items (seal kits + bearings — fully received)
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-000000000091', 1,
   'Main Engine Pump Seal Kit', 'ME-SEAL-4710',
   10, 10, 'EA', 'All 10 kits received in original sealed packaging, no damage.',
   '2024-11-20 08:35:00+00', '2024-11-20 08:35:00+00'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-000000000092', 2,
   'Bearing Assembly 6205 ZZ', 'BRG-6205-ZZ',
   20, 20, 'EA', '20 units received. Packaging intact.',
   '2024-11-20 08:37:00+00', '2024-11-20 08:37:00+00'),

  -- DLV-000002 items (gasket sets — received, minor damage)
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-000000000093', 1,
   'Fuel Pump Gasket Set', 'FP-GSKT-220',
   5, 5, 'SET', '5 sets received. 2 sets have damaged outer cartons; inner parts appear intact. Referred to QC.',
   '2024-11-25 09:05:00+00', '2024-11-25 09:05:00+00'),

  -- DLV-000003 items (cable rolls — partial)
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-000000000094', 1,
   'Electrical Cable 4-Core 50m', 'ELEC-CAB-4C-50',
   4, 2, 'ROLL', 'Only 2 of 4 rolls delivered. Labels correct. Drums in good condition.',
   '2025-01-06 10:20:00+00', '2025-01-06 10:20:00+00'),

  -- DLV-000004 items (deck hardware — not yet received)
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000a4',
   '00000000-0000-0000-0000-000000000097', 1,
   'Mooring Cleat 250mm SS316', 'CLEAT-250-SS316',
   12, 0, 'EA', NULL,
   '2025-01-09 11:35:00+00', '2025-01-09 11:35:00+00'),
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000a4',
   '00000000-0000-0000-0000-000000000098', 2,
   'Fairlead Roller M20 Galv', 'FAIR-ROL-M20-GA',
   8, 0, 'EA', NULL,
   '2025-01-09 11:37:00+00', '2025-01-09 11:37:00+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. QC INSPECTIONS
-- ============================================================

INSERT INTO public.qc_inspections (
  id, inspection_ref, delivery_id, delivery_item_id,
  inspector_id, result, status,
  inspection_date, pass_criteria, remarks,
  documents, created_at, updated_at
)
VALUES
  -- QCI-000001: DLV-000001 — full pass
  (
    '00000000-0000-0000-0000-0000000000c1',
    'QCI-000001',
    '00000000-0000-0000-0000-0000000000a1',  -- DLV-000001
    NULL,                                    -- covers full delivery
    '00000000-0000-0000-0000-000000000006',  -- qc.alice
    'pass', 'qc_passed',
    '2024-11-21 10:00:00+00',
    'All items must match PO specification. No visible damage. Certificates of conformance required.',
    'All 10 seal kits and 20 bearings verified against manufacturer certs. Dimensions spot-checked on 3 samples. Pass.',
    '[]',
    '2024-11-21 09:30:00+00', '2024-11-21 11:00:00+00'
  ),
  -- QCI-000002: DLV-000002 — conditional (packaging damage)
  (
    '00000000-0000-0000-0000-0000000000c2',
    'QCI-000002',
    '00000000-0000-0000-0000-0000000000a2',  -- DLV-000002
    NULL,
    '00000000-0000-0000-0000-000000000006',  -- qc.alice
    'conditional', 'qc_conditional',
    '2024-11-26 10:00:00+00',
    'Gaskets must be free of deformation. OEM packaging must be intact.',
    '2 of 5 gasket sets had damaged outer cartons. Inner foil seals intact on inspection. Accepted on deviation with note to inspect further at point of installation.',
    '[]',
    '2024-11-26 09:00:00+00', '2024-11-27 14:00:00+00'
  ),
  -- QCI-000003: DLV-000003 — pending inspection
  (
    '00000000-0000-0000-0000-0000000000c3',
    'QCI-000003',
    '00000000-0000-0000-0000-0000000000a3',  -- DLV-000003
    NULL,
    '00000000-0000-0000-0000-000000000006',
    NULL, 'qc_pending',
    NULL,
    'Cables must carry IEC 60092 test certificate. Drum labels must match PO part numbers.',
    NULL,
    '[]',
    '2025-01-06 11:00:00+00', '2025-01-06 11:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. QC DEFECTS (for QCI-000002 — conditional)
-- ============================================================

INSERT INTO public.qc_defects (id, inspection_id, defect_code, description, severity, quantity_affected, disposition, created_at)
VALUES
  (
    '00000000-0000-0000-0000-0000000000d1',
    '00000000-0000-0000-0000-0000000000c2',
    'DEF-PKG-001',
    'Outer cardboard cartons crushed; likely transit damage. Foil inner seals intact on visual inspection.',
    'minor',
    2,
    'accept_on_deviation',
    '2024-11-26 10:30:00+00'
  ),
  (
    '00000000-0000-0000-0000-0000000000d2',
    '00000000-0000-0000-0000-0000000000c2',
    'DEF-LABEL-001',
    'Batch codes on 2 gasket sets partially obscured by moisture damage to label. Supplier to provide replacement labels.',
    'minor',
    2,
    'accept_on_deviation',
    '2024-11-26 10:35:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 15. INVENTORY PINS
--     We provide explicit pin_number values; the trigger only
--     fires when pin_number is '' or NULL, so this bypasses
--     the sequence safely. We sync pin_seq after all inserts.
--
--     PIN-000005 (recovered pump seal) references REC-000001
--     which is inserted below in section 18. Because of the
--     FK on derived_from_recovery_id, we insert PIN-000005
--     without that FK first (NULL), then update it after
--     recoveries are inserted.
-- ============================================================

INSERT INTO public.inventory_pins (
  id, pin_number, description, part_number, category, unit,
  location_id, status, is_serialized, serial_number,
  min_stock_level, max_stock_level,
  parent_pin_id, derived_from_recovery_id,
  origin_type, origin_reference,
  created_at, updated_at
)
VALUES
  -- PIN-000001: Main Engine Pump Seal
  (
    '00000000-0000-0000-0000-0000000000e1',
    'PIN-000001',
    'Main Engine Pump Seal Kit', 'ME-SEAL-4710',
    'mechanical', 'EA',
    '00000000-0000-0000-0000-000000000031',  -- WH-A-01
    'approved', false, NULL,
    2, 20,
    NULL, NULL,
    'procurement', 'DLV-000001',
    '2024-11-22 09:00:00+00', '2024-11-22 09:00:00+00'
  ),
  -- PIN-000002: Electrical Cable 50m
  (
    '00000000-0000-0000-0000-0000000000e2',
    'PIN-000002',
    'Electrical Cable 4-Core 50m', 'ELEC-CAB-4C-50',
    'electrical', 'ROLL',
    '00000000-0000-0000-0000-000000000033',  -- WH-B-01
    'approved', false, NULL,
    1, 10,
    NULL, NULL,
    'procurement', 'DLV-000003',
    '2025-01-07 09:00:00+00', '2025-01-07 09:00:00+00'
  ),
  -- PIN-000003: Bearing Assembly 6205 ZZ
  (
    '00000000-0000-0000-0000-0000000000e3',
    'PIN-000003',
    'Bearing Assembly 6205 ZZ', 'BRG-6205-ZZ',
    'mechanical', 'EA',
    '00000000-0000-0000-0000-000000000032',  -- WH-A-02
    'approved', false, NULL,
    5, 50,
    NULL, NULL,
    'procurement', 'DLV-000001',
    '2024-11-22 09:15:00+00', '2024-11-22 09:15:00+00'
  ),
  -- PIN-000004: Hull Paint Anti-Fouling Red 20L
  (
    '00000000-0000-0000-0000-0000000000e4',
    'PIN-000004',
    'Anti-Fouling Paint Red 20L', 'PAINT-AF-RED-20',
    'paint', 'EA',
    '00000000-0000-0000-0000-000000000034',  -- YS-01
    'approved', false, NULL,
    5, 30,
    NULL, NULL,
    'opening_balance', NULL,
    '2024-09-01 08:00:00+00', '2024-09-01 08:00:00+00'
  ),
  -- PIN-000005: Refurbished Pump Seal (derived from recovery REC-000001)
  --  derived_from_recovery_id set to NULL here; updated after recoveries insert
  (
    '00000000-0000-0000-0000-0000000000e5',
    'PIN-000005',
    'Refurbished Main Engine Pump Seal Kit', 'ME-SEAL-4710-R',
    'mechanical', 'EA',
    '00000000-0000-0000-0000-000000000031',  -- WH-A-01
    'approved', false, NULL,
    0, 5,
    '00000000-0000-0000-0000-0000000000e1',  -- parent = PIN-000001
    NULL,                                    -- updated after recoveries insert
    'recovery', 'REC-000001',
    '2025-01-15 10:00:00+00', '2025-01-15 10:00:00+00'
  ),
  -- PIN-000006: Safety Harness Type-A
  (
    '00000000-0000-0000-0000-0000000000e6',
    'PIN-000006',
    'Safety Harness Type-A Full Body', 'SAF-HAR-TYP-A',
    'safety', 'EA',
    '00000000-0000-0000-0000-000000000031',  -- WH-A-01
    'approved', false, NULL,
    5, 20,
    NULL, NULL,
    'opening_balance', NULL,
    '2024-09-01 08:30:00+00', '2024-09-01 08:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Advance pin_seq past PIN-000006 so future inserts get PIN-000007+
SELECT setval('public.pin_seq', 6, true);

-- ============================================================
-- 16. INVENTORY TRANSACTIONS
--
--    Transactions are signed: positive = stock in, negative = stock out.
--
--    PIN-000001 (Pump Seal Kit):
--      T1: receipt  +10  → 0→10  (from DLV-000001)
--      T2: issue     -2  → 10→8  (for ISS-000001)
--      T3: return    +2  → 8→10  (from REC-000001 full return)
--
--    PIN-000002 (Elec Cable):
--      T4: receipt   +2  → 0→2   (from DLV-000003)
--      (ISS-000004 is draft; no transaction yet)
--
--    PIN-000003 (Bearing):
--      T5: receipt  +20  → 0→20  (from DLV-000001)
--      T6: issue     -5  → 20→15 (for ISS-000002)
--
--    PIN-000004 (Paint):
--      T7: receipt  +12  → 0→12  (opening balance)
--
--    PIN-000005 (Refurbished Seal):
--      T8: return    +2  → 0→2   (re-entered stock via REC-000001)
--
--    PIN-000006 (Safety Harness):
--      T9: receipt  +15  → 0→15  (opening balance)
--      T10: issue    -3  → 15→12 (for ISS-000003 once issued — but
--                                  ISS-000003 is 'approved' not yet issued,
--                                  so we stop at receipt only; issue
--                                  transaction not created)
-- ============================================================

INSERT INTO public.inventory_transactions (
  id, pin_id, transaction_type,
  quantity, quantity_before, quantity_after,
  reference_type, reference_id, location_id,
  unit_cost, notes, actor_id, created_at
)
VALUES
  -- T1: PIN-000001 receipt from DLV-000001
  (
    '00000000-0000-0000-0000-0000000000f1',
    '00000000-0000-0000-0000-0000000000e1',
    'receipt',
    10, 0, 10,
    'delivery', '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000031',
    3500.0000,
    'Received against DLV-000001 / PO-000001 line 1',
    '00000000-0000-0000-0000-000000000005',
    '2024-11-22 09:00:00+00'
  ),
  -- T2: PIN-000001 issued for ISS-000001
  (
    '00000000-0000-0000-0000-0000000000f2',
    '00000000-0000-0000-0000-0000000000e1',
    'issue',
    -2, 10, 8,
    'issue', '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000031',
    3500.0000,
    'Issued for ISS-000001 — Pacific Star main engine overhaul',
    '00000000-0000-0000-0000-000000000005',
    '2024-12-02 08:00:00+00'
  ),
  -- T3: PIN-000001 full return from ISS-000001 (via REC-000001)
  (
    '00000000-0000-0000-0000-0000000000f3',
    '00000000-0000-0000-0000-0000000000e1',
    'return',
    2, 8, 10,
    'recovery', '00000000-0000-0000-0000-000000000111',
    '00000000-0000-0000-0000-000000000031',
    3500.0000,
    'Returned via REC-000001; assessed for repair/reuse',
    '00000000-0000-0000-0000-000000000005',
    '2025-01-12 14:00:00+00'
  ),
  -- T4: PIN-000002 receipt from DLV-000003
  (
    '00000000-0000-0000-0000-0000000000f4',
    '00000000-0000-0000-0000-0000000000e2',
    'receipt',
    2, 0, 2,
    'delivery', '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-000000000033',
    2500.0000,
    'Received 2 of 4 rolls against DLV-000003 / PO-000002 line 1',
    '00000000-0000-0000-0000-000000000005',
    '2025-01-07 09:00:00+00'
  ),
  -- T5: PIN-000003 receipt from DLV-000001
  (
    '00000000-0000-0000-0000-0000000000f5',
    '00000000-0000-0000-0000-0000000000e3',
    'receipt',
    20, 0, 20,
    'delivery', '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000032',
    850.0000,
    'Received against DLV-000001 / PO-000001 line 2',
    '00000000-0000-0000-0000-000000000005',
    '2024-11-22 09:20:00+00'
  ),
  -- T6: PIN-000003 issued for ISS-000002
  (
    '00000000-0000-0000-0000-0000000000f6',
    '00000000-0000-0000-0000-0000000000e3',
    'issue',
    -5, 20, 15,
    'issue', '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000032',
    850.0000,
    'Issued for ISS-000002 — Harbor Queen shaft bearing replacement',
    '00000000-0000-0000-0000-000000000005',
    '2025-01-03 07:30:00+00'
  ),
  -- T7: PIN-000004 opening balance receipt
  (
    '00000000-0000-0000-0000-0000000000f7',
    '00000000-0000-0000-0000-0000000000e4',
    'receipt',
    12, 0, 12,
    'adjustment', NULL,
    '00000000-0000-0000-0000-000000000034',
    210.0000,
    'Opening balance — physical stock count Sep 2024',
    '00000000-0000-0000-0000-000000000004',
    '2024-09-01 08:00:00+00'
  ),
  -- T8: PIN-000005 re-entered stock from REC-000001 (repair outcome, derived PIN)
  (
    '00000000-0000-0000-0000-0000000000f8',
    '00000000-0000-0000-0000-0000000000e5',
    'return',
    2, 0, 2,
    'recovery', '00000000-0000-0000-0000-000000000111',
    '00000000-0000-0000-0000-000000000031',
    1200.0000,
    'Refurbished seals re-entered stock as PIN-000005 post repair assessment',
    '00000000-0000-0000-0000-000000000004',
    '2025-01-15 10:00:00+00'
  ),
  -- T9: PIN-000006 opening balance receipt
  (
    '00000000-0000-0000-0000-0000000000f9',
    '00000000-0000-0000-0000-0000000000e6',
    'receipt',
    15, 0, 15,
    'adjustment', NULL,
    '00000000-0000-0000-0000-000000000031',
    185.0000,
    'Opening balance — physical stock count Sep 2024',
    '00000000-0000-0000-0000-000000000004',
    '2024-09-01 08:30:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 17. MATERIAL ISSUES
-- ============================================================

INSERT INTO public.material_issues (
  id, issue_number, pin_id, issued_to, vessel_id,
  work_order, quantity, quantity_returned, unit,
  status, purpose,
  approved_by, approved_at, issued_by, issued_at,
  expected_return_date, created_at, updated_at
)
VALUES
  -- ISS-000001: 2 pump seals to Pacific Star, fully_returned
  (
    '00000000-0000-0000-0000-000000000101',
    'ISS-000001',
    '00000000-0000-0000-0000-0000000000e1',  -- PIN-000001
    '00000000-0000-0000-0000-000000000007',  -- eng.bob
    '00000000-0000-0000-0000-000000000011',  -- Pacific Star
    'WO-2024-1120',
    2, 2, 'EA',
    'fully_returned',
    'Main engine pump overhaul during dry-dock period',
    '00000000-0000-0000-0000-000000000004',  -- sam.stores
    '2024-12-01 14:00:00+00',
    '00000000-0000-0000-0000-000000000005',  -- tony.keeper
    '2024-12-02 08:00:00+00',
    '2024-12-20',
    '2024-11-28 10:00:00+00', '2025-01-12 14:00:00+00'
  ),
  -- ISS-000002: 5 bearings to Harbor Queen, issued (partially returned)
  (
    '00000000-0000-0000-0000-000000000102',
    'ISS-000002',
    '00000000-0000-0000-0000-0000000000e3',  -- PIN-000003
    '00000000-0000-0000-0000-000000000007',  -- eng.bob
    '00000000-0000-0000-0000-000000000012',  -- Harbor Queen
    'WO-2025-0102',
    5, 2, 'EA',
    'issued',
    'Tail shaft bearing replacement on Harbor Queen',
    '00000000-0000-0000-0000-000000000004',
    '2025-01-02 11:00:00+00',
    '00000000-0000-0000-0000-000000000005',
    '2025-01-03 07:30:00+00',
    '2025-02-01',
    '2024-12-30 09:00:00+00', '2025-01-03 07:30:00+00'
  ),
  -- ISS-000003: 3 safety harnesses to Pacific Star, approved (not yet issued)
  (
    '00000000-0000-0000-0000-000000000103',
    'ISS-000003',
    '00000000-0000-0000-0000-0000000000e6',  -- PIN-000006
    '00000000-0000-0000-0000-000000000007',  -- eng.bob
    '00000000-0000-0000-0000-000000000011',  -- Pacific Star
    'WO-2025-0110',
    3, 0, 'EA',
    'approved',
    'Height work on mast renewal — safety compliance',
    '00000000-0000-0000-0000-000000000004',
    '2025-01-11 09:00:00+00',
    NULL, NULL,
    '2025-01-25',
    '2025-01-10 15:00:00+00', '2025-01-11 09:00:00+00'
  ),
  -- ISS-000004: 20m cable to Coastal Pride, draft
  (
    '00000000-0000-0000-0000-000000000104',
    'ISS-000004',
    '00000000-0000-0000-0000-0000000000e2',  -- PIN-000002
    '00000000-0000-0000-0000-000000000007',  -- eng.bob
    '00000000-0000-0000-0000-000000000013',  -- Coastal Pride
    NULL,
    1, 0, 'ROLL',
    'draft',
    'Temporary cable run for shore power connection during layup',
    NULL, NULL, NULL, NULL,
    '2025-02-01',
    '2025-01-14 11:00:00+00', '2025-01-14 11:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 18. RECOVERIES
-- ============================================================

INSERT INTO public.recoveries (
  id, recovery_ref, issue_id, pin_id,
  quantity_returned, outcome, status,
  condition_grade, condition_notes,
  assessed_by, assessed_at, disposition_notes,
  derived_pin_id, recovery_location_id,
  recovered_at, created_at, updated_at
)
VALUES
  -- REC-000001: ISS-000001 fully returned, outcome: repair, derived PIN-000005
  (
    '00000000-0000-0000-0000-000000000111',
    'REC-000001',
    '00000000-0000-0000-0000-000000000101',  -- ISS-000001
    '00000000-0000-0000-0000-0000000000e1',  -- PIN-000001
    2, 'repair', 'assessed',
    'B',
    'Seals show minor wear grooves consistent with normal operation. Suitable for refurbishment and reuse in non-critical applications.',
    '00000000-0000-0000-0000-000000000006',  -- qc.alice
    '2025-01-12 13:00:00+00',
    'Seals sent to Precision Marine Services for refurbishment. New PIN-000005 raised on return.',
    '00000000-0000-0000-0000-0000000000e5',  -- derived PIN-000005
    '00000000-0000-0000-0000-000000000031',  -- WH-A-01
    '2025-01-12 14:00:00+00',
    '2025-01-10 09:00:00+00', '2025-01-15 10:00:00+00'
  ),
  -- REC-000002: ISS-000002 partial return, 2 of 5 bearings returned, outcome: reuse
  (
    '00000000-0000-0000-0000-000000000112',
    'REC-000002',
    '00000000-0000-0000-0000-000000000102',  -- ISS-000002
    '00000000-0000-0000-0000-0000000000e3',  -- PIN-000003
    2, 'reuse', 'assessed',
    'A',
    'Two bearings removed during inspection found to be within tolerance. No visible pitting or discolouration. Suitable for reuse.',
    '00000000-0000-0000-0000-000000000006',  -- qc.alice
    '2025-01-14 11:00:00+00',
    'Bearings cleaned, re-greased, and returned to stock in original location.',
    NULL,                                    -- no new derived PIN for reuse
    '00000000-0000-0000-0000-000000000032',  -- WH-A-02
    '2025-01-14 12:00:00+00',
    '2025-01-13 09:00:00+00', '2025-01-14 12:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Now back-fill derived_from_recovery_id on PIN-000005
-- (couldn't be set at PIN insert time because REC-000001
--  didn't exist yet)
-- ============================================================

UPDATE public.inventory_pins
SET derived_from_recovery_id = '00000000-0000-0000-0000-000000000111'
WHERE id = '00000000-0000-0000-0000-0000000000e5'
  AND derived_from_recovery_id IS NULL;

-- ============================================================
-- Also update PIN-000003 quantity_returned in material_issues
-- to reflect REC-000002 partial return (already set in INSERT)
-- ============================================================

-- ============================================================
-- 19. WORKFLOW HISTORY
--     Tracking REQ-000001 and PO-000001 through full lifecycle
-- ============================================================

INSERT INTO public.workflow_history (id, entity_type, entity_id, from_status, to_status, event, actor_id, comment, metadata, created_at)
VALUES
  -- REQ-000001 lifecycle
  (
    '00000000-0000-0000-0000-000000000121',
    'requirement', '00000000-0000-0000-0000-000000000051',
    'draft', 'pending_approval',
    'submit',
    '00000000-0000-0000-0000-000000000007',  -- eng.bob
    'Requirement submitted for procurement manager approval. Engine overhaul scheduled for Q4 dry-dock.',
    '{"urgency": "critical"}'::jsonb,
    '2024-10-02 09:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000122',
    'requirement', '00000000-0000-0000-0000-000000000051',
    'pending_approval', 'approved',
    'approve',
    '00000000-0000-0000-0000-000000000002',  -- john.procurement
    'Approved. Critical urgency confirmed. Proceed to PO immediately.',
    '{"budget_approved": 48000}'::jsonb,
    '2024-10-05 14:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000123',
    'requirement', '00000000-0000-0000-0000-000000000051',
    'approved', 'in_progress',
    'raise_po',
    '00000000-0000-0000-0000-000000000003',  -- mary.officer
    'PO-000001 raised against Marine Parts Ltd.',
    '{"po_number": "PO-000001"}'::jsonb,
    '2024-10-08 14:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000124',
    'requirement', '00000000-0000-0000-0000-000000000051',
    'in_progress', 'closed',
    'close',
    '00000000-0000-0000-0000-000000000002',  -- john.procurement
    'All items received and accepted into inventory. Requirement closed.',
    NULL,
    '2024-12-20 16:00:00+00'
  ),

  -- PO-000001 lifecycle
  (
    '00000000-0000-0000-0000-000000000125',
    'purchase_order', '00000000-0000-0000-0000-000000000081',
    'draft', 'pending_approval',
    'submit',
    '00000000-0000-0000-0000-000000000003',  -- mary.officer
    'PO drafted and submitted for approval. Three line items totalling USD 45,000.',
    '{"vendor": "Marine Parts Ltd", "total": 45000}'::jsonb,
    '2024-10-08 14:30:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000126',
    'purchase_order', '00000000-0000-0000-0000-000000000081',
    'pending_approval', 'approved',
    'approve',
    '00000000-0000-0000-0000-000000000002',  -- john.procurement
    'PO approved. DDP incoterms agreed. Delivery expected by 20 Nov.',
    NULL,
    '2024-10-10 09:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000127',
    'purchase_order', '00000000-0000-0000-0000-000000000081',
    'approved', 'ordered',
    'place_order',
    '00000000-0000-0000-0000-000000000002',  -- john.procurement
    'Order placed with Marine Parts Ltd. Confirmation reference: MPL-ORD-2024-3301.',
    '{"supplier_ref": "MPL-ORD-2024-3301"}'::jsonb,
    '2024-10-12 11:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000128',
    'purchase_order', '00000000-0000-0000-0000-000000000081',
    'ordered', 'qc_passed',
    'pass_inspection',
    '00000000-0000-0000-0000-000000000006',  -- qc.alice
    'First delivery DLV-000001 passed QC. Items accepted into inventory.',
    '{"delivery_ref": "DLV-000001", "qc_ref": "QCI-000001"}'::jsonb,
    '2024-11-21 11:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000129',
    'purchase_order', '00000000-0000-0000-0000-000000000081',
    'qc_passed', 'closed',
    'close',
    '00000000-0000-0000-0000-000000000002',  -- john.procurement
    'Both deliveries received, QC completed, all items in inventory. PO closed.',
    '{"delivery_refs": ["DLV-000001", "DLV-000002"]}'::jsonb,
    '2024-12-20 16:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 20. SOP DOCUMENTS
--     Inserts test data into the sop_documents table created in 008_ai_support.sql.
-- ============================================================

INSERT INTO public.sop_documents (id, title, category, version, is_active, content, created_by, effective_date, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000201',
    'Procurement Standard Operating Procedure',
    'procurement',
    '2.1',
    true,
    'This SOP defines the end-to-end procurement process for the Shipyard Material Lifecycle System, from requirement creation through vendor selection, purchase order approval, and delivery receipt.',
    '00000000-0000-0000-0000-000000000002',  -- john.procurement
    '2024-07-01',
    '2024-05-15 09:00:00+00', '2024-06-01 10:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    'QC Inspection Procedure',
    'qc',
    '1.3',
    true,
    'This procedure defines the quality control inspection process for incoming materials. It covers sampling plans, acceptance criteria, defect classification, conditional acceptance, and disposition of non-conforming materials.',
    '00000000-0000-0000-0000-000000000006',  -- qc.alice
    '2024-09-01',
    '2024-08-01 09:00:00+00', '2024-08-15 10:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000203',
    'Store Receiving Procedure',
    'stores',
    '1.0',
    true,
    'This SOP describes the process for receiving and booking-in materials at the shipyard stores, including checking delivery documents, physical count verification, condition assessment, location assignment, and system entry.',
    '00000000-0000-0000-0000-000000000004',  -- sam.stores
    '2024-10-01',
    '2024-08-20 09:00:00+00', '2024-09-01 10:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 21. SEQ_COUNTERS — sync to match highest seeded ref_number
-- ============================================================

UPDATE public.seq_counters SET last_val = 5 WHERE entity_type = 'requirement';
UPDATE public.seq_counters SET last_val = 3 WHERE entity_type = 'purchase_order';
UPDATE public.seq_counters SET last_val = 4 WHERE entity_type = 'delivery';
UPDATE public.seq_counters SET last_val = 4 WHERE entity_type = 'issue';
UPDATE public.seq_counters SET last_val = 2 WHERE entity_type = 'recovery';
UPDATE public.seq_counters SET last_val = 3 WHERE entity_type = 'qc_inspection';
