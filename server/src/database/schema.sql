-- =============================================================
-- StyleSynk — PostgreSQL Schema
-- Production-ready: UUID PKs, FKs, indexes, constraints,
-- advisory-lock-safe bigint hash, auto-updated timestamps
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- UTILITY: auto-update updated_at on any table
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- UTILITY: hash UUID → bigint for pg_advisory_xact_lock
-- pg advisory locks require a bigint; UUIDs need folding.
-- =============================================================
CREATE OR REPLACE FUNCTION uuid_to_bigint(u UUID) RETURNS BIGINT AS $$
  SELECT ('x' || translate(u::text, '-', ''))::bit(64)::bigint;
$$ LANGUAGE SQL IMMUTABLE;

-- =============================================================
-- TABLE 1: roles
-- =============================================================
CREATE TABLE IF NOT EXISTS roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,          -- owner | branch_manager | receptionist | stylist | customer
  permissions JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'RBAC role definitions with JSON permission maps';

-- =============================================================
-- TABLE 2: branches
-- =============================================================
CREATE TABLE IF NOT EXISTS branches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL,
  address    TEXT,
  city       VARCHAR(100) DEFAULT 'Hyderabad',
  phone      VARCHAR(20),
  email      VARCHAR(150),
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================
-- TABLE 3: users  (staff + owner + manager accounts)
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id       UUID        REFERENCES roles(id)     ON DELETE RESTRICT,
  branch_id     UUID        REFERENCES branches(id)  ON DELETE SET NULL,
  name          VARCHAR(150),
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id   ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

-- =============================================================
-- TABLE 4: memberships
-- =============================================================
CREATE TABLE IF NOT EXISTS memberships (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100) NOT NULL,           -- Silver | Gold | Platinum
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 0,
  validity_days    INTEGER NOT NULL DEFAULT 365,
  benefits         JSONB   NOT NULL DEFAULT '[]',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TABLE 5: customers
-- =============================================================
CREATE TABLE IF NOT EXISTS customers (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID    REFERENCES users(id)       ON DELETE SET NULL,
  branch_id      UUID    REFERENCES branches(id)    ON DELETE SET NULL,
  membership_id  UUID    REFERENCES memberships(id) ON DELETE SET NULL,
  name           VARCHAR(150) NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(255),
  gender         VARCHAR(20),
  date_of_birth  DATE,
  loyalty_points INTEGER NOT NULL DEFAULT 0,        -- running balance cache
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);

-- =============================================================
-- TABLE 6: staff
-- =============================================================
CREATE TABLE IF NOT EXISTS staff (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    REFERENCES users(id)    ON DELETE SET NULL,
  branch_id       UUID    REFERENCES branches(id) ON DELETE RESTRICT,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(20),
  specialization  TEXT[]  DEFAULT '{}',     -- ['haircut', 'color', 'facial']
  experience_yrs  INTEGER DEFAULT 0,
  commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  rating          NUMERIC(3,2) DEFAULT 5.00,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT staff_commission_check CHECK (commission_pct >= 0 AND commission_pct <= 100)
);

CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_staff_branch ON staff(branch_id);

