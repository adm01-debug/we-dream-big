// Hook para buscar opções de cores e tamanhos de uma técnica específica
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TechniquePriceOption {
  id: string;
  tableCode: string;
  tableCodeOption: string | null;
  tableFullcode: string | null;
  techniqueName: string;
  maxColors: number;
  maxAreaWidth: number;
  maxAreaHeight: number;
  areaCm2: number;
  priceByColor: boolean;
  priceByArea: boolean;
  setupPrice: number;
  handlingPrice: number;
}

export interface ColorOption {
  value: number;
  label: string;
}

export interface SizeOption {
  value: string;
  label: string;
  width: number;
  height: number;
  areaCm2: number;
  tableFullcode: string;
}

export function useTechniquePricing(techniqueCode: string | null) {
  const [priceOptions, setPriceOptions] = useState<TechniquePriceOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!techniqueCode) {
      setPriceOptions([]);
      return;
    }

    const fetchPriceOptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Buscar todas as tabelas que contêm o código da técnica
        const { data, error: invokeError } = await supabase.functions.invoke('external-db-bridge', {
          body: {
            table: 'customization_price_tables',
            operation: 'select',
            select: 'id,table_code,table_code_option,table_fullcode,customization_type_name,max_colors,max_area_width_cm,max_area_height_cm,price_by_color,price_by_area,setup_price,handling_price',
            filters: { is_active: true },
            limit: 100,
          },
        });

        if (invokeError) throw new Error(invokeError.message);
        if (!data.success) throw new Error(data.error || 'Erro ao buscar tabelas de preço');

        const records = data.data.records || [];
        
        // Filtrar tabelas que correspondem ao código da técnica
        const matchingTables = records.filter((t: Record<string, unknown>) => {
          const code = techniqueCode.toLowerCase();
          const tableCode = ((t.table_code as string) || '').toLowerCase();
          const fullCode = ((t.table_fullcode as string) || '').toLowerCase();
          
          return tableCode.includes(code) || 
                 code.includes(tableCode) ||
                 fullCode.includes(code);
        });

        const options: TechniquePriceOption[] = matchingTables.map((t: Record<string, unknown>) => ({
          id: t.id,
          tableCode: t.table_code,
          tableCodeOption: t.table_code_option,
          tableFullcode: t.table_fullcode,
          techniqueName: t.customization_type_name,
          maxColors: t.max_colors || 1,
          maxAreaWidth: t.max_area_width_cm || 0,
          maxAreaHeight: t.max_area_height_cm || 0,
          areaCm2: (t.max_area_width_cm || 0) * (t.max_area_height_cm || 0),
          priceByColor: t.price_by_color || false,
          priceByArea: t.price_by_area || false,
          setupPrice: t.setup_price || 0,
          handlingPrice: t.handling_price || 0,
        }));

        setPriceOptions(options);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        console.error('Erro ao buscar opções de preço:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceOptions();
  }, [techniqueCode]);

  // Verificar se a técnica usa preço por cor
  const hasPriceByColor = useMemo(() => {
    return priceOptions.some(opt => opt.priceByColor);
  }, [priceOptions]);

  // Verificar se a técnica usa preço por área
  const hasPriceByArea = useMemo(() => {
    return priceOptions.some(opt => opt.priceByArea);
  }, [priceOptions]);

  // Opções de cores disponíveis (baseado em max_colors das tabelas)
  const colorOptions = useMemo((): ColorOption[] => {
    if (!hasPriceByColor || priceOptions.length === 0) return [];

    // Pegar todos os max_colors únicos e ordenar
    const uniqueColors = [...new Set(priceOptions.map(opt => opt.maxColors))]
      .filter(c => c > 0)
      .sort((a, b) => a - b);

    // Se não há variação, criar opções de 1 até o máximo
    if (uniqueColors.length <= 1) {
      const maxColors = uniqueColors[0] || 4;
      return Array.from({ length: maxColors }, (_, i) => ({
        value: i + 1,
        label: `${i + 1} ${i === 0 ? 'cor' : 'cores'}`,
      }));
    }

    // Se há variação, usar os valores disponíveis
    return uniqueColors.map(c => ({
      value: c,
      label: `${c} ${c === 1 ? 'cor' : 'cores'}`,
    }));
  }, [priceOptions, hasPriceByColor]);

  // Opções de tamanho disponíveis (baseado em áreas das tabelas)
  const sizeOptions = useMemo((): SizeOption[] => {
    if (priceOptions.length === 0) return [];

    // Agrupar por área e pegar valores únicos
    const uniqueAreas = new Map<string, SizeOption>();
    
    priceOptions.forEach(opt => {
      if (opt.maxAreaWidth > 0 && opt.maxAreaHeight > 0) {
        const key = `${opt.maxAreaWidth}x${opt.maxAreaHeight}`;
        if (!uniqueAreas.has(key)) {
          uniqueAreas.set(key, {
            value: key,
            label: `${opt.maxAreaWidth} x ${opt.maxAreaHeight} cm`,
            width: opt.maxAreaWidth,
            height: opt.maxAreaHeight,
            areaCm2: opt.areaCm2,
            tableFullcode: opt.tableFullcode || opt.tableCode,
          });
        }
      }
    });

    // Ordenar por área
    return Array.from(uniqueAreas.values()).sort((a, b) => a.areaCm2 - b.areaCm2);
  }, [priceOptions]);

  // Encontrar a tabela correta para uma combinação de cores e tamanho
  const findMatchingTable = useCallback((colors: number, sizeValue: string): TechniquePriceOption | null => {
    if (priceOptions.length === 0) return null;

    // Extrair dimensões do sizeValue
    const [width, height] = sizeValue.split('x').map(Number);

    // Encontrar tabela que corresponde às opções
    const matching = priceOptions.find(opt => {
      const colorMatch = !hasPriceByColor || opt.maxColors >= colors;
      const sizeMatch = !sizeValue || (opt.maxAreaWidth === width && opt.maxAreaHeight === height);
      return colorMatch && sizeMatch;
    });

    // Se não encontrou exata, pegar a primeira que suporta as cores
    if (!matching && hasPriceByColor) {
      return priceOptions.find(opt => opt.maxColors >= colors) || priceOptions[0];
    }

    return matching || priceOptions[0];
  }, [priceOptions, hasPriceByColor]);

  return {
    priceOptions,
    colorOptions,
    sizeOptions,
    hasPriceByColor,
    hasPriceByArea,
    isLoading,
    error,
    findMatchingTable,
  };
}
