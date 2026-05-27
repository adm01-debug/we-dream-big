UPDATE public.products 
SET featured = true, new_arrival = true, on_sale = true 
WHERE id = 'bea8bd6e-14f4-4482-921d-ecc179391166';

-- Política temporária permitindo leitura anônima para o print
CREATE POLICY "Temp public read products" ON public.products FOR SELECT USING (true);
GRANT SELECT ON public.products TO anon;