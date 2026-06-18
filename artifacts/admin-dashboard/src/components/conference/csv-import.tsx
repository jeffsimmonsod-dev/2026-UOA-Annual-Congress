import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CsvColumn {
  key: string;
  label: string;
  required?: boolean;
  transform?: (val: string) => unknown;
}

interface ParsedRow {
  data: Record<string, unknown>;
  errors: string[];
  rawIndex: number;
}

interface CsvImportProps {
  title: string;
  description: string;
  columns: CsvColumn[];
  onImport: (rows: Record<string, unknown>[], replaceAll: boolean) => void;
  isPending: boolean;
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
  return h.toLowerCase().replace(/[\s_-]/g, "");
}

function parseCsvIntoRows(text: string, columns: CsvColumn[]): ParsedRow[] {
  const rawRows = parseCsvText(text);
  if (rawRows.length < 2) return [];

  const headers = rawRows[0].map(normalizeHeader);
  const colKeyMap: Record<string, CsvColumn> = {};
  for (const col of columns) {
    colKeyMap[normalizeHeader(col.key)] = col;
    colKeyMap[normalizeHeader(col.label)] = col;
  }

  const parsedRows: ParsedRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const data: Record<string, unknown> = {};
    const errors: string[] = [];

    headers.forEach((h, idx) => {
      const col = colKeyMap[h];
      if (!col) return;
      const raw_val = raw[idx] ?? "";
      const val = raw_val.trim();
      if (col.required && val === "") {
        errors.push(`"${col.label}" is required`);
      }
      data[col.key] = col.transform ? col.transform(val) : val || undefined;
    });

    for (const col of columns) {
      if (col.required && !data[col.key]) {
        const alreadyErr = errors.some((e) => e.includes(col.label));
        if (!alreadyErr) errors.push(`"${col.label}" is required`);
      }
    }

    parsedRows.push({ data, errors, rawIndex: i });
  }
  return parsedRows;
}

function generateCsvTemplate(columns: CsvColumn[]): string {
  const header = columns.map((c) => `"${c.key}"`).join(",");
  const exampleRow = columns
    .map((c) => (c.required ? `"example ${c.key}"` : `""`))
    .join(",");
  return `${header}\n${exampleRow}\n`;
}

export function CsvImport({ title, description, columns, onImport, isPending }: CsvImportProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsvIntoRows(text, columns);
      setParsedRows(rows);
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
        {/* Expected columns hint */}
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
          <span className="text-xs text-muted-foreground self-center ml-1">
            (* = required)
          </span>
        </div>

        {/* Drop zone / file picker */}
        {!parsedRows ? (
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
            <p className="text-xs text-muted-foreground mt-1">
              First row must be column headers
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              data-testid="csv-file-input"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* File summary */}
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview table */}
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
                          <span className="text-destructive flex items-center gap-1" title={row.errors.join("; ")}>
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
                Rows with errors will be skipped. Fix the CSV and re-upload, or proceed to import {validCount} valid row{validCount !== 1 ? "s" : ""}.
              </p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Switch
              id="replace-all-csv"
              checked={replaceAll}
              onCheckedChange={setReplaceAll}
              disabled={!parsedRows}
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
      </CardContent>
    </Card>
  );
}
