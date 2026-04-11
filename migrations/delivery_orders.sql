-- =====================================================
-- TABLA: delivery_orders
-- Gestión de pedidos delivery con 6 estados de timeline
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY,                          -- e.g. "BARR-100426-3847"
  store_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Status timeline (6 pasos)
  status TEXT NOT NULL DEFAULT 'pendiente_pago'
    CHECK (status IN ('pendiente_pago', 'pendiente', 'en_preparacion', 'alistando', 'en_camino', 'completado')),
  
  -- Cliente
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Dirección de entrega
  direccion TEXT,
  referencia TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  
  -- Pedido
  items JSONB NOT NULL DEFAULT '[]',            -- Array of {name, quantity, unitPrice, totalPrice, options, notes}
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Pago
  metodo_pago TEXT DEFAULT 'whatsapp',
  estimated_time TEXT DEFAULT '50 - 60 min',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para búsquedas por tienda
CREATE INDEX IF NOT EXISTS idx_delivery_orders_store ON delivery_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_date ON delivery_orders(created_at DESC);

-- RLS: Row Level Security
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

-- Política: El vendedor (store owner) puede ver y editar sus pedidos
CREATE POLICY "Vendedor ve sus pedidos" ON delivery_orders
  FOR SELECT USING (store_id = auth.uid());

CREATE POLICY "Vendedor actualiza sus pedidos" ON delivery_orders
  FOR UPDATE USING (store_id = auth.uid());

-- Política: Cualquiera puede insertar (clientes no autenticados crean pedidos)
CREATE POLICY "Clientes crean pedidos" ON delivery_orders
  FOR INSERT WITH CHECK (true);

-- Política: Lectura pública para que el cliente vea su pedido (por ID)
CREATE POLICY "Lectura pública por ID" ON delivery_orders
  FOR SELECT USING (true);

-- Auto-update de updated_at
CREATE OR REPLACE FUNCTION update_delivery_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_orders_updated_at();

-- Habilitar Realtime para esta tabla
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_orders;
