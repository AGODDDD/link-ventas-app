-- Migration: 20260000000003_store_order_sequences
-- Description: Create sequences table and RPC for daily sequential order IDs

CREATE TABLE IF NOT EXISTS store_sequences (
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    seq_value INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (store_id, date)
);

-- Habilitar RLS para seguridad
ALTER TABLE store_sequences ENABLE ROW LEVEL SECURITY;

-- Crear RPC para obtener e incrementar atómicamente la secuencia diaria
CREATE OR REPLACE FUNCTION get_next_order_sequence(p_store_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de creador para saltar RLS en store_sequences
AS $$
DECLARE
    v_seq INTEGER;
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::DATE;
BEGIN
    INSERT INTO store_sequences (store_id, date, seq_value)
    VALUES (p_store_id, v_today, 1)
    ON CONFLICT (store_id, date)
    DO UPDATE SET seq_value = store_sequences.seq_value + 1
    RETURNING seq_value INTO v_seq;
    
    RETURN v_seq;
END;
$$;
