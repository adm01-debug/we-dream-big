import { Check, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { ThemePreset } from '@/lib/theme-presets';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PresetCardProps {
  preset: ThemePreset;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function PresetCard({ preset, isActive, onSelect }: PresetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          className={cn(
            'relative cursor-pointer rounded-xl border bg-card p-4 transition-all duration-300 overflow-hidden group',
            isActive
              ? 'border-primary ring-2 ring-primary/60 shadow-md'
              : 'border-border hover:border-primary/40 hover:shadow-lg'
          )}
          onClick={() => onSelect(preset.id)}
          role="radio"
          aria-checked={isActive}
          aria-label={`Skin ${preset.name}: ${preset.description}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(preset.id);
            }
          }}
        >
          {/* Active glow background effect */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${preset.swatches[0]}15 0%, transparent 70%)`,
                }}
              />
            )}
          </AnimatePresence>

          {/* Swatches bar with rounded edges */}
          <div className="relative flex h-8 rounded-lg overflow-hidden mb-3 shadow-sm">
            {preset.swatches.map((color, i) => (
              <motion.div
                key={i}
                className="flex-1 relative"
                style={{ backgroundColor: color }}
                initial={false}
                animate={{
                  opacity: isHovered ? 1 : 0.9,
                  height: isHovered ? 36 : 32,
                }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              />
            ))}
            {/* Shimmer on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: isHovered ? '100%' : '-100%' }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            />
          </div>

          {/* Info + Active check */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm shrink-0">{preset.emoji}</span>
              <h3 className="text-xs font-display font-bold text-foreground truncate">
                {preset.name}
              </h3>
            </div>

            <AnimatePresence mode="wait">
              {isActive ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              ) : isHovered ? (
                <motion.div
                  key="eye"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.6 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="h-5 w-5 flex items-center justify-center shrink-0"
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <p className="relative text-[11px] text-muted-foreground mt-0.5 italic truncate">
            {preset.description}
          </p>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-[200px]">
        <p className="font-semibold">{preset.emoji} {preset.name}</p>
        <p className="text-muted-foreground">{preset.description}</p>
        {isActive && <p className="text-primary font-medium mt-1">✓ Skin ativa</p>}
      </TooltipContent>
    </Tooltip>
  );
}
