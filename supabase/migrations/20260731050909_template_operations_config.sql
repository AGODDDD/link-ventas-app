-- Configuración operativa diferenciada por plantilla.
-- Se conserva en un único documento versionable para evitar columnas
-- irrelevantes en stores y permitir que cada plantilla evolucione.
ALTER TABLE public.store_config
  ADD COLUMN IF NOT EXISTS operations_config JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE public.store_config
  DROP CONSTRAINT IF EXISTS store_config_operations_config_object;

ALTER TABLE public.store_config
  ADD CONSTRAINT store_config_operations_config_object
  CHECK (jsonb_typeof(operations_config) = 'object');
