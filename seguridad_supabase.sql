-- ############################################################
-- # LINKVENTAS MASTER DATABASE SCHEMA & SECURITY SETUP
-- ############################################################
-- Este script configura TODA la base de datos de LinkVentas de una sola vez.
-- Se puede ejecutar varias veces sin romper nada (Idempotente).

-- ------------------------------------------------------------
-- 1. ESTRUCTURA DE TABLAS (ALTERACIONES & EXTENSIONES)
-- ------------------------------------------------------------

-- Perfiles de Tienda (Profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_enabled boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_min_viewers integer DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_max_viewers integer DEFAULT 24;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fomo_message text DEFAULT '{count} personas están evaluando esta oferta ahora mismo';

-- Productos (Products)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer DEFAULT NULL;

-- ------------------------------------------------------------
-- 2. ACTIVAR SEGURIDAD (RLS)
-- ------------------------------------------------------------
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS store_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. POLÍTICAS DE ACCESO (CORTAFUEGOS)
-- ------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "Acceso público para tiendas" ON profiles;
CREATE POLICY "Acceso público para tiendas" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants pueden editar su perfil" ON profiles;
CREATE POLICY "Merchants pueden editar su perfil" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- PRODUCTS
DROP POLICY IF EXISTS "Productos visibles para todos" ON products;
CREATE POLICY "Productos visibles para todos" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Merchants gestionan sus productos" ON products;
CREATE POLICY "Merchants gestionan sus productos" ON products ALL TO authenticated USING (auth.uid() = user_id);

-- ORDERS
DROP POLICY IF EXISTS "Merchants ven sus propias órdenes" ON orders;
CREATE POLICY "Merchants ven sus propias órdenes" ON orders FOR SELECT TO authenticated USING (auth.uid() = merchant_id);

DROP POLICY IF EXISTS "Clientes pueden crear órdenes" ON orders;
CREATE POLICY "Clientes pueden crear órdenes" ON orders FOR INSERT WITH CHECK (true);

-- LEADS
DROP POLICY IF EXISTS "Merchants ven sus propios leads" ON store_leads;
CREATE POLICY "Merchants ven sus propios leads" ON store_leads FOR SELECT TO authenticated USING (auth.uid() = store_id);

DROP POLICY IF EXISTS "Clientes pueden registrar leads" ON store_leads;
CREATE POLICY "Clientes pueden registrar leads" ON store_leads FOR INSERT WITH CHECK (true);

-- ############################################################
-- # INSTRUCCIONES:
-- # 1. Copia todo este código.
-- # 2. Pégalo en el "SQL Editor" de Supabase.
-- # 3. Dale a "Run".
-- ############################################################
