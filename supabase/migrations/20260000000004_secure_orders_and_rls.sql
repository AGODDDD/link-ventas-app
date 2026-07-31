-- Preparación de privilegios. El contrato definitivo de pedidos e inventario
-- queda definido en 20260730000000_contract_cleanup.sql.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders, public.order_items, public.abandoned_carts FROM anon;
