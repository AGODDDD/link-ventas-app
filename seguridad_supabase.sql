-- # SECURITY AUDIT: LINKVENTAS SUPABASE RLS
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase para activar el "cortafuegos" de la base de datos.

-- 1. Activar RLS en las tablas y Alteraciones de Módulos (Stock)
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS store_leads ENABLE ROW LEVEL SECURITY;

-- Módulo de Control de Inventario
-- ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer DEFAULT NULL;

-- Módulo de Facturación Electrónica (SUNAT)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sol_ruc varchar(11) DEFAULT NULL;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sol_usuario varchar(255) DEFAULT NULL;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sol_password varchar(255) DEFAULT NULL;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certificado_digital_url text DEFAULT NULL;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certificado_password varchar(255) DEFAULT NULL;

-- 2. POLÍTICAS PARA 'PROFILES'
-- Permitir que cualquiera vea perfiles públicos (necesario para la tienda)
CREATE POLICY "Acceso público para tiendas"
ON profiles FOR SELECT
USING (true);

-- Permitir que el dueño edite su propio perfil
CREATE POLICY "Merchants pueden editar su perfil"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. POLÍTICAS PARA 'ORDERS'
-- Los merchants solo pueden ver las órdenes vinculadas a su ID
CREATE POLICY "Merchants ven sus propias órdenes"
ON orders FOR SELECT
TO authenticated
USING (auth.uid() = merchant_id);

-- Los clientes pueden crear órdenes (INSERT público), pero no leerlas todas
CREATE POLICY "Clientes pueden crear órdenes"
ON orders FOR INSERT
WITH CHECK (true);

-- 4. POLÍTICAS PARA 'STORE_LEADS'
-- Los merchants solo ven sus propios leads
CREATE POLICY "Merchants ven sus propios leads"
ON store_leads FOR SELECT
TO authenticated
USING (auth.uid() = store_id);

-- Los clientes pueden registrarse como leads
CREATE POLICY "Clientes pueden registrar leads"
ON store_leads FOR INSERT
WITH CHECK (true);

-- # NOTA IMPORTANTE:
-- Al usar 'auth.uid() = merchant_id', Supabase filtra automáticamente los datos
-- incluso si olvidas poner el .eq('merchant_id', id) en tu código de Next.js.
