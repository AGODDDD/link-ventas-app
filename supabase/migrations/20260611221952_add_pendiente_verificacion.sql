-- Agregar estado "pendiente_verificacion" al CHECK constraint de delivery_orders
ALTER TABLE delivery_orders 
  DROP CONSTRAINT IF EXISTS delivery_orders_status_check;

ALTER TABLE delivery_orders 
  ADD CONSTRAINT delivery_orders_status_check 
  CHECK (status IN ('pendiente_pago', 'pendiente_verificacion', 'pendiente', 'en_preparacion', 'alistando', 'en_camino', 'completado', 'cancelado'));
