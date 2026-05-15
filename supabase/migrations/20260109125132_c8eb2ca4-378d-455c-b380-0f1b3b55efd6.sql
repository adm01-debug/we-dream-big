
-- =====================================================
-- SISTEMA DE CORES - 3 NÍVEIS HIERÁRQUICOS
-- =====================================================

-- 1. GRUPOS DE COR (Nível Master - para filtros)
CREATE TABLE IF NOT EXISTS public.color_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    hex_code VARCHAR(7),
    sort_order INT DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VARIAÇÕES DE COR (Tons específicos)
CREATE TABLE IF NOT EXISTS public.color_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES color_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    hex_code VARCHAR(7),
    description TEXT,
    sort_order INT DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, slug)
);

-- 3. NUANCES/ACABAMENTOS (independente de cor)
CREATE TABLE IF NOT EXISTS public.color_nuances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_color_variations_group ON color_variations(group_id);
CREATE INDEX IF NOT EXISTS idx_color_groups_active ON color_groups(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_color_variations_active ON color_variations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_color_nuances_active ON color_nuances(is_active) WHERE is_active = true;

-- RLS - Todos podem visualizar, apenas admins gerenciam
ALTER TABLE color_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_nuances ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura (todos autenticados)
DROP POLICY IF EXISTS "Anyone can view color groups" ON color_groups;
CREATE POLICY "Anyone can view color groups" ON color_groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can view color variations" ON color_variations;
CREATE POLICY "Anyone can view color variations" ON color_variations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can view color nuances" ON color_nuances;
CREATE POLICY "Anyone can view color nuances" ON color_nuances FOR SELECT USING (true);

-- Políticas de escrita (apenas admins)
CREATE POLICY "Admins can manage color groups" ON color_groups FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage color variations" ON color_variations FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage color nuances" ON color_nuances FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Grupos de Cor (15 grupos)
INSERT INTO color_groups (name, slug, hex_code, sort_order) VALUES
('Branco', 'branco', '#FFFFFF', 1),
('Preto', 'preto', '#000000', 2),
('Cinza', 'cinza', '#808080', 3),
('Azul', 'azul', '#2196F3', 4),
('Verde', 'verde', '#4CAF50', 5),
('Vermelho', 'vermelho', '#F44336', 6),
('Amarelo', 'amarelo', '#FFEB3B', 7),
('Laranja', 'laranja', '#FF9800', 8),
('Rosa', 'rosa', '#E91E63', 9),
('Roxo', 'roxo', '#9C27B0', 10),
('Marrom', 'marrom', '#795548', 11),
('Bege', 'bege', '#D7CCC8', 12),
('Dourado', 'dourado', '#FFD700', 13),
('Prata', 'prata', '#C0C0C0', 14),
('Transparente', 'transparente', '#FFFFFF', 15);

-- Nuances (6 acabamentos)
INSERT INTO color_nuances (name, slug, sort_order) VALUES
('Brilhante', 'brilhante', 1),
('Fosco', 'fosco', 2),
('Metalizado', 'metalizado', 3),
('Perolizado', 'perolizado', 4),
('Fluorescente', 'fluorescente', 5),
('Translúcido', 'translucido', 6);

-- Variações de Cor (principais tons por grupo)
-- Brancos
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Branco', 'branco', '#FFFFFF', 1 FROM color_groups WHERE slug = 'branco';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Branco Gelo', 'branco-gelo', '#F5F5F5', 2 FROM color_groups WHERE slug = 'branco';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Off-White', 'off-white', '#FAF9F6', 3 FROM color_groups WHERE slug = 'branco';

-- Pretos
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Preto', 'preto', '#000000', 1 FROM color_groups WHERE slug = 'preto';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Preto Grafite', 'preto-grafite', '#1C1C1C', 2 FROM color_groups WHERE slug = 'preto';

-- Cinzas
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Cinza Claro', 'cinza-claro', '#D3D3D3', 1 FROM color_groups WHERE slug = 'cinza';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Cinza Médio', 'cinza-medio', '#808080', 2 FROM color_groups WHERE slug = 'cinza';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Cinza Escuro', 'cinza-escuro', '#404040', 3 FROM color_groups WHERE slug = 'cinza';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Cinza Chumbo', 'cinza-chumbo', '#36454F', 4 FROM color_groups WHERE slug = 'cinza';

-- Azuis
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Azul Royal', 'azul-royal', '#4169E1', 1 FROM color_groups WHERE slug = 'azul';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Azul Marinho', 'azul-marinho', '#000080', 2 FROM color_groups WHERE slug = 'azul';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Azul Bebê', 'azul-bebe', '#89CFF0', 3 FROM color_groups WHERE slug = 'azul';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Azul Turquesa', 'azul-turquesa', '#40E0D0', 4 FROM color_groups WHERE slug = 'azul';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Azul Petróleo', 'azul-petroleo', '#006666', 5 FROM color_groups WHERE slug = 'azul';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Azul Celeste', 'azul-celeste', '#87CEEB', 6 FROM color_groups WHERE slug = 'azul';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Azul Cobalto', 'azul-cobalto', '#0047AB', 7 FROM color_groups WHERE slug = 'azul';

-- Verdes
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Verde Escuro', 'verde-escuro', '#006400', 1 FROM color_groups WHERE slug = 'verde';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Verde Limão', 'verde-limao', '#32CD32', 2 FROM color_groups WHERE slug = 'verde';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Verde Esmeralda', 'verde-esmeralda', '#50C878', 3 FROM color_groups WHERE slug = 'verde';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Verde Musgo', 'verde-musgo', '#8B8B00', 4 FROM color_groups WHERE slug = 'verde';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Verde Oliva', 'verde-oliva', '#808000', 5 FROM color_groups WHERE slug = 'verde';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Verde Água', 'verde-agua', '#66CDAA', 6 FROM color_groups WHERE slug = 'verde';

-- Vermelhos
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Vermelho', 'vermelho', '#FF0000', 1 FROM color_groups WHERE slug = 'vermelho';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Vermelho Escuro', 'vermelho-escuro', '#8B0000', 2 FROM color_groups WHERE slug = 'vermelho';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Bordô', 'bordo', '#800020', 3 FROM color_groups WHERE slug = 'vermelho';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Vinho', 'vinho', '#722F37', 4 FROM color_groups WHERE slug = 'vermelho';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Coral', 'coral', '#FF7F50', 5 FROM color_groups WHERE slug = 'vermelho';

-- Amarelos
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Amarelo', 'amarelo', '#FFFF00', 1 FROM color_groups WHERE slug = 'amarelo';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Amarelo Ouro', 'amarelo-ouro', '#FFD700', 2 FROM color_groups WHERE slug = 'amarelo';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Amarelo Canário', 'amarelo-canario', '#FFEF00', 3 FROM color_groups WHERE slug = 'amarelo';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Mostarda', 'mostarda', '#FFDB58', 4 FROM color_groups WHERE slug = 'amarelo';

-- Laranjas
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Laranja', 'laranja', '#FFA500', 1 FROM color_groups WHERE slug = 'laranja';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Laranja Escuro', 'laranja-escuro', '#FF8C00', 2 FROM color_groups WHERE slug = 'laranja';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Tangerina', 'tangerina', '#FF9966', 3 FROM color_groups WHERE slug = 'laranja';

-- Rosas
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Rosa', 'rosa', '#FFC0CB', 1 FROM color_groups WHERE slug = 'rosa';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Rosa Pink', 'rosa-pink', '#FF69B4', 2 FROM color_groups WHERE slug = 'rosa';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Rosa Bebê', 'rosa-bebe', '#F4C2C2', 3 FROM color_groups WHERE slug = 'rosa';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Fúcsia', 'fucsia', '#FF00FF', 4 FROM color_groups WHERE slug = 'rosa';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Magenta', 'magenta', '#FF0090', 5 FROM color_groups WHERE slug = 'rosa';

-- Roxos
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Roxo', 'roxo', '#800080', 1 FROM color_groups WHERE slug = 'roxo';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Lilás', 'lilas', '#C8A2C8', 2 FROM color_groups WHERE slug = 'roxo';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Violeta', 'violeta', '#EE82EE', 3 FROM color_groups WHERE slug = 'roxo';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Lavanda', 'lavanda', '#E6E6FA', 4 FROM color_groups WHERE slug = 'roxo';

-- Marrons
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Marrom', 'marrom', '#8B4513', 1 FROM color_groups WHERE slug = 'marrom';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Marrom Escuro', 'marrom-escuro', '#654321', 2 FROM color_groups WHERE slug = 'marrom';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Café', 'cafe', '#6F4E37', 3 FROM color_groups WHERE slug = 'marrom';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Caramelo', 'caramelo', '#FFD59A', 4 FROM color_groups WHERE slug = 'marrom';

-- Beges
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Bege', 'bege', '#F5F5DC', 1 FROM color_groups WHERE slug = 'bege';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Creme', 'creme', '#FFFDD0', 2 FROM color_groups WHERE slug = 'bege';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Areia', 'areia', '#C2B280', 3 FROM color_groups WHERE slug = 'bege';

-- Dourados
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Dourado', 'dourado', '#FFD700', 1 FROM color_groups WHERE slug = 'dourado';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Ouro Velho', 'ouro-velho', '#CFB53B', 2 FROM color_groups WHERE slug = 'dourado';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Champagne', 'champagne', '#F7E7CE', 3 FROM color_groups WHERE slug = 'dourado';

-- Pratas
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Prata', 'prata', '#C0C0C0', 1 FROM color_groups WHERE slug = 'prata';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Cromado', 'cromado', '#E8E8E8', 2 FROM color_groups WHERE slug = 'prata';

-- Transparentes
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Transparente', 'transparente', '#FFFFFF', 1 FROM color_groups WHERE slug = 'transparente';
INSERT INTO color_variations (group_id, name, slug, hex_code, sort_order)
SELECT id, 'Cristal', 'cristal', '#E0E0E0', 2 FROM color_groups WHERE slug = 'transparente';

-- =====================================================
-- VIEW PARA FACILITAR CONSULTAS
-- =====================================================

CREATE OR REPLACE VIEW public.v_color_hierarchy AS
SELECT 
    cg.id AS group_id,
    cg.name AS group_name,
    cg.slug AS group_slug,
    cg.hex_code AS group_hex,
    cg.sort_order AS group_sort,
    cv.id AS variation_id,
    cv.name AS variation_name,
    cv.slug AS variation_slug,
    cv.hex_code AS variation_hex,
    cv.sort_order AS variation_sort
FROM color_groups cg
LEFT JOIN color_variations cv ON cv.group_id = cg.id AND cv.is_active = true
WHERE cg.is_active = true
ORDER BY cg.sort_order, cv.sort_order;

-- =====================================================
-- FUNÇÃO RPC PARA FILTROS DO CATÁLOGO
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_color_filters()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'groups', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', cg.id,
                    'name', cg.name,
                    'slug', cg.slug,
                    'hex_code', cg.hex_code,
                    'variations', (
                        SELECT COALESCE(json_agg(
                            json_build_object(
                                'id', cv.id,
                                'name', cv.name,
                                'slug', cv.slug,
                                'hex_code', cv.hex_code
                            ) ORDER BY cv.sort_order
                        ), '[]'::json)
                        FROM color_variations cv
                        WHERE cv.group_id = cg.id AND cv.is_active = true
                    )
                ) ORDER BY cg.sort_order
            ), '[]'::json)
            FROM color_groups cg
            WHERE cg.is_active = true
        ),
        'nuances', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', cn.id,
                    'name', cn.name,
                    'slug', cn.slug
                ) ORDER BY cn.sort_order
            ), '[]'::json)
            FROM color_nuances cn
            WHERE cn.is_active = true
        )
    ) INTO result;
    
    RETURN result;
END;
$$;
