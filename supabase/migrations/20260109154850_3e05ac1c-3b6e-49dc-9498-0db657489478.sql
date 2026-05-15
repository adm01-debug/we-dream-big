
-- Dropar funções com assinatura antiga
DROP FUNCTION IF EXISTS get_active_novelties(TEXT, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS get_novelties_stats();
DROP FUNCTION IF EXISTS add_product_novelty(UUID, TEXT, TEXT, INTEGER, BOOLEAN);

-- Recriar função add_product_novelty (sem is_highlighted)
CREATE OR REPLACE FUNCTION add_product_novelty(
    p_product_id UUID,
    p_supplier_code TEXT DEFAULT NULL,
    p_supplier_product_code TEXT DEFAULT NULL,
    p_days_valid INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_novelty_id UUID;
BEGIN
    INSERT INTO product_novelties (
        product_id,
        supplier_code,
        supplier_product_code,
        expires_at
    ) VALUES (
        p_product_id,
        p_supplier_code,
        p_supplier_product_code,
        NOW() + (p_days_valid || ' days')::INTERVAL
    )
    ON CONFLICT (product_id) DO UPDATE SET
        expires_at = NOW() + (p_days_valid || ' days')::INTERVAL,
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO v_novelty_id;
    
    RETURN v_novelty_id;
END;
$$;

-- Recriar função get_active_novelties (sem filtro highlighted)
CREATE OR REPLACE FUNCTION get_active_novelties(
    p_supplier_code TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    novelty_id UUID,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    supplier_code TEXT,
    supplier_product_code TEXT,
    detected_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.novelty_id,
        v.product_id,
        v.product_name,
        v.product_sku,
        v.supplier_code,
        v.supplier_product_code,
        v.detected_at,
        v.expires_at,
        v.days_remaining
    FROM v_product_novelties v
    WHERE 
        v.status != 'expired'
        AND (p_supplier_code IS NULL OR v.supplier_code = p_supplier_code)
    ORDER BY v.detected_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Recriar função de estatísticas (sem highlighted)
CREATE OR REPLACE FUNCTION get_novelties_stats()
RETURNS TABLE (
    total_novelties BIGINT,
    active_novelties BIGINT,
    expiring_soon BIGINT,
    by_supplier JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_novelties,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_novelties,
        COUNT(*) FILTER (WHERE status = 'expiring_soon')::BIGINT AS expiring_soon,
        COALESCE(
            (SELECT jsonb_object_agg(COALESCE(sc, 'outros'), cnt)
             FROM (SELECT supplier_code AS sc, COUNT(*)::BIGINT AS cnt FROM v_product_novelties GROUP BY supplier_code) sub),
            '{}'::jsonb
        ) AS by_supplier
    FROM v_product_novelties;
END;
$$;
