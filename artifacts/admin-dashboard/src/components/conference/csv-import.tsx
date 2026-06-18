import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, AlertCircle, CheckCircle2, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CsvColumn {
  key: string;
  label: string;
  required?: boolean;
  transform?: (val: string) => unknown;
  validate?: (val: string) => string | null;
}

export interface CsvServerError {
  row?: number;
  message?: string;
}

interface ParsedRow {
  data: Record<string, unknown>;
  errors: string[];
  rawIndex: number;
}

type ImportStep = "upload" | "mapping" | "preview";

interface CsvImportProps {
  title: string;
  description: string;
  columns: CsvColumn[];
  onImport: (rows: Record<string, unknown>[], replaceAll: boolean) => void;
  isPending: boolean;
  serverErrors?: CsvServerError[] | null;
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim() === "") continue;
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-]/g, "");
}

function buildAutoMapping(headers: string[], columns: CsvColumn[]): Record<string, string> {
  const colLookup: Record<string, string> = {};
  for (const col of columns) {
    colLookup[normalizeHeader(col.key)] = col.key;
    colLookup[normalizeHeader(col.label)] = col.key;
  }
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    mapping[h] = colLookup[normalizeHeader(h)] || "";
  }
  return mapping;
}

function applyMappingToRows(
  raw: { headers: string[]; rows: string[][] },
  mapping: Record<string, string>,
  columns: CsvColumn[]
): ParsedRow[] {
  const colByKey: Record<string, CsvColumn> = {};
  for (const col of columns) colByKey[col.key] = col;

  return raw.rows.map((row, idx) => {
    const data: Record<string, unknown> = {};
    const errors: string[] = [];

    raw.headers.forEach((csvHeader, colIdx) => {
      const schemaKey = mapping[csvHeader];
      if (!schemaKey) return;
      const col = colByKey[schemaKey];
      if (!col) return;
      const val = (row[colIdx] ?? "").trim();

      if (col.required && val === "") {
        errors.push(`"${col.label}" is required`);
      }

      data[col.key] = col.transform ? col.transform(val) : val || undefined;

      if (col.validate) {
        const err = col.validate(val);
        if (err) errors.push(err);
      }
    });

    for (const col of columns) {
      if (col.required && data[col.key] === undefined) {
        const alreadyErr = errors.some((e) => e.includes(`"${col.label}"`));
        if (!alreadyErr) errors.push(`"${col.label}" is required but not mapped`);
      }
    }

    return { data, errors, rawIndex: idx + 2 };
  });
}

function generateCsvTemplate(columns: CsvColumn[]): string {
  const header = columns.map((c) => `"${c.key}"`).join(",");
  const exampleRow = columns
    .map((c) => (c.required ? `"example ${c.key}"` : `""`))
    .join(",");
  return `${header}\n${exampleRow}\n`;
}

