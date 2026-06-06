# Análisis de Migración: profiles → stores

> **Estado:** COMPLETADA en producción el 2026-06-05.
>
> Verificación post-migración:
> - `stores`: 7 filas.
> - `store_config`: 7 filas.
> - BarRes conserva 54 productos accesibles.
> - BarRes conserva 76 órdenes en `delivery_orders`.
> - 0 tiendas con `slug` o `name` nulos.

---

## 1. ¿Cuántos merchants aún NO están en `stores`?

No tenemos acceso directo al SQL en vivo, pero puedes ejecutar esta query de diagnóstico para saberlo antes de migrar:

```sql
-- ¿Cuántos perfiles todavía NO tienen entrada en stores?
SELECT count(*)
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = p.id
);

-- Vista previa de quiénes son (con nombres)
SELECT p.id, p.store_name, p.slug, p.template_type, p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.stores s WHERE s.id = p.id
)
ORDER BY p.created_at;
```

Resultado previo a migración: 7 merchants sin entrada en `stores`. Resultado posterior: 0 pendientes verificados por conteo total `stores = 7`.

---

## 2. Mapeo de Columnas: profiles → stores / store_config

### A) Columnas que van a `stores` (Identidad Pública)

| Columna en `profiles`  | Columna en `stores`   | Notas                                           |
|------------------------|-----------------------|-------------------------------------------------|
| `id`                   | `id`                  | UUID compartido — el pivote de toda la migración |
| `id`                   | `owner_id`            | Se repite el mismo UUID (diseño 1:1 actual)     |
| `slug`                 | `slug`                | Misma semántica, único requerido                |
| `store_name`           | `name`                | Renombrada en `stores`                          |
| `description`          | `description`         | Igual                                           |
| `avatar_url`           | `avatar_url`          | Igual                                           |
| `banner_url`           | `banner_url`          | Igual                                           |
| `template_type`        | `template_type`       | ⚠️ Ver nota de CHECK abajo                       |
| `whatsapp_phone`       | `whatsapp_phone`      | Igual                                           |
| `created_at`           | `created_at`          | Igual                                           |
| `updated_at`           | `updated_at`          | Igual                                           |

### B) Columnas que van a `store_config` (Configuración Visual/Geo)

| Columna en `profiles`     | Columna en `store_config` | Notas                              |
|---------------------------|---------------------------|------------------------------------|
| `primary_color`           | `primary_color`           | Igual                              |
| `secondary_color`         | `secondary_color`         | Igual                              |
| `store_lat`               | `store_lat`               | Igual                              |
| `store_lng`               | `store_lng`               | Igual                              |
| `direccion` o `store_address` | `store_address`       | Dos columnas → una (ver nota)      |
| `store_schedule`          | `store_schedule`          | Igual (JSONB)                      |

### C) Columnas que se quedan en `profiles` (Datos Sensibles del Merchant)

Estas columnas **no existen en `stores`** y deben permanecer en `profiles`:
- `plan`, `plan_expires_at` — datos de facturación SaaS
- `culqi_active`, `culqi_public_key`, `culqi_secret_key` — credenciales encriptadas
- `yape_image_url`, `plin_image_url` — imágenes de QR de pago
- `fomo_enabled`, `fomo_min_viewers`, `fomo_max_viewers`, `fomo_message` — motor FOMO
- `social_instagram`, `social_facebook`, `social_tiktok` — redes sociales
- `horario`, `whatsapp_order_template` — config legacy

---

## 3. Script SQL de Migración — PARA REVISIÓN

**Resultado:** Ejecutado en producción. El script migró los 7 perfiles a `stores` y creó 7 filas en `store_config`.

**Fix aplicado al constraint `template_type`:** el CHECK de `stores.template_type` fue corregido de `('restaurante', 'comercio', 'moda')` a `('food', 'comercio', 'moda')`, alineándolo con el modelo de negocio y el código actual. Verificado en producción:

```sql
CHECK ((template_type = ANY (ARRAY['food'::text, 'comercio'::text, 'moda'::text])))
```

