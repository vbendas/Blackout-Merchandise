-- Migration: Add indexes and RLS policies for production
-- This migration adds performance indexes and Row Level Security policies

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" ("clerk_id");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "users_stripe_customer_idx" ON "users" ("stripe_customer_id");

-- Artist Stores table indexes
CREATE INDEX IF NOT EXISTS "artist_stores_artist_id_idx" ON "artist_stores" ("artist_id");
CREATE INDEX IF NOT EXISTS "artist_stores_slug_idx" ON "artist_stores" ("slug");
CREATE INDEX IF NOT EXISTS "artist_stores_live_idx" ON "artist_stores" ("is_live");
CREATE INDEX IF NOT EXISTS "artist_stores_artist_live_idx" ON "artist_stores" ("artist_id", "is_live");

-- Products table indexes
CREATE INDEX IF NOT EXISTS "products_store_id_idx" ON "products" ("store_id");
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" ("name");
CREATE INDEX IF NOT EXISTS "products_active_idx" ON "products" ("is_active");
CREATE INDEX IF NOT EXISTS "products_store_active_idx" ON "products" ("store_id", "is_active");

-- Full-text search index for products
CREATE INDEX IF NOT EXISTS "products_search_idx" ON "products" 
USING gin(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- Orders table indexes
CREATE INDEX IF NOT EXISTS "orders_store_id_idx" ON "orders" ("store_id");
CREATE INDEX IF NOT EXISTS "orders_customer_id_idx" ON "orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "orders_stripe_idx" ON "orders" ("stripe_payment_intent_id");
CREATE INDEX IF NOT EXISTS "orders_customer_created_idx" ON "orders" ("customer_id", "created_at");
CREATE INDEX IF NOT EXISTS "orders_store_status_idx" ON "orders" ("store_id", "status");

-- Order Items table indexes
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items" ("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "order_items_order_product_idx" ON "order_items" ("order_id", "product_id");

-- Chat Sessions table indexes
CREATE INDEX IF NOT EXISTS "chat_sessions_user_id_idx" ON "chat_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "chat_sessions_user_updated_idx" ON "chat_sessions" ("user_id", "updated_at");

-- GDPR Consents table indexes
CREATE INDEX IF NOT EXISTS "consents_user_id_idx" ON "consents" ("user_id");
CREATE INDEX IF NOT EXISTS "consents_type_idx" ON "consents" ("consent_type");
CREATE INDEX IF NOT EXISTS "consents_user_type_idx" ON "consents" ("user_id", "consent_type");

-- GDPR Data Subject Requests table indexes
CREATE INDEX IF NOT EXISTS "dsr_user_id_idx" ON "data_subject_requests" ("user_id");
CREATE INDEX IF NOT EXISTS "dsr_status_idx" ON "data_subject_requests" ("status");
CREATE INDEX IF NOT EXISTS "dsr_type_idx" ON "data_subject_requests" ("request_type");
CREATE INDEX IF NOT EXISTS "dsr_status_type_idx" ON "data_subject_requests" ("status", "request_type");

-- GDPR Data Breach Logs table indexes
CREATE INDEX IF NOT EXISTS "breach_severity_idx" ON "data_breach_logs" ("severity");
CREATE INDEX IF NOT EXISTS "breach_notified_idx" ON "data_breach_logs" ("notified_at");

-- Waitlist table indexes
CREATE INDEX IF NOT EXISTS "waitlist_email_idx" ON "waitlist" ("email");
CREATE INDEX IF NOT EXISTS "waitlist_status_idx" ON "waitlist" ("status");
CREATE INDEX IF NOT EXISTS "waitlist_source_idx" ON "waitlist" ("source");
CREATE INDEX IF NOT EXISTS "waitlist_position_idx" ON "waitlist" ("position");
CREATE INDEX IF NOT EXISTS "waitlist_status_position_idx" ON "waitlist" ("status", "position");

-- Product Blanks table indexes
CREATE INDEX IF NOT EXISTS "product_blanks_sku_idx" ON "product_blanks" ("sku");
CREATE INDEX IF NOT EXISTS "product_blanks_category_idx" ON "product_blanks" ("category");
CREATE INDEX IF NOT EXISTS "product_blanks_brand_idx" ON "product_blanks" ("brand");
CREATE INDEX IF NOT EXISTS "product_blanks_active_idx" ON "product_blanks" ("is_active");
CREATE INDEX IF NOT EXISTS "product_blanks_category_active_idx" ON "product_blanks" ("category", "is_active");

-- Full-text search index for product blanks
CREATE INDEX IF NOT EXISTS "product_blanks_search_idx" ON "product_blanks" 
USING gin(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(brand, '')));

