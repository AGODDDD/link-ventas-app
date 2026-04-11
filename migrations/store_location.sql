-- Agregar coordenadas del local a profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS store_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS store_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS store_address TEXT;

-- REPLICA IDENTITY FULL para que Realtime envíe todos los datos en UPDATE
ALTER TABLE delivery_orders REPLICA IDENTITY FULL;
