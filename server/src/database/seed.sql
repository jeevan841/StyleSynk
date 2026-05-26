-- =============================================================
-- StyleSynk — Seed Data
-- 3 Hyderabad branches | 4 roles | 10 staff | 15 customers
-- 20 services | 50 appointments | memberships | inventory
-- All passwords = 'Password123!' (bcrypt hash)
-- =============================================================

-- Shared bcrypt hash for 'Password123!'
-- Generated: $2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ123456
-- (Replace with real hash in production — see README)
\set DEFAULT_HASH '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiKKkGRpKO.5fXChiJlH4cq7YDQO'

-- =============================================================
-- ROLES
-- =============================================================
INSERT INTO roles (id, name, permissions) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'owner',          '{"all": true}'),
  ('a1000000-0000-0000-0000-000000000002', 'branch_manager', '{"branch": true, "staff": true, "appointments": true, "analytics": true, "inventory": true}'),
  ('a1000000-0000-0000-0000-000000000003', 'receptionist',   '{"appointments": true, "customers": true, "billing": true, "pos": true}'),
  ('a1000000-0000-0000-0000-000000000004', 'stylist',        '{"own_schedule": true, "own_commissions": true}'),
  ('a1000000-0000-0000-0000-000000000005', 'customer',       '{"own_bookings": true, "own_loyalty": true, "own_profile": true}')
ON CONFLICT (name) DO NOTHING;

-- =============================================================
-- BRANCHES
-- =============================================================
INSERT INTO branches (id, name, address, city, phone, email) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'StyleSynk Banjara Hills',
   '8-2-120, Road No. 2, Banjara Hills', 'Hyderabad', '+91-40-2354-0001', 'banjara@stylesynk.com'),
  ('b1000000-0000-0000-0000-000000000002', 'StyleSynk Jubilee Hills',
   'Plot 123, Jubilee Hills Check Post', 'Hyderabad', '+91-40-2354-0002', 'jubilee@stylesynk.com'),
  ('b1000000-0000-0000-0000-000000000003', 'StyleSynk Gachibowli',
   'DLF Cyber City, Gachibowli', 'Hyderabad', '+91-40-2354-0003', 'gachibowli@stylesynk.com')
ON CONFLICT DO NOTHING;

-- =============================================================
-- MEMBERSHIPS
-- =============================================================
INSERT INTO memberships (id, name, price, discount_percent, validity_days, benefits) VALUES
  ('m1000000-0000-0000-0000-000000000001', 'Silver', 1999.00, 10.00, 180,
   '["10% on all services", "Priority booking", "Free hair wash monthly"]'),
  ('m1000000-0000-0000-0000-000000000002', 'Gold', 3999.00, 15.00, 365,
   '["15% on all services", "Complimentary facial quarterly", "Free pick-up & drop"]'),
  ('m1000000-0000-0000-0000-000000000003', 'Platinum', 7999.00, 20.00, 365,
   '["20% on all services", "Dedicated stylist", "Monthly spa package", "Home visit"]')
ON CONFLICT DO NOTHING;

