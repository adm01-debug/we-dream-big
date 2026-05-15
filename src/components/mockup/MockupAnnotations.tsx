/**
 * MockupAnnotations — Simple comment layer on generated mockup
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, X, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Annotation {
  id: string;
  x: number; // percentage
  y: number; // percentage
  text: string;
}

interface MockupAnnotationsProps {
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  className?: string;
}

export function MockupAnnotations({
  imageUrl,
  annotations,
  onAnnotationsChange,
  className,
}: MockupAnnotationsProps) {
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isAnnotating || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      text: "",
    };
    onAnnotationsChange([...annotations, newAnnotation]);
    setEditingId(newAnnotation.id);
    setEditText("");
    setIsAnnotating(false);
  }, [isAnnotating, annotations, onAnnotationsChange]);

  const saveAnnotationText = () => {
    if (!editingId) return;
    if (!editText.trim()) {
      // Remove empty annotation
      onAnnotationsChange(annotations.filter(a => a.id !== editingId));
    } else {
      onAnnotationsChange(annotations.map(a => a.id === editingId ? { ...a, text: editText.trim() } : a));
    }
    setEditingId(null);
    setEditText("");
  };

  const removeAnnotation = (id: string) => {
    onAnnotationsChange(annotations.filter(a => a.id !== id));
    toast.success("Anotação removida");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={isAnnotating ? "default" : "outline"}
          size="sm"
          onClick={() => setIsAnnotating(!isAnnotating)}
          className="gap-1.5"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          {isAnnotating ? "Clique na imagem..." : "Anotar"}
        </Button>
        {annotations.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {annotations.length} {annotations.length === 1 ? "nota" : "notas"}
          </Badge>
        )}
      </div>

      {/* Image with annotations */}
      <div
        ref={containerRef}
        className={cn(
          "relative rounded-lg border",
          isAnnotating && "cursor-crosshair ring-2 ring-primary"
        )}
        onClick={handleClick}
      >
        <img
          src={imageUrl}
          alt="Mockup com anotações"
          className="w-full object-contain"
          draggable={false} loading="lazy" />

        {/* Annotation pins */}
        {annotations.map((ann, idx) => (
          <div
            key={ann.id}
            className="absolute z-10 group"
            style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: "translate(-50%, -100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pin */}
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer"
                onClick={() => { setEditingId(ann.id); setEditText(ann.text); }}
              >
                {idx + 1}
              </div>
              {/* Tooltip */}
              {ann.text && editingId !== ann.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-background/95 backdrop-blur-sm border rounded-md shadow-md text-xs max-w-[200px] whitespace-pre-wrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {ann.text}
                </div>
              )}
              {/* Edit form */}
              {editingId === ann.id && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-background border rounded-lg shadow-lg p-2 z-20 min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Ex: ajustar 1cm à esquerda"
                    className="h-8 text-xs mb-2"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveAnnotationText()}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={saveAnnotationText}>
                      <Save className="h-3 w-3 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => removeAnnotation(ann.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Annotations list */}
      {annotations.length > 0 && (
        <div className="space-y-1">
          {annotations.map((ann, idx) => (
            <div key={ann.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 truncate text-muted-foreground">
                {ann.text || <em>Sem texto</em>}
              </span>
              <Button variant="ghost" size="icon" aria-label="Fechar" className="h-5 w-5" onClick={() => removeAnnotation(ann.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
