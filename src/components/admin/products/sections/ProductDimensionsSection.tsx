/**
 * Dimensions section — Product physical dimensions + internal dims for box products
 */
import { Input } from '@/components/ui/input';
import { FieldLabel, SectionCard, type FormSectionProps } from '../ProductFormHelpers';
import { Ruler } from 'lucide-react';

interface Props extends FormSectionProps {
  isBoxProduct: boolean;
}

export function ProductDimensionsSection({
  register: _register,
  numericProps,
  isBoxProduct,
}: Props) {
  return (
    <SectionCard id="dimensions" title="Dimensões" icon={Ruler} subtitle="Dimensões do produto">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { id: 'height_cm', label: 'Altura (cm)', hint: 'Altura do produto sem embalagem' },
          { id: 'width_cm', label: 'Largura (cm)', hint: 'Largura do produto sem embalagem' },
          {
            id: 'length_cm',
            label: 'Profundidade (cm)',
            hint: 'Profundidade do produto sem embalagem',
          },
          {
            id: 'diameter_cm',
            label: 'Diâmetro (cm)',
            hint: 'Diâmetro para produtos cilíndricos/redondos',
          },
          { id: 'weight_g', label: 'Peso (g)', hint: 'Peso líquido do produto em gramas' },
          {
            id: 'capacity_ml',
            label: 'Capacidade (ml)',
            hint: 'Volume útil para copos, garrafas, etc.',
          },
        ].map(({ id: fId, label, hint }) => (
          <div key={fId}>
            <FieldLabel htmlFor={fId} hint={hint}>
              {label}
            </FieldLabel>
            <Input id={fId} {...numericProps(fId)} min="0" step="0.1" className="h-9" />
          </div>
        ))}
      </div>
      {isBoxProduct && (
        <div className="mt-2 border-t border-border/30 pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Internas (para montagem de kits)
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                id: 'internal_height_cm',
                label: 'Altura Int. (cm)',
                hint: 'Espaço interno útil de altura',
              },
              {
                id: 'internal_width_cm',
                label: 'Largura Int. (cm)',
                hint: 'Espaço interno útil de largura',
              },
              {
                id: 'internal_length_cm',
                label: 'Profundidade Int. (cm)',
                hint: 'Espaço interno útil de profundidade',
              },
              {
                id: 'internal_diameter_cm',
                label: 'Diâmetro Int. (cm)',
                hint: 'Diâmetro interno para embalagens cilíndricas',
              },
            ].map(({ id: fId, label, hint }) => (
              <div key={fId}>
                <FieldLabel htmlFor={fId} hint={hint}>
                  {label}
                </FieldLabel>
                <Input id={fId} {...numericProps(fId)} min="0" step="0.1" className="h-9" />
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