-- =============================================================
-- USERS (owner + managers + receptionists + stylists)
-- =============================================================
INSERT INTO users (id, email, password_hash, role_id, branch_id, name) VALUES
  -- Owner (all branches)
  ('u1000000-0000-0000-0000-000000000001', 'owner@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000001', NULL, 'Rahul Gupta'),

  -- Branch Managers
  ('u1000000-0000-0000-0000-000000000002', 'manager.banjara@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Priya Sharma'),
  ('u1000000-0000-0000-0000-000000000003', 'manager.jubilee@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Kiran Reddy'),
  ('u1000000-0000-0000-0000-000000000004', 'manager.gachi@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'Ananya Rao'),

  -- Receptionists
  ('u1000000-0000-0000-0000-000000000005', 'recep.banjara@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'Sunita Patel'),
  ('u1000000-0000-0000-0000-000000000006', 'recep.jubilee@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'Divya Nair'),

  -- Stylists (linked to staff below)
  ('u1000000-0000-0000-0000-000000000007', 'stylist1@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'Meera Joshi'),
  ('u1000000-0000-0000-0000-000000000008', 'stylist2@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'Kavitha Iyer'),
  ('u1000000-0000-0000-0000-000000000009', 'stylist3@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'Pooja Mehta'),
  ('u1000000-0000-0000-0000-000000000010', 'stylist4@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'Riya Singh'),
  ('u1000000-0000-0000-0000-000000000011', 'stylist5@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'Sneha Kapoor'),
  ('u1000000-0000-0000-0000-000000000012', 'stylist6@stylesynk.com',
   :'DEFAULT_HASH', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'Lakshmi Devi')
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- STAFF (10 stylists across 3 branches)
-- =============================================================
INSERT INTO staff (id, user_id, branch_id, name, email, phone, specialization, experience_yrs, commission_pct, rating) VALUES
  ('s1000000-0000-0000-0000-000000000001',
   'u1000000-0000-0000-0000-000000000007',
   'b1000000-0000-0000-0000-000000000001',
   'Meera Joshi', 'stylist1@stylesynk.com', '+91-98765-11001',
   ARRAY['haircut','color','highlights','balayage'], 7, 35.00, 4.90),

  ('s1000000-0000-0000-0000-000000000002',
   'u1000000-0000-0000-0000-000000000008',
   'b1000000-0000-0000-0000-000000000001',
   'Kavitha Iyer', 'stylist2@stylesynk.com', '+91-98765-11002',
   ARRAY['facial','cleanup','gold_facial','threading'], 5, 32.00, 4.80),

  ('s1000000-0000-0000-0000-000000000003',
   NULL,
   'b1000000-0000-0000-0000-000000000001',
   'Arjun Sharma', 'arjun.s@stylesynk.com', '+91-98765-11003',
   ARRAY['haircut','beard','hair_spa','keratin'], 9, 38.00, 4.95),

  ('s1000000-0000-0000-0000-000000000004',
   NULL,
   'b1000000-0000-0000-0000-000000000001',
   'Sunita Rao', 'sunita.r@stylesynk.com', '+91-98765-11004',
   ARRAY['manicure','pedicure','nail_art','waxing'], 4, 30.00, 4.75),

  ('s1000000-0000-0000-0000-000000000005',
   'u1000000-0000-0000-0000-000000000009',
   'b1000000-0000-0000-0000-000000000002',
   'Pooja Mehta', 'stylist3@stylesynk.com', '+91-98765-22001',
   ARRAY['haircut','bridal','hair_spa','blowout'], 8, 36.00, 4.85),

  ('s1000000-0000-0000-0000-000000000006',
   'u1000000-0000-0000-0000-000000000010',
   'b1000000-0000-0000-0000-000000000002',
   'Riya Singh', 'stylist4@stylesynk.com', '+91-98765-22002',
   ARRAY['facial','massage','body_wrap','aromatherapy'], 6, 33.00, 4.70),

  ('s1000000-0000-0000-0000-000000000007',
   NULL,
   'b1000000-0000-0000-0000-000000000002',
   'Deepak Nair', 'deepak.n@stylesynk.com', '+91-98765-22003',
   ARRAY['haircut','color','beard','threading'], 3, 28.00, 4.60),

  ('s1000000-0000-0000-0000-000000000008',
   'u1000000-0000-0000-0000-000000000011',
   'b1000000-0000-0000-0000-000000000003',
   'Sneha Kapoor', 'stylist5@stylesynk.com', '+91-98765-33001',
   ARRAY['haircut','keratin','highlights','balayage'], 10, 40.00, 4.98),

  ('s1000000-0000-0000-0000-000000000009',
   'u1000000-0000-0000-0000-000000000012',
   'b1000000-0000-0000-0000-000000000003',
   'Lakshmi Devi', 'stylist6@stylesynk.com', '+91-98765-33002',
   ARRAY['facial','bridal','threading','waxing'], 7, 34.00, 4.88),

  ('s1000000-0000-0000-0000-000000000010',
   NULL,
   'b1000000-0000-0000-0000-000000000003',
   'Vikram Patel', 'vikram.p@stylesynk.com', '+91-98765-33003',
   ARRAY['massage','body_spa','hair_spa','manicure'], 5, 31.00, 4.72)
ON CONFLICT DO NOTHING;

-- =============================================================
-- SERVICES (20 services, INR ₹500–₹3000 range)
-- =============================================================
INSERT INTO services (id, name, category, description, price, duration_min, commission_pct) VALUES
  ('svc00000-0000-0000-0000-000000000001', 'Haircut & Styling',    'hair',   'Professional haircut with blow-dry',          800.00,  45, 30.00),
  ('svc00000-0000-0000-0000-000000000002', 'Hair Color (Global)',   'hair',   'Full global color with ammonia-free shades', 2500.00,  90, 30.00),
  ('svc00000-0000-0000-0000-000000000003', 'Highlights / Balayage','hair',   'Partial or full highlights',                 3000.00, 120, 30.00),
  ('svc00000-0000-0000-0000-000000000004', 'Keratin Treatment',     'hair',   'Smoothing & frizz control treatment',        3500.00, 150, 30.00),
  ('svc00000-0000-0000-0000-000000000005', 'Hair Spa',              'hair',   'Deep conditioning + steam + massage',        1200.00,  60, 30.00),
  ('svc00000-0000-0000-0000-000000000006', 'Blowout / Blow-Dry',   'hair',   'Salon finish blow-dry',                       600.00,  30, 30.00),
  ('svc00000-0000-0000-0000-000000000007', 'Gold Facial',           'skin',   'Gold leaf deep cleanse + glow pack',        1800.00,  60, 35.00),
  ('svc00000-0000-0000-0000-000000000008', 'Cleanup / Basic Facial','skin',   'Deep cleanse + extraction + mask',           800.00,  45, 35.00),
  ('svc00000-0000-0000-0000-000000000009', 'De-tan Treatment',      'skin',   'Sun damage reversal + pigmentation',        1200.00,  50, 35.00),
  ('svc00000-0000-0000-0000-000000000010', 'Threading (Full Face)', 'skin',   'Eyebrows + upper lip + chin',                200.00,  20, 40.00),
  ('svc00000-0000-0000-0000-000000000011', 'Full Body Waxing',      'skin',   'Rica or chocolate wax, full body',          2000.00,  90, 35.00),
  ('svc00000-0000-0000-0000-000000000012', 'Manicure (Gel)',        'nail',   'Gel polish + cuticle care + hand massage',   900.00,  45, 30.00),
  ('svc00000-0000-0000-0000-000000000013', 'Pedicure (Spa)',        'nail',   'Foot soak + scrub + gel polish',            1100.00,  60, 30.00),
  ('svc00000-0000-0000-0000-000000000014', 'Nail Art (per hand)',   'nail',   'Custom nail art designs',                    700.00,  45, 30.00),
  ('svc00000-0000-0000-0000-000000000015', 'Full Body Massage',     'spa',    'Swedish or deep tissue, 60 min',            2200.00,  60, 35.00),
  ('svc00000-0000-0000-0000-000000000016', 'Head Massage',          'spa',    'Scalp + neck + shoulder relief',             600.00,  30, 35.00),
  ('svc00000-0000-0000-0000-000000000017', 'Bridal Package',        'bridal', 'Full bridal makeover — hair + skin + nails',8500.00, 300, 30.00),
  ('svc00000-0000-0000-0000-000000000018', 'Pre-Bridal Package',    'bridal', '5-session pre-bridal skin + hair prep',     6000.00, 240, 30.00),
  ('svc00000-0000-0000-0000-000000000019', 'Beard Grooming',        'hair',   'Shape, trim, hot towel, oil massage',        500.00,  30, 30.00),
  ('svc00000-0000-0000-0000-000000000020', 'Hair & Scalp Analysis', 'hair',   'Digital scalp analysis + consultation',      300.00,  20, 20.00)
ON CONFLICT DO NOTHING;

-- =============================================================
-- CUSTOMERS (15 realistic Hyderabad customers)
-- =============================================================
INSERT INTO customers (id, branch_id, membership_id, name, phone, email, gender, loyalty_points) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000002', 'Ananya Reddy',  '+91-98491-10001', 'ananya.r@gmail.com',  'female', 450),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', NULL,                                   'Rohit Verma',   '+91-98491-10002', 'rohit.v@gmail.com',   'male',   120),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000003', 'Sravani Rao',   '+91-98491-10003', 'sravani.r@gmail.com', 'female', 1200),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', NULL,                                   'Farhan Sheikh', '+91-98491-10004', 'farhan.s@gmail.com',  'male',   80),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'm1000000-0000-0000-0000-000000000001', 'Lavanya Nair',  '+91-98491-10005', 'lavanya.n@gmail.com', 'female', 320),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000002', 'Deepa Kumar',   '+91-98491-20001', 'deepa.k@gmail.com',   'female', 680),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', NULL,                                   'Suresh Goud',   '+91-98491-20002', 'suresh.g@gmail.com',  'male',   0),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000001', 'Pallavi Das',   '+91-98491-20003', 'pallavi.d@gmail.com', 'female', 210),
  ('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000002', NULL,                                   'Kiran Babu',    '+91-98491-20004', 'kiran.b@gmail.com',   'male',   50),
  ('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 'm1000000-0000-0000-0000-000000000003', 'Madhuri Joshi', '+91-98491-20005', 'madhuri.j@gmail.com', 'female', 2200),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000003', NULL,                                   'Aditya Raj',    '+91-98491-30001', 'aditya.r@gmail.com',  'male',   150),
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000002', 'Swathi Reddy',  '+91-98491-30002', 'swathi.r@gmail.com',  'female', 780),
  ('c1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000003', NULL,                                   'Ramesh Goud',   '+91-98491-30003', 'ramesh.g@gmail.com',  'male',   30),
  ('c1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000003', 'Nisha Kapoor',  '+91-98491-30004', 'nisha.k@gmail.com',   'female', 1850),
  ('c1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000003', 'm1000000-0000-0000-0000-000000000001', 'Preethi Iyer',  '+91-98491-30005', 'preethi.i@gmail.com', 'female', 420)
ON CONFLICT DO NOTHING;

-- =============================================================
-- APPOINTMENTS (50 — spread across past 30 days + future 14 days)
-- Uses generate_series for realistic spread
-- =============================================================
-- Banjara Hills appointments (20)
INSERT INTO appointments (branch_id, customer_id, staff_id, service_id, start_time, end_time, status, channel) VALUES

-- Past (completed) appointments — Banjara Hills
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000001','svc00000-0000-0000-0000-000000000001', NOW()-INTERVAL'28 days'+TIME'10:00', NOW()-INTERVAL'28 days'+TIME'10:45', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','s1000000-0000-0000-0000-000000000003','svc00000-0000-0000-0000-000000000005', NOW()-INTERVAL'27 days'+TIME'11:00', NOW()-INTERVAL'27 days'+TIME'12:00', 'completed','phone'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','s1000000-0000-0000-0000-000000000002','svc00000-0000-0000-0000-000000000007', NOW()-INTERVAL'26 days'+TIME'14:00', NOW()-INTERVAL'26 days'+TIME'15:00', 'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000004','s1000000-0000-0000-0000-000000000001','svc00000-0000-0000-0000-000000000002', NOW()-INTERVAL'25 days'+TIME'15:00', NOW()-INTERVAL'25 days'+TIME'16:30', 'completed','whatsapp'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000005','s1000000-0000-0000-0000-000000000004','svc00000-0000-0000-0000-000000000012', NOW()-INTERVAL'24 days'+TIME'10:30', NOW()-INTERVAL'24 days'+TIME'11:15', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000002','svc00000-0000-0000-0000-000000000008', NOW()-INTERVAL'22 days'+TIME'12:00', NOW()-INTERVAL'22 days'+TIME'12:45', 'completed','phone'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','s1000000-0000-0000-0000-000000000001','svc00000-0000-0000-0000-000000000003', NOW()-INTERVAL'20 days'+TIME'11:00', NOW()-INTERVAL'20 days'+TIME'13:00', 'completed','whatsapp'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','s1000000-0000-0000-0000-000000000003','svc00000-0000-0000-0000-000000000019', NOW()-INTERVAL'18 days'+TIME'09:00', NOW()-INTERVAL'18 days'+TIME'09:30', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000005','s1000000-0000-0000-0000-000000000002','svc00000-0000-0000-0000-000000000010', NOW()-INTERVAL'16 days'+TIME'16:00', NOW()-INTERVAL'16 days'+TIME'16:20', 'completed','phone'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000004','s1000000-0000-0000-0000-000000000001','svc00000-0000-0000-0000-000000000006', NOW()-INTERVAL'14 days'+TIME'13:00', NOW()-INTERVAL'14 days'+TIME'13:30', 'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000003','svc00000-0000-0000-0000-000000000004', NOW()-INTERVAL'12 days'+TIME'10:00', NOW()-INTERVAL'12 days'+TIME'12:30', 'completed','whatsapp'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','s1000000-0000-0000-0000-000000000004','svc00000-0000-0000-0000-000000000013', NOW()-INTERVAL'10 days'+TIME'14:30', NOW()-INTERVAL'10 days'+TIME'15:30', 'completed','phone'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','s1000000-0000-0000-0000-000000000001','svc00000-0000-0000-0000-000000000001', NOW()-INTERVAL'8 days'+TIME'11:00',  NOW()-INTERVAL'8 days'+TIME'11:45',  'completed','walk_in'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000005','s1000000-0000-0000-0000-000000000002','svc00000-0000-0000-0000-000000000009', NOW()-INTERVAL'6 days'+TIME'15:00',  NOW()-INTERVAL'6 days'+TIME'15:50',  'cancelled', 'phone'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000001','svc00000-0000-0000-0000-000000000005', NOW()-INTERVAL'4 days'+TIME'10:00',  NOW()-INTERVAL'4 days'+TIME'11:00',  'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000004','s1000000-0000-0000-0000-000000000003','svc00000-0000-0000-0000-000000000015', NOW()-INTERVAL'3 days'+TIME'13:00',  NOW()-INTERVAL'3 days'+TIME'14:00',  'completed','walk_in'),
-- Today
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','s1000000-0000-0000-0000-000000000001','svc00000-0000-0000-0000-000000000001', NOW()::date+TIME'10:00', NOW()::date+TIME'10:45', 'confirmed','whatsapp'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','s1000000-0000-0000-0000-000000000002','svc00000-0000-0000-0000-000000000007', NOW()::date+TIME'11:30', NOW()::date+TIME'12:30', 'confirmed','phone'),
-- Future
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000005','s1000000-0000-0000-0000-000000000004','svc00000-0000-0000-0000-000000000017', NOW()+INTERVAL'2 days'+TIME'09:00',  NOW()+INTERVAL'2 days'+TIME'14:00',  'confirmed','ai_chat'),
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','s1000000-0000-0000-0000-000000000003','svc00000-0000-0000-0000-000000000004', NOW()+INTERVAL'5 days'+TIME'11:00',  NOW()+INTERVAL'5 days'+TIME'13:30',  'confirmed','online'),

-- Jubilee Hills appointments (17)
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000006','s1000000-0000-0000-0000-000000000005','svc00000-0000-0000-0000-000000000001', NOW()-INTERVAL'27 days'+TIME'10:00', NOW()-INTERVAL'27 days'+TIME'10:45', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000007','s1000000-0000-0000-0000-000000000007','svc00000-0000-0000-0000-000000000019', NOW()-INTERVAL'26 days'+TIME'11:00', NOW()-INTERVAL'26 days'+TIME'11:30', 'completed','phone'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000008','s1000000-0000-0000-0000-000000000006','svc00000-0000-0000-0000-000000000015', NOW()-INTERVAL'24 days'+TIME'14:00', NOW()-INTERVAL'24 days'+TIME'15:00', 'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000009','s1000000-0000-0000-0000-000000000005','svc00000-0000-0000-0000-000000000001', NOW()-INTERVAL'22 days'+TIME'15:00', NOW()-INTERVAL'22 days'+TIME'15:45', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000010','s1000000-0000-0000-0000-000000000006','svc00000-0000-0000-0000-000000000007', NOW()-INTERVAL'20 days'+TIME'10:30', NOW()-INTERVAL'20 days'+TIME'11:30', 'completed','whatsapp'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000006','s1000000-0000-0000-0000-000000000007','svc00000-0000-0000-0000-000000000003', NOW()-INTERVAL'18 days'+TIME'12:00', NOW()-INTERVAL'18 days'+TIME'14:00', 'completed','phone'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000008','s1000000-0000-0000-0000-000000000005','svc00000-0000-0000-0000-000000000012', NOW()-INTERVAL'16 days'+TIME'10:00', NOW()-INTERVAL'16 days'+TIME'10:45', 'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000010','s1000000-0000-0000-0000-000000000006','svc00000-0000-0000-0000-000000000018', NOW()-INTERVAL'14 days'+TIME'13:00', NOW()-INTERVAL'14 days'+TIME'17:00', 'completed','whatsapp'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000007','s1000000-0000-0000-0000-000000000007','svc00000-0000-0000-0000-000000000001', NOW()-INTERVAL'12 days'+TIME'11:00', NOW()-INTERVAL'12 days'+TIME'11:45', 'no_show',  'phone'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000009','s1000000-0000-0000-0000-000000000005','svc00000-0000-0000-0000-000000000008', NOW()-INTERVAL'10 days'+TIME'14:00', NOW()-INTERVAL'10 days'+TIME'14:45', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000006','s1000000-0000-0000-0000-000000000006','svc00000-0000-0000-0000-000000000011', NOW()-INTERVAL'8 days'+TIME'10:00',  NOW()-INTERVAL'8 days'+TIME'11:30',  'completed','phone'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000010','s1000000-0000-0000-0000-000000000005','svc00000-0000-0000-0000-000000000005', NOW()-INTERVAL'5 days'+TIME'15:00',  NOW()-INTERVAL'5 days'+TIME'16:00',  'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000008','s1000000-0000-0000-0000-000000000007','svc00000-0000-0000-0000-000000000010', NOW()-INTERVAL'3 days'+TIME'13:00',  NOW()-INTERVAL'3 days'+TIME'13:20',  'completed','walk_in'),
-- Today & future Jubilee
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000006','s1000000-0000-0000-0000-000000000005','svc00000-0000-0000-0000-000000000007', NOW()::date+TIME'10:30', NOW()::date+TIME'11:30', 'confirmed','phone'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000010','s1000000-0000-0000-0000-000000000006','svc00000-0000-0000-0000-000000000017', NOW()+INTERVAL'3 days'+TIME'09:00', NOW()+INTERVAL'3 days'+TIME'14:00', 'confirmed','whatsapp'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000009','s1000000-0000-0000-0000-000000000007','svc00000-0000-0000-0000-000000000004', NOW()+INTERVAL'6 days'+TIME'11:00', NOW()+INTERVAL'6 days'+TIME'13:30', 'confirmed','ai_chat'),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000008','s1000000-0000-0000-0000-000000000005','svc00000-0000-0000-0000-000000000002', NOW()+INTERVAL'8 days'+TIME'14:00', NOW()+INTERVAL'8 days'+TIME'15:30', 'confirmed','online'),

-- Gachibowli appointments (13)
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000011','s1000000-0000-0000-0000-000000000008','svc00000-0000-0000-0000-000000000001', NOW()-INTERVAL'25 days'+TIME'09:00', NOW()-INTERVAL'25 days'+TIME'09:45', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000012','s1000000-0000-0000-0000-000000000009','svc00000-0000-0000-0000-000000000007', NOW()-INTERVAL'23 days'+TIME'11:00', NOW()-INTERVAL'23 days'+TIME'12:00', 'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000013','s1000000-0000-0000-0000-000000000010','svc00000-0000-0000-0000-000000000015', NOW()-INTERVAL'21 days'+TIME'13:00', NOW()-INTERVAL'21 days'+TIME'14:00', 'completed','phone'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000014','s1000000-0000-0000-0000-000000000008','svc00000-0000-0000-0000-000000000003', NOW()-INTERVAL'19 days'+TIME'10:00', NOW()-INTERVAL'19 days'+TIME'12:00', 'completed','whatsapp'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000015','s1000000-0000-0000-0000-000000000009','svc00000-0000-0000-0000-000000000010', NOW()-INTERVAL'17 days'+TIME'15:00', NOW()-INTERVAL'17 days'+TIME'15:20', 'completed','walk_in'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000011','s1000000-0000-0000-0000-000000000010','svc00000-0000-0000-0000-000000000016', NOW()-INTERVAL'15 days'+TIME'12:00', NOW()-INTERVAL'15 days'+TIME'12:30', 'completed','phone'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000012','s1000000-0000-0000-0000-000000000008','svc00000-0000-0000-0000-000000000004', NOW()-INTERVAL'13 days'+TIME'10:00', NOW()-INTERVAL'13 days'+TIME'12:30', 'completed','ai_chat'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000014','s1000000-0000-0000-0000-000000000009','svc00000-0000-0000-0000-000000000017', NOW()-INTERVAL'11 days'+TIME'09:00', NOW()-INTERVAL'11 days'+TIME'14:00', 'completed','whatsapp'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000013','s1000000-0000-0000-0000-000000000010','svc00000-0000-0000-0000-000000000019', NOW()-INTERVAL'9 days'+TIME'14:00',  NOW()-INTERVAL'9 days'+TIME'14:30',  'completed','walk_in'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000015','s1000000-0000-0000-0000-000000000008','svc00000-0000-0000-0000-000000000005', NOW()-INTERVAL'7 days'+TIME'11:00',  NOW()-INTERVAL'7 days'+TIME'12:00',  'cancelled', 'phone'),
-- Today & future Gachibowli
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000011','s1000000-0000-0000-0000-000000000008','svc00000-0000-0000-0000-000000000001', NOW()::date+TIME'11:00', NOW()::date+TIME'11:45', 'confirmed','ai_chat'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000014','s1000000-0000-0000-0000-000000000009','svc00000-0000-0000-0000-000000000018', NOW()+INTERVAL'4 days'+TIME'10:00', NOW()+INTERVAL'4 days'+TIME'14:00', 'confirmed','whatsapp'),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000012','s1000000-0000-0000-0000-000000000010','svc00000-0000-0000-0000-000000000002', NOW()+INTERVAL'7 days'+TIME'13:00', NOW()+INTERVAL'7 days'+TIME'14:30', 'confirmed','online');