```sql
-- ============================================================
-- MIGRACIÓN: profiles → stores + store_config
-- LinkVentas — Para ejecutar en Supabase SQL Editor
-- EJECUTAR SOLO TRAS REVISIÓN Y APROBACIÓN DEL USUARIO
-- ============================================================

-- ⚠️ PASO 0: DIAGNÓSTICO PREVIO (Ejecutar y revisar antes de continuar)
-- SELECT count(*) FROM public.profiles p
-- WHERE NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = p.id);

BEGIN;

-- ============================================================
-- PASO 1: Corrección del CHECK constraint en stores.template_type
-- El código usa 'food' pero el SQL de 002 tenía 'restaurante'.
-- Estandarizamos a los 3 valores confirmados por el usuario.
-- ============================================================
ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_template_type_check;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_template_type_check
  CHECK (template_type IN ('food', 'comercio', 'moda'));

-- ============================================================
-- PASO 2: Migrar datos de profiles a stores
-- Usando UPSERT para ser idempotente (seguro de re-ejecutar)
-- ============================================================
INSERT INTO public.stores (
  id,
  owner_id,
  slug,
  name,
  description,
  avatar_url,
  banner_url,
  template_type,
  whatsapp_phone,
  is_active,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.id AS owner_id,
  -- Generar slug si no tiene, para cumplir la restricción NOT NULL UNIQUE
  COALESCE(NULLIF(p.slug, ''), 'store-' || left(p.id::text, 8)) AS slug,
  COALESCE(NULLIF(p.store_name, ''), 'Tienda sin nombre') AS name,
  p.description,
  p.avatar_url,
  p.banner_url,
  -- Normalizar template_type: 'restaurante' → 'food', NULL → 'comercio'
  CASE
    WHEN p.template_type = 'restaurante' THEN 'food'
    WHEN p.template_type IN ('comercio', 'moda', 'food') THEN p.template_type
    ELSE 'comercio'
  END AS template_type,
  p.whatsapp_phone,
  true AS is_active,
  COALESCE(p.created_at, now()) AS created_at,
  COALESCE(p.updated_at, now()) AS updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  -- Solo migrar los que AÚN NO tienen entrada en stores
  SELECT 1 FROM public.stores s WHERE s.id = p.id
)
ON CONFLICT (id) DO NOTHING;  -- Seguridad extra: no sobreescribir registros ya migrados

-- ============================================================
-- PASO 3: Migrar configuración visual/geo a store_config
-- ============================================================
INSERT INTO public.store_config (
  store_id,
  primary_color,
  secondary_color,
  store_lat,
  store_lng,
  store_address,
  store_schedule,
  updated_at
)
SELECT
  p.id AS store_id,
  p.primary_color,
  p.secondary_color,
  p.store_lat,
  p.store_lng,
  -- Consolidar las dos columnas de dirección en una sola
  COALESCE(NULLIF(p.store_address, ''), NULLIF(p.direccion, '')) AS store_address,
  COALESCE(p.store_schedule, '{}') AS store_schedule,
  COALESCE(p.updated_at, now()) AS updated_at
FROM public.profiles p
WHERE EXISTS (
  -- Solo hacer store_config para profiles que ya tienen su entrada en stores
  SELECT 1 FROM public.stores s WHERE s.id = p.id
)
ON CONFLICT (store_id) DO NOTHING;  -- No sobreescribir config existente

-- ============================================================
-- PASO 4: Verificación Post-Migración
-- (Revisar que no queden perfiles sin stores)
-- ============================================================
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT count(*)
  INTO orphan_count
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = p.id
  );

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'ERROR: Quedaron % perfiles sin migrar. Revisa los datos.', orphan_count;
  ELSE
    RAISE NOTICE 'OK: Todos los perfiles tienen entrada en stores.';
  END IF;
END $$;

COMMIT;
```

---

## 4. Riesgos de RLS y Foreign Keys

### ✅ Resuelto — `delivery_orders.store_id → stores(id)`
El FK legacy de `delivery_orders.store_id` fue corregido en producción para apuntar a **`stores(id)`** en lugar de `profiles(id)`.

```sql
FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
```

Esto elimina el riesgo crítico de perder registros históricos de delivery si `profiles` se depreca en el futuro.

### 🟡 Riesgo MEDIO — Trigger `enforce_product_plan_limits` consulta `profiles`
El trigger de limite de productos (`005_saas_security.sql`, línea 170) hace un `SELECT FROM public.profiles WHERE id = NEW.user_id`. Si se mueven los datos de plan a otra tabla sin actualizar este trigger, los límites de plan dejarán de funcionar y todos los usuarios podrán crear productos ilimitadamente.

**Acción:** Por ahora `profiles` se mantiene para datos de facturación, así que este trigger es seguro.

### ✅ Resuelto — Constraint CHECK de `template_type` desalineado
El SQL de `002_core_schema.sql` definía el CHECK como `('restaurante', 'comercio', 'moda')`, pero el código usa `'food'`. La migración corrigió el constraint en producción a `('food', 'comercio', 'moda')`.

**Verificación:** `stores_template_type_check` ahora es `CHECK ((template_type = ANY (ARRAY['food'::text, 'comercio'::text, 'moda'::text])))`.

### 🟢 Riesgo BAJO — Slugs duplicados o nulos
Algunos merchants muy antiguos podrían no tener slug. El script genera uno automático (`store-XXXXXXXX`) para esos casos, cumpliendo el `UNIQUE NOT NULL` de `stores`.

### 🟢 Sin riesgo — Políticas RLS de `stores`
La tabla `stores` no tiene políticas RLS definidas aún en ningún archivo de migración. Esto es una brecha de seguridad separada que hay que resolver, pero no interfiere con esta migración.

---

## Resumen de Acciones Requeridas

| # | Acción | Seguridad |
|---|--------|-----------|
| 0 | Ejecutar query de diagnóstico para conocer el número real de afectados | Completado |
| 1 | Revisar este script y aprobarlo | Completado |
| 2 | Ejecutar el script en Supabase SQL Editor | Completado |
| 3 | Verificar post-migración que el `DO $$` final terminó con `OK` | Completado |
| 4 | (Futuro) Agregar políticas RLS a la tabla `stores` | Recomendado |
| 5 | Actualizar FK de `delivery_orders` de `profiles` a `stores` | Completado |
