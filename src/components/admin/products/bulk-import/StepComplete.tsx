import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, Loader2, RotateCcw, FileDown } from 'lucide-react';
import { type BatchImportProgress, type BatchImportResult, generateErrorReportCSV } from '@/lib/external-db/batch-import';
import { toast } from 'sonner';
import type { ValidationResult } from "./types";

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

interface StepImportingProps {
  progress: BatchImportProgress;
}

export function StepImporting({ progress }: StepImportingProps) {
  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm font-medium">Importando produtos em lotes...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Lote {progress.currentChunk} de {progress.totalChunks} • {progress.processed} de {progress.total} processados
        </p>
      </div>
      <Progress value={(progress.processed / progress.total) * 100} className="h-2" />
      <div className="flex justify-center gap-4 text-xs">
        <span className="text-success">✓ {progress.succeeded} sucesso</span>
        {progress.failed > 0 && <span className="text-destructive">✕ {progress.failed} falha(s)</span>}
      </div>
    </div>
  );
}

interface StepCompleteProps {
  importResult: BatchImportResult;
  importMode: string;
  invalidCount: number;
  validationResults: ValidationResult[];
  rawData: Record<string, unknown>[];
  onReset: () => void;
  onClose: () => void;
}

export function StepComplete({ importResult, importMode, invalidCount, validationResults, rawData, onReset, onClose }: StepCompleteProps) {
  const downloadErrorReport = () => {
    const failedRows = validationResults
      .filter(r => !r.valid)
      .map(r => ({
        row: r.row,
        sku: r.data?.sku || rawData[r.row - 1]?.sku || '',
        name: r.data?.name || rawData[r.row - 1]?.name || '',
        errors: r.errors,
      }));
    const csv = generateErrorReportCSV(importResult.errors, failedRows);
    downloadBlob(csv, `erros_importacao_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    toast.success('Relatório de erros baixado');
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        {importResult.failed === 0 ? (
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
        ) : (
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-3" />
        )}
        <p className="text-lg font-semibold font-display">Importação Concluída</p>
        <div className="flex justify-center gap-4 mt-2 text-sm">
          <span className="text-success font-medium">{importResult.succeeded} importados</span>
          {importResult.failed > 0 && <span className="text-destructive font-medium">{importResult.failed} falharam</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Modo: {importMode === 'upsert' ? 'Upsert (inserir/atualizar)' : 'Apenas inserção'}
        </p>
      </div>

      {importResult.errors.length > 0 && (
        <ScrollArea className="h-[150px] border rounded-lg p-3">
          <p className="text-xs font-medium mb-2">Erros detalhados:</p>
          {importResult.errors.map((e, i) => (
            <p key={i} className="text-xs text-destructive mb-1">Linhas {e.startRow}–{e.endRow}: {e.message}</p>
          ))}
        </ScrollArea>
      )}

      <div className="flex justify-center gap-2">
        {(importResult.failed > 0 || invalidCount > 0) && (
          <Button variant="outline" size="sm" onClick={downloadErrorReport}>
            <FileDown className="h-4 w-4 mr-2" />Baixar Erros
          </Button>
        )}
        <Button variant="outline" onClick={onReset}><RotateCcw className="h-4 w-4 mr-2" />Nova Importação</Button>
        <Button onClick={onClose}>Concluir</Button>
      </div>
    </div>
  );
}