-- =============================================================
-- INVENTORY (per branch)
-- =============================================================
INSERT INTO inventory (branch_id, product_name, sku, category, quantity, unit, low_stock_threshold, unit_cost, unit_price, supplier) VALUES
-- Banjara Hills
('b1000000-0000-0000-0000-000000000001', 'L''Oreal Color Shades Set',   'LOC-001', 'color',    48, 'tubes',  10, 320.00, 450.00, 'L''Oreal India'),
('b1000000-0000-0000-0000-000000000001', 'Kerastase Hair Serum',         'KER-001', 'haircare',  6, 'bottles', 5, 850.00,1200.00, 'Kerastase'),
('b1000000-0000-0000-0000-000000000001', 'Rica Wax (Chocolate)',         'RIC-001', 'waxing',   22, 'cans',    8, 240.00, 380.00, 'Rica India'),
('b1000000-0000-0000-0000-000000000001', 'Dermalogica Facial Kit',       'DER-001', 'facial',    3, 'kits',    5, 1800.00,2500.00,'Dermalogica'),
('b1000000-0000-0000-0000-000000000001', 'OPI Gel Polish Set',           'OPI-001', 'nail',     35, 'bottles',10, 450.00, 650.00, 'OPI India'),
-- Jubilee Hills
('b1000000-0000-0000-0000-000000000002', 'Wella Color Touch',            'WEL-001', 'color',    30, 'tubes',  10, 280.00, 420.00, 'Wella India'),
('b1000000-0000-0000-0000-000000000002', 'Moroccan Oil Treatment',       'MOR-001', 'haircare',  4, 'bottles', 5, 1200.00,1800.00,'Moroccan Oil'),
('b1000000-0000-0000-0000-000000000002', 'Hot Wax Strips (Large)',       'HOT-001', 'waxing',   18, 'packs',   8, 120.00, 200.00, 'Veet Pro'),
('b1000000-0000-0000-0000-000000000002', 'Gelish Gel Polish',            'GEL-001', 'nail',     28, 'bottles',10, 380.00, 550.00, 'Gelish India'),
('b1000000-0000-0000-0000-000000000002', 'Forest Essentials Face Pack',  'FES-001', 'facial',    2, 'sets',    5, 2200.00,3200.00,'Forest Essentials'),
-- Gachibowli
('b1000000-0000-0000-0000-000000000003', 'Matrix SoColor',               'MAT-001', 'color',    55, 'tubes',  10, 260.00, 380.00, 'Matrix India'),
('b1000000-0000-0000-0000-000000000003', 'Olaplex Bond Treatment',       'OLA-001', 'haircare',  8, 'bottles', 5, 2400.00,3500.00,'Olaplex'),
('b1000000-0000-0000-0000-000000000003', 'Gold Facial Kit',              'GLD-001', 'facial',   10, 'kits',    5, 1500.00,2200.00,'Shahnaz'),
('b1000000-0000-0000-0000-000000000003', 'CND Vinylux Polish',           'CND-001', 'nail',     40, 'bottles',10, 420.00, 600.00, 'CND India'),
('b1000000-0000-0000-0000-000000000003', 'Aromatherapy Massage Oil Set', 'ARO-001', 'spa',       5, 'sets',    3, 900.00,1400.00, 'Kama Ayurveda');

