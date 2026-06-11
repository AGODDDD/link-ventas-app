-- Agregar columna store_schedule a profiles
-- Formato JSON: { "lun": { "active": true, "open": "09:00", "close": "22:00" }, ... }
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS store_schedule JSONB DEFAULT NULL;