-- =============================================================
-- TABLE 7: services
-- =============================================================
CREATE TABLE IF NOT EXISTS services (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID    REFERENCES branches(id) ON DELETE CASCADE,  -- NULL = global
  name           VARCHAR(150) NOT NULL,
  category       VARCHAR(100) DEFAULT 'hair',  -- hair|skin|nail|spa|bridal
  description    TEXT,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_min   INTEGER NOT NULL DEFAULT 30,
  commission_pct NUMERIC(5,2) DEFAULT 30.00,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT services_price_check CHECK (price >= 0),
  CONSTRAINT services_duration_check CHECK (duration_min > 0)
);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- =============================================================
-- TABLE 8: appointments
-- =============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID    NOT NULL REFERENCES branches(id)  ON DELETE RESTRICT,
  customer_id UUID    REFERENCES customers(id)           ON DELETE SET NULL,
  staff_id    UUID    REFERENCES staff(id)               ON DELETE SET NULL,
  service_id  UUID    REFERENCES services(id)            ON DELETE SET NULL,
  bill_id     UUID,   -- filled after billing (FK added later to avoid circular)
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  status      VARCHAR(30) NOT NULL DEFAULT 'confirmed',
  -- confirmed | in_progress | completed | cancelled | no_show
  channel     VARCHAR(30) NOT NULL DEFAULT 'walk_in',
  -- walk_in | phone | whatsapp | ai_chat | online | app
  source      VARCHAR(30) GENERATED ALWAYS AS (channel) STORED,  -- spec alias
  notes       TEXT,
  created_by  UUID    REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT appt_time_check CHECK (end_time > start_time),
  CONSTRAINT appt_status_check CHECK (status IN (
    'confirmed','in_progress','completed','cancelled','no_show'
  ))
);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Critical indexes for collision detection and calendar queries
CREATE INDEX IF NOT EXISTS idx_appt_staff_time
  ON appointments(staff_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_appt_branch_time
  ON appointments(branch_id, start_time);

CREATE INDEX IF NOT EXISTS idx_appt_customer
  ON appointments(customer_id);

CREATE INDEX IF NOT EXISTS idx_appt_status
  ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_appt_date
  ON appointments(DATE(start_time));

-- =============================================================
-- TABLE 9: bills
-- =============================================================
CREATE TABLE IF NOT EXISTS bills (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number     VARCHAR(50) UNIQUE,
  appointment_id  UUID    REFERENCES appointments(id) ON DELETE SET NULL,
  customer_id     UUID    REFERENCES customers(id)    ON DELETE SET NULL,
  branch_id       UUID    NOT NULL REFERENCES branches(id),
  membership_id   UUID    REFERENCES memberships(id)  ON DELETE SET NULL,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate        NUMERIC(5,2)  NOT NULL DEFAULT 18.00,
  gst_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  loyalty_redeemed INTEGER      NOT NULL DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method  VARCHAR(30)   NOT NULL DEFAULT 'cash',
  -- cash | card | upi | wallet | membership
  status          VARCHAR(20)   NOT NULL DEFAULT 'draft',
  -- draft | paid | refunded | cancelled
  created_by      UUID    REFERENCES users(id) ON DELETE SET NULL,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT bill_total_check CHECK (total_amount >= 0)
);

CREATE TRIGGER bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bills_appointment ON bills(appointment_id);
CREATE INDEX IF NOT EXISTS idx_bills_customer    ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_branch_date ON bills(branch_id, paid_at);

-- Back-reference from appointments to bills
ALTER TABLE appointments
  ADD CONSTRAINT fk_appt_bill FOREIGN KEY (bill_id)
  REFERENCES bills(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- =============================================================
-- TABLE 10: invoice_items
-- =============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id      UUID    NOT NULL REFERENCES bills(id)     ON DELETE CASCADE,
  service_id   UUID    REFERENCES services(id)           ON DELETE SET NULL,
  staff_id     UUID    REFERENCES staff(id)              ON DELETE SET NULL,
  item_name    VARCHAR(200) NOT NULL,
  item_type    VARCHAR(20)  NOT NULL DEFAULT 'service',  -- service | product
  quantity     INTEGER      NOT NULL DEFAULT 1,
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0,
  line_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT item_quantity_check CHECK (quantity > 0),
  CONSTRAINT item_price_check    CHECK (unit_price >= 0),
  CONSTRAINT item_type_check     CHECK (item_type IN ('service', 'product'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_bill ON invoice_items(bill_id);

-- =============================================================
-- TABLE 11: commissions
-- =============================================================
CREATE TABLE IF NOT EXISTS commissions (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         UUID    NOT NULL REFERENCES staff(id)         ON DELETE CASCADE,
  bill_id          UUID    REFERENCES bills(id)                  ON DELETE SET NULL,
  appointment_id   UUID    REFERENCES appointments(id)           ON DELETE SET NULL,
  invoice_item_id  UUID    REFERENCES invoice_items(id)          ON DELETE SET NULL,
  service_name     VARCHAR(200),
  service_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_pct   NUMERIC(5,2)  NOT NULL DEFAULT 10.00,
  commission_amt   NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- amount in spec
  amount           NUMERIC(12,2) GENERATED ALWAYS AS (commission_amt) STORED,
  rate             NUMERIC(5,2)  GENERATED ALWAYS AS (commission_pct) STORED,
  period_month     CHAR(7),   -- YYYY-MM
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_staff_date
  ON commissions(staff_id, created_at);

CREATE INDEX IF NOT EXISTS idx_commissions_bill
  ON commissions(bill_id);

-- =============================================================
-- TABLE 12: inventory
-- =============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           UUID    NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_name        VARCHAR(200) NOT NULL,
  sku                 VARCHAR(100),
  category            VARCHAR(100),
  quantity            NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit                VARCHAR(30)   DEFAULT 'units',
  low_stock_threshold NUMERIC(10,3) NOT NULL DEFAULT 5,
  unit_cost           NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplier            VARCHAR(200),
  last_restocked      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT inventory_qty_check CHECK (quantity >= 0)
);

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_inventory_branch_qty
  ON inventory(branch_id, quantity);

-- =============================================================
-- TABLE 13: loyalty_points  (ledger — one row per transaction)
-- =============================================================
CREATE TABLE IF NOT EXISTS loyalty_points (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points       INTEGER NOT NULL,   -- positive = earned, negative = redeemed
  reason       VARCHAR(200),       -- 'Earned on Bill #SS-001' | 'Redeemed at POS'
  reference_id UUID,               -- bill_id or appointment_id
  reference_type VARCHAR(50),      -- 'bill' | 'appointment'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_points(customer_id);

-- =============================================================
-- TABLE 14: notifications
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID    REFERENCES users(id)    ON DELETE CASCADE,  -- for personal notifs
  branch_id      UUID    REFERENCES branches(id) ON DELETE CASCADE,  -- for branch-wide notifs
  type           VARCHAR(50) NOT NULL,   -- booking_confirmation | low_stock | bill | commission
  title          VARCHAR(200) NOT NULL,
  message        TEXT    NOT NULL,
  channel        VARCHAR(30) DEFAULT 'in_app',  -- in_app | sms | email | whatsapp
  reference_id   UUID,
  reference_type VARCHAR(50),
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_branch ON notifications(branch_id, is_read);

-- =============================================================
-- TABLE 15: customer_feedback
-- =============================================================
CREATE TABLE IF NOT EXISTS customer_feedback (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID    NOT NULL REFERENCES customers(id)    ON DELETE CASCADE,
  appointment_id UUID    REFERENCES appointments(id)          ON DELETE SET NULL,
  staff_id       UUID    REFERENCES staff(id)                 ON DELETE SET NULL,
  branch_id      UUID    REFERENCES branches(id)              ON DELETE SET NULL,
  rating         INTEGER NOT NULL,
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT feedback_rating_check CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_feedback_staff ON customer_feedback(staff_id);
CREATE INDEX IF NOT EXISTS idx_feedback_appt  ON customer_feedback(appointment_id);

-- =============================================================
-- TABLE 16: favorite_services
-- =============================================================
CREATE TABLE IF NOT EXISTS favorite_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id)   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT favorite_services_unique UNIQUE (customer_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_customer ON favorite_services(customer_id);

-- =============================================================
-- GRANTS (if using non-superuser role in production)
-- =============================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stylesynk;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO stylesynk;