-- =============================================================
-- LOYALTY_POINTS ledger seed (matches customers.loyalty_points)
-- =============================================================
INSERT INTO loyalty_points (customer_id, points, reason, reference_type) VALUES
('c1000000-0000-0000-0000-000000000001', 450, 'Accumulated from past visits', 'manual'),
('c1000000-0000-0000-0000-000000000002', 120, 'Accumulated from past visits', 'manual'),
('c1000000-0000-0000-0000-000000000003',1200, 'Platinum member accumulated',  'manual'),
('c1000000-0000-0000-0000-000000000004',  80, 'Accumulated from past visits', 'manual'),
('c1000000-0000-0000-0000-000000000005', 320, 'Silver member accumulated',    'manual'),
('c1000000-0000-0000-0000-000000000006', 680, 'Gold member accumulated',      'manual'),
('c1000000-0000-0000-0000-000000000008', 210, 'Silver member accumulated',    'manual'),
('c1000000-0000-0000-0000-000000000009',  50, 'Accumulated from past visits', 'manual'),
('c1000000-0000-0000-0000-000000000010',2200, 'Platinum member accumulated',  'manual'),
('c1000000-0000-0000-0000-000000000011', 150, 'Accumulated from past visits', 'manual'),
('c1000000-0000-0000-0000-000000000012', 780, 'Gold member accumulated',      'manual'),
('c1000000-0000-0000-0000-000000000013',  30, 'Accumulated from past visits', 'manual'),
('c1000000-0000-0000-0000-000000000014',1850, 'Platinum member accumulated',  'manual'),
('c1000000-0000-0000-0000-000000000015', 420, 'Silver member accumulated',    'manual');
