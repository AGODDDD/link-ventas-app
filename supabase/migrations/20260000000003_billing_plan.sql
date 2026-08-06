-- ============================================================
-- LINKVENTAS — MIGRACIÓN 004: SISTEMA DE PLANES Y FACTURACIÓN
-- ============================================================
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- Valores posibles de `plan`: NULL, 'trial', 'free', 'pro', 'inactivo'
-- ============================================================

-- 1. Añadir columna `plan` si no existe
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT NULL;

-- 2. Añadir columna `plan_expires_at` si no existe
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Índice de rendimiento para filtros de plan en middleware y admin
CREATE INDEX IF NOT EXISTS idx_profiles_plan
  ON public.profiles(plan);

-- 4. Restricción de integridad: solo valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_check
      CHECK (plan IN ('trial', 'free', 'pro', 'inactivo') OR plan IS NULL);
  END IF;
END $$;

-- ============================================================
-- FIN DE MIGRACIÓN 004
-- ============================================================
-- INSTRUCCIONES:
--   1. Abre el SQL Editor de tu proyecto en supabase.com
--   2. Pega este script completo y presiona "Run"
--   3. Verifica que todos los comandos finalicen sin errores
-- ============================================================
