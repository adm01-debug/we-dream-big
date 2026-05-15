
-- Tabela de Novidades de Produtos
CREATE TABLE IF NOT EXISTS public.product_novelties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id TEXT,
    supplier_code TEXT,
    supplier_product_code TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    is_highlighted BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_novelties_product ON product_novelties(product_id);
CREATE INDEX IF NOT EXISTS idx_novelties_expires ON product_novelties(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_novelties_supplier ON product_novelties(supplier_code);
CREATE INDEX IF NOT EXISTS idx_novelties_highlighted ON product_novelties(is_highlighted) WHERE is_active = true;

-- Habilitar RLS
ALTER TABLE public.product_novelties ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Anyone can view novelties" ON product_novelties;
CREATE POLICY "Anyone can view novelties" ON product_novelties
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage novelties" ON product_novelties;
CREATE POLICY "Admins can manage novelties" ON product_novelties
    FOR ALL USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service can manage novelties" ON product_novelties;
CREATE POLICY "Service can manage novelties" ON product_novelties
    FOR ALL USING (true) WITH CHECK (true);

-- View com dados completos
CREATE OR REPLACE VIEW public.v_product_novelties AS
SELECT 
    n.id AS novelty_id,
    n.product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    p.description AS product_description,
    p.price AS base_price,
    p.images[1] AS product_image,
    n.supplier_id,
    n.supplier_code,
    n.supplier_product_code,
    p.supplier_name,
    p.category_id,
    p.category_name,
    n.detected_at,
    n.expires_at,
    n.is_highlighted,
    n.is_active,
    GREATEST(0, EXTRACT(DAY FROM (n.expires_at - NOW())))::INTEGER AS days_remaining,
    CASE 
        WHEN n.expires_at < NOW() THEN 'expired'
        WHEN n.expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
        ELSE 'active'
    END AS status
FROM public.product_novelties n
JOIN public.products p ON n.product_id = p.id
WHERE n.is_active = true;

-- Função para adicionar novidade
CREATE OR REPLACE FUNCTION add_product_novelty(
    p_product_id UUID,
    p_supplier_code TEXT DEFAULT NULL,
    p_supplier_product_code TEXT DEFAULT NULL,
    p_days_valid INTEGER DEFAULT 30,
    p_is_highlighted BOOLEAN DEFAULT false
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
        expires_at,
        is_highlighted
    ) VALUES (
        p_product_id,
        p_supplier_code,
        p_supplier_product_code,
        NOW() + (p_days_valid || ' days')::INTERVAL,
        p_is_highlighted
    )
    ON CONFLICT (product_id) DO UPDATE SET
        expires_at = NOW() + (p_days_valid || ' days')::INTERVAL,
        is_highlighted = COALESCE(p_is_highlighted, product_novelties.is_highlighted),
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO v_novelty_id;
    
    RETURN v_novelty_id;
END;
$$;

-- Função para buscar novidades ativas
CREATE OR REPLACE FUNCTION get_active_novelties(
    p_supplier_code TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_only_highlighted BOOLEAN DEFAULT false
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
    days_remaining INTEGER,
    is_highlighted BOOLEAN
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
        v.days_remaining,
        v.is_highlighted
    FROM v_product_novelties v
    WHERE 
        v.status != 'expired'
        AND (p_supplier_code IS NULL OR v.supplier_code = p_supplier_code)
        AND (NOT p_only_highlighted OR v.is_highlighted = true)
    ORDER BY v.detected_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Função para estatísticas
CREATE OR REPLACE FUNCTION get_novelties_stats()
RETURNS TABLE (
    total_novelties BIGINT,
    active_novelties BIGINT,
    highlighted_novelties BIGINT,
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
        COUNT(*) FILTER (WHERE is_highlighted = true)::BIGINT AS highlighted_novelties,
        COUNT(*) FILTER (WHERE status = 'expiring_soon')::BIGINT AS expiring_soon,
        COALESCE(
            jsonb_object_agg(
                COALESCE(supplier_code, 'outros'), 
                supplier_count
            ),
            '{}'::jsonb
        ) AS by_supplier
    FROM v_product_novelties,
    LATERAL (
        SELECT supplier_code AS sc, COUNT(*)::BIGINT AS supplier_count
        FROM v_product_novelties v2
        GROUP BY v2.supplier_code
    ) supplier_stats
    LIMIT 1;
END;
$$;

-- Função para limpar expirados
CREATE OR REPLACE FUNCTION cleanup_expired_novelties()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE product_novelties
    SET is_active = false, updated_at = NOW()
    WHERE expires_at < NOW() AND is_active = true;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_product_novelties_updated_at ON product_novelties;
CREATE TRIGGER update_product_novelties_updated_at
    BEFORE UPDATE ON product_novelties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