export function CsvImport({ title, description, columns, onImport, isPending, serverErrors }: CsvImportProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [csvRaw, setCsvRaw] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyAndPreview = (raw: { headers: string[]; rows: string[][] }, m: Record<string, string>) => {
    const rows = applyMappingToRows(raw, m, columns);
    setParsedRows(rows);
    setStep("preview");
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rawRows = parseCsvText(text);
      if (rawRows.length < 2) return;
      const headers = rawRows[0];
      const dataRows = rawRows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
      const raw = { headers, rows: dataRows };
      setCsvRaw(raw);

      const autoMapping = buildAutoMapping(headers, columns);
      setMapping(autoMapping);

      const hasUnmatched = headers.some((h) => !autoMapping[h]);
      const requiredMissing = columns.some(
        (col) => col.required && !Object.values(autoMapping).includes(col.key)
      );

      if (hasUnmatched || requiredMissing) {
        setStep("mapping");
      } else {
        applyAndPreview(raw, autoMapping);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearFile = () => {
    setStep("upload");
    setCsvRaw(null);
    setMapping({});
    setParsedRows(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const csv = generateCsvTemplate(columns);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!parsedRows) return;
    const validRows = parsedRows.filter((r) => r.errors.length === 0).map((r) => r.data);
    onImport(validRows, replaceAll);
    clearFile();
  };

  const errorCount = parsedRows?.filter((r) => r.errors.length > 0).length ?? 0;
  const validCount = parsedRows ? parsedRows.length - errorCount : 0;
  const canImport = validCount > 0 && !isPending;

  const mappedRequiredCount = columns.filter(
    (col) => col.required && Object.values(mapping).includes(col.key)
  ).length;
  const requiredCount = columns.filter((c) => c.required).length;
  const mappingValid = mappedRequiredCount >= requiredCount;

  const previewColumns = columns.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "upload" && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((col) => (
                <span
                  key={col.key}
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                    col.required
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {col.key}
                  {col.required && <span className="ml-0.5 text-primary">*</span>}
                </span>
              ))}
              <span className="text-xs text-muted-foreground self-center ml-1">(* = required)</span>
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Drop a CSV file here, or <span className="text-primary">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">First row must be column headers</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
                data-testid="csv-file-input"
              />
            </div>
          </>
        )}

        {step === "mapping" && csvRaw && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Map your CSV columns to the expected schema fields. Required fields are marked with *.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border overflow-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">CSV Column</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Maps to Schema Field</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRaw.headers.map((csvHeader) => {
                    const currentVal = mapping[csvHeader] || "";
                    const isUnmatched = !currentVal;
                    return (
                      <tr key={csvHeader} className={cn("border-b last:border-0", isUnmatched && "bg-amber-50/60")}>
                        <td className="px-3 py-2 font-mono">
                          <span className={cn("font-medium", isUnmatched ? "text-amber-700" : "text-foreground")}>
                            {csvHeader}
                          </span>
                          {isUnmatched && (
                            <span className="ml-1.5 text-[10px] text-amber-600 bg-amber-100 rounded px-1">unmatched</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 w-56">
                          <Select
                            value={currentVal}
                            onValueChange={(v) =>
                              setMapping((m) => ({ ...m, [csvHeader]: v === "__skip__" ? "" : v }))
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Skip this column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">
                                <span className="text-muted-foreground italic">— Skip —</span>
                              </SelectItem>
                              {columns.map((col) => (
                                <SelectItem key={col.key} value={col.key}>
                                  {col.key}
                                  {col.required && " *"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!mappingValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Map all required columns (*) before continuing.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={clearFile}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!mappingValid}
                onClick={() => csvRaw && applyAndPreview(csvRaw, mapping)}
                data-testid="button-apply-mapping"
              >
                Apply Mapping
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && parsedRows && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">{fileName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validCount} valid
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setStep("mapping")}
                >
                  Edit mapping
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-md border overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                    {previewColumns.map((col) => (
                      <th key={col.key} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                        {col.label}
                      </th>
                    ))}
                    {columns.length > previewColumns.length && (
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">…</th>
                    )}
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b last:border-0",
                        row.errors.length > 0 ? "bg-destructive/5" : "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-2 py-1.5 text-muted-foreground">{row.rawIndex}</td>
                      {previewColumns.map((col) => (
                        <td key={col.key} className="px-2 py-1.5 max-w-[140px] truncate">
                          {String(row.data[col.key] ?? "")}
                        </td>
                      ))}
                      {columns.length > previewColumns.length && (
                        <td className="px-2 py-1.5 text-muted-foreground">…</td>
                      )}
                      <td className="px-2 py-1.5">
                        {row.errors.length === 0 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        ) : (
                          <span
                            className="text-destructive flex items-center gap-1"
                            title={row.errors.join("; ")}
                          >
                            <AlertCircle className="h-3 w-3" />
                            {row.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <p className="text-xs text-muted-foreground">
                Rows with errors will be skipped. Fix the CSV and re-upload, or proceed to import{" "}
                {validCount} valid row{validCount !== 1 ? "s" : ""}.
              </p>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch
                id="replace-all-csv"
                checked={replaceAll}
                onCheckedChange={setReplaceAll}
                data-testid="switch-replace-all"
              />
              <Label htmlFor="replace-all-csv" className="text-sm cursor-pointer">
                Replace all existing records
              </Label>
            </div>
            <Button
              onClick={handleImport}
              disabled={!canImport || !parsedRows}
              data-testid="button-import"
            >
              {isPending ? "Importing..." : `Import ${validCount > 0 ? validCount : ""} rows`}
            </Button>
          </div>
        )}

        {serverErrors && serverErrors.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {serverErrors.length} row{serverErrors.length !== 1 ? "s" : ""} rejected by server
            </p>
            <div className="max-h-40 overflow-auto space-y-1">
              {serverErrors.map((err, i) => (
                <div key={i} className="text-xs text-destructive/80 flex gap-2">
                  {err.row != null && (
                    <span className="font-mono text-muted-foreground shrink-0">row {err.row}:</span>
                  )}
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