-- Webhook Events table indexes (for idempotency)
CREATE INDEX IF NOT EXISTS "webhook_events_source_idx" ON "webhook_events" ("source");
CREATE INDEX IF NOT EXISTS "webhook_events_type_idx" ON "webhook_events" ("event_type");
CREATE INDEX IF NOT EXISTS "webhook_events_processed_idx" ON "webhook_events" ("processed_at");
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_event_id_idx" ON "webhook_events" ("source", "event_id");

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables with user data
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artist_stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_subject_requests" ENABLE ROW LEVEL SECURITY;

-- Note: waitlist and product_blanks are public data, no RLS needed
-- Note: webhook_events and data_breach_logs are system tables, no RLS needed

-- Users table policies
CREATE POLICY "users_select_own" ON "users"
  FOR SELECT USING (clerk_id = current_setting('app.current_user_id', true));

CREATE POLICY "users_select_all" ON "users"
  FOR SELECT USING (true); -- Public profiles

CREATE POLICY "users_update_own" ON "users"
  FOR UPDATE USING (clerk_id = current_setting('app.current_user_id', true));

-- Artist Stores table policies
CREATE POLICY "stores_select_public" ON "artist_stores"
  FOR SELECT USING (is_live = true);

CREATE POLICY "stores_select_own" ON "artist_stores"
  FOR SELECT USING (
    artist_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "stores_modify_own" ON "artist_stores"
  FOR ALL USING (
    artist_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

-- Products table policies
CREATE POLICY "products_select_public" ON "products"
  FOR SELECT USING (
    is_active = true AND 
    store_id IN (
      SELECT id FROM artist_stores WHERE is_live = true
    )
  );

CREATE POLICY "products_select_own" ON "products"
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM artist_stores 
      WHERE artist_id IN (
        SELECT id FROM users 
        WHERE clerk_id = current_setting('app.current_user_id', true)
      )
    )
  );

CREATE POLICY "products_modify_own" ON "products"
  FOR ALL USING (
    store_id IN (
      SELECT id FROM artist_stores 
      WHERE artist_id IN (
        SELECT id FROM users 
        WHERE clerk_id = current_setting('app.current_user_id', true)
      )
    )
  );

-- Orders table policies
CREATE POLICY "orders_select_own" ON "orders"
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "orders_select_store_owner" ON "orders"
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM artist_stores 
      WHERE artist_id IN (
        SELECT id FROM users 
        WHERE clerk_id = current_setting('app.current_user_id', true)
      )
    )
  );

CREATE POLICY "orders_create_own" ON "orders"
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

-- Order Items table policies
CREATE POLICY "order_items_select_own" ON "order_items"
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE customer_id IN (
        SELECT id FROM users 
        WHERE clerk_id = current_setting('app.current_user_id', true)
      )
    )
  );

CREATE POLICY "order_items_select_store_owner" ON "order_items"
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE store_id IN (
        SELECT id FROM artist_stores 
        WHERE artist_id IN (
          SELECT id FROM users 
          WHERE clerk_id = current_setting('app.current_user_id', true)
        )
      )
    )
  );

-- Chat Sessions table policies
CREATE POLICY "chat_sessions_select_own" ON "chat_sessions"
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    ) OR user_id IS NULL -- Allow anonymous sessions temporarily
  );

CREATE POLICY "chat_sessions_modify_own" ON "chat_sessions"
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

-- GDPR Consents table policies
CREATE POLICY "consents_select_own" ON "consents"
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "consents_create_own" ON "consents"
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

-- GDPR Data Subject Requests table policies
CREATE POLICY "dsr_select_own" ON "data_subject_requests"
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "dsr_create_own" ON "data_subject_requests"
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE clerk_id = current_setting('app.current_user_id', true)
    )
  );

-- ============================================
-- FUNCTION TO SET CURRENT USER CONTEXT
-- ============================================

-- Function to set the current user for RLS
CREATE OR REPLACE FUNCTION set_current_user(user_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'users', 'artist_stores', 'products', 'orders', 
    'chat_sessions', 'consents', 'product_blanks'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I;',
      table_name || '_updated_at',
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I
       BEFORE UPDATE ON %I
       FOR EACH ROW
       EXECUTE FUNCTION update_updated_at_column();',
      table_name || '_updated_at',
      table_name
    );
  END LOOP;
END $$;
