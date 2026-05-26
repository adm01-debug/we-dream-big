import { useState, useMemo, useRef } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Camera, 
  Image as ImageIcon, 
  Zap, 
  ArrowRight, 
  Loader2, 
  RefreshCcw, 
  Filter, 
  X,
  Target,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ExternalCategoryFilter } from '@/components/filters/ExternalCategoryFilter';
import { ColorSwatchBar, type ColorFilterSelection } from '@/components/filters/ColorGroupFilter';
import { useExternalCategoriesQuery, useColorSystem } from '@/hooks/products';
import { motion, AnimatePresence } from 'framer-motion';

interface VisualSearchResult {
  analysis: {
    productType: string;
    material: string;
    colors: string[];
    category: string;
    keywords: string[];
    description: string;
    confidence: number;
    rationale: string;
  };
  products: Array<{
    id: string;
    name: string;
    sku: string;
    category_name: string;
    price: number;
    images: string[];
    relevance: number;
  }>;
  searchTerms: string;
}

export default function VisualSearchPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<VisualSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [colorSelection, setColorSelection] = useState<ColorFilterSelection>({
    groups: [],
    variations: [],
    nuances: [],
  });

  const { data: categories = [] } = useExternalCategoriesQuery();
  const { data: colorData } = useColorSystem();

  const selectedCategoryNames = useMemo(() => {
    if (!selectedCategoryIds.length) return [];
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return selectedCategoryIds.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [selectedCategoryIds, categories]);

  const selectedColorNames = useMemo(() => {
    if (!colorData) return [];
    const names: string[] = [];
    colorData.groups.forEach((g) => {
      if (colorSelection.groups.includes(g.slug)) names.push(g.name);
      g.variations.forEach((v) => {
        if (colorSelection.variations.includes(v.slug)) names.push(v.name);
      });
    });
    return names;
  }, [colorSelection, colorData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setIsSearching(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('visual-search', {
        body: {
          imageBase64: base64.split(',')[1],
          category: selectedCategoryNames.length ? selectedCategoryNames.join(', ') : undefined,
          color: selectedColorNames.length ? selectedColorNames.join(', ') : undefined,
        }
      });

      if (error) throw error;
      setResults(data);
      toast.success('Análise concluída com sucesso!');
    } catch (err: any) {
      console.error('Visual search error:', err);
      toast.error('Erro ao analisar imagem', {
        description: err.message || 'Tente novamente com outra imagem.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setResults(null);
    setIsSearching(false);
    setSelectedCategoryIds([]);
    setColorSelection({ groups: [], variations: [], nuances: [] });
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return { label: 'Alta Precisão', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (confidence >= 0.5) return { label: 'Precisão Média', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Baixa Precisão', color: 'text-rose-500', bg: 'bg-rose-500/10' };
  };

  return (
    <>
      <PageSEO 
        title="Raio X — Busca Visual por IA" 
        description="Identifique produtos instantaneamente através de fotos usando inteligência artificial."
        path="/raio-x"
      />
      
      <div className="mx-auto w-full max-w-[1920px] space-y-6 px-3 py-4 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20"
            >
              <Zap className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Raio X</h1>
              <p className="text-sm text-muted-foreground">O "Shazam" do catálogo: tire uma foto e encontre o produto</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20 lg:h-fit">
            {/* Upload & Preview */}
            <Card className="overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-muted/5 transition-all hover:border-primary/30">
              <CardContent className="p-0">
                <AnimatePresence mode="wait">
                  {previewUrl ? (
                    <motion.div 
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative overflow-hidden"
                    >
                      <img src={previewUrl} alt="Preview" className="aspect-square w-full object-cover" />
                      
                      {/* Scanning Line Animation */}
                      {isSearching && (
                        <motion.div 
                          className="absolute left-0 top-0 z-10 h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.8)]"
                          animate={{ 
                            top: ['0%', '100%', '0%'] 
                          }}
                          transition={{ 
                            duration: 2.5, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        />
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <Button variant="secondary" size="sm" onClick={reset} className="gap-2">
                          <RefreshCcw className="h-4 w-4" /> Trocar Foto
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.label 
                      key="upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-4 p-6 text-center"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileUpload({ target: { files: [file] } } as any);
                      }}
                    >
                      <div className="rounded-full bg-primary/10 p-4 transition-transform hover:scale-110">
                        <Camera className="h-10 w-10 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold">Tirar foto ou anexar</p>
                        <p className="text-xs text-muted-foreground">Arraste a imagem do cliente aqui</p>
                      </div>
                      <input 
                        ref={fileInputRef}
                        id="visual-search-input" 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                      />
                    </motion.label>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Refinement Filters */}
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Filter className="h-3 w-3" /> Refinar Busca
                  </CardTitle>
                </div>
                <CardDescription className="text-[11px]">
                  Dê pistas para a IA ser mais precisa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">Categoria</Label>
                    {selectedCategoryIds.length > 0 && (
                      <button onClick={() => setSelectedCategoryIds([])} className="text-[10px] text-primary hover:underline">Limpar</button>
                    )}
                  </div>
                  <div className="rounded-md border border-border/40 bg-background/80">
                    <ExternalCategoryFilter
                      selectedCategories={selectedCategoryIds}
                      onCategoriesChange={setSelectedCategoryIds}
                      compact
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">Cor Predominante</Label>
                    {selectedColorNames.length > 0 && (
                      <button onClick={() => setColorSelection({ groups: [], variations: [], nuances: [] })} className="text-[10px] text-primary hover:underline">Limpar</button>
                    )}
                  </div>
                  <ColorSwatchBar selection={colorSelection} onChange={setColorSelection} />
                </div>

                {previewUrl && !isSearching && (
                  <Button
                    className="w-full gap-2 shadow-lg shadow-primary/10"
                    onClick={() => processImage(previewUrl)}
                  >
                    <Target className="h-4 w-4" />
                    {results ? 'Refazer Análise' : 'Iniciar Raio X'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis Details */}
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2 border-b border-primary/10 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Relatório da IA</CardTitle>
                      {results.analysis.confidence && (
                        <div className={cn(
                          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          getConfidenceLabel(results.analysis.confidence).bg,
                          getConfidenceLabel(results.analysis.confidence).color
                        )}>
                          {Math.round(results.analysis.confidence * 100)}% Match
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Produto</p>
                        <p className="text-xs font-semibold leading-tight">{results.analysis.productType}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Material</p>
                        <p className="text-xs font-semibold leading-tight">{results.analysis.material}</p>
                      </div>
                    </div>
                    
                    {results.analysis.rationale && (
                      <div className="rounded-lg bg-background/50 p-2 text-[11px] text-muted-foreground">
                        <div className="flex items-start gap-1.5">
                          <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          <p>"{results.analysis.rationale}"</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {results.analysis.keywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className="h-5 border-primary/20 bg-background/50 px-1.5 text-[9px] font-normal uppercase text-primary">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Results Area */}
          <div className="lg:col-span-8 space-y-4">
            {!previewUrl && !isSearching && (
              <div className="flex h-full min-h-[500px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/5 p-12 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse bg-primary/10 blur-2xl rounded-full" />
                  <div className="relative rounded-full bg-background p-8 shadow-xl">
                    <ImageIcon className="h-16 w-16 text-muted-foreground/20" />
                  </div>
                </div>
                <h3 className="mb-2 font-display text-2xl font-bold">Identifique qualquer brinde</h3>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Nossa IA exclusiva analisa as características físicas do produto e localiza o modelo exato ou as alternativas mais próximas no catálogo.
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-8 gap-2 px-8"
                >
                  <Camera className="h-4 w-4" /> Começar Agora
                </Button>
              </div>
            )}

            {isSearching && (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <div className="absolute inset-0 bg-grid-white/10" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold text-primary">Digitalizando características...</p>
                      <Progress value={45} className="h-1 animate-pulse" />
                      <p className="text-[10px] text-muted-foreground italic">"Analisando curvatura da tampa, textura do material e paleta de cores..."</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="overflow-hidden border-border/40">
                      <Skeleton className="aspect-square w-full" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-3 w-1/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex items-center justify-between pt-2">
                          <Skeleton className="h-6 w-1/3" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {results && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="font-display text-xl font-bold">Matches Encontrados</h2>
                    <p className="text-xs text-muted-foreground">Organizados por similaridade visual e técnica</p>
                  </div>
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-[10px] font-bold tracking-tight">
                    <Target className="h-3.5 w-3.5 text-primary" /> {results.products.length} PRODUTOS
                  </Badge>
                </div>

                {results.products.length === 0 ? (
                  <Card className="py-20 border-dashed bg-muted/5">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                      <div className="mb-4 rounded-full bg-muted p-4">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <p className="text-base font-bold">Nenhum match exato encontrado</p>
                      <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                        A IA identificou o tipo de produto, mas ele pode não estar cadastrado. Experimente remover os filtros de "Cor" ou "Categoria" para uma busca mais ampla.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {results.products.map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card 
                          className="group h-full cursor-pointer overflow-hidden border-border/40 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]"
                          onClick={() => navigate(`/produto/${product.id}`)}
                        >
                          <div className="relative aspect-square overflow-hidden bg-white/50 p-4">
                            <img 
                              src={product.images?.[0] || '/placeholder.svg'} 
                              alt={product.name}
                              className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
                            />
                            
                            {/* Match Overlay */}
                            <div className="absolute top-3 right-3">
                              <div className={cn(
                                "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md",
                                product.relevance >= 0.8 ? "bg-emerald-500/90 text-white" : "bg-white/90 text-foreground"
                              )}>
                                {product.relevance >= 0.8 && <CheckCircle2 className="h-3 w-3" />}
                                {Math.round(product.relevance * 100)}% Match
                              </div>
                            </div>

                            {/* Hover Quick Actions */}
                            <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-gradient-to-t from-black/60 to-transparent p-4 transition-transform group-hover:translate-y-0">
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Ver detalhes do produto</span>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{product.sku}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{product.category_name}</span>
                            </div>
                            <h3 className="mb-3 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
                              {product.name}
                            </h3>
                            <div className="flex items-center justify-between border-t border-border/50 pt-3">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-medium text-muted-foreground">A partir de</span>
                                <span className="text-lg font-black tracking-tighter text-foreground">
                                  {formatCurrency(product.price)}
                                </span>
                              </div>
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <ArrowRight className="h-5 w-5" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}