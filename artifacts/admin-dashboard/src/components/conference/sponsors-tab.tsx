import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import {
  useListConferenceSponsors,
  useBulkImportSponsors,
  getListConferenceSponsorsQueryKey,
} from "@workspace/api-client-react";
import type { SponsorRecord } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImport } from "./csv-import";
import type { CsvColumn } from "./csv-import";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const SPONSOR_COLUMNS: CsvColumn[] = [
  { key: "name", label: "name", required: true },
  { key: "tier", label: "tier", required: true },
  { key: "website", label: "website" },
  { key: "logoUrl", label: "logoUrl" },
  { key: "description", label: "description" },
  { key: "externalId", label: "externalId" },
];

const TIERS = ["Platinum", "Gold", "Silver", "Bronze"];

const TIER_BADGES: Record<string, string> = {
  Platinum: "bg-slate-100 text-slate-700",
  Gold: "bg-yellow-50 text-yellow-700",
  Silver: "bg-gray-100 text-gray-600",
  Bronze: "bg-orange-50 text-orange-700",
};

const EMPTY_SPONSOR = { name: "", tier: "Gold", website: "", logoUrl: "", description: "", externalId: "" };

export function SponsorsTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manual, setManual] = useState(EMPTY_SPONSOR);
  const [manualOpen, setManualOpen] = useState(false);

  const { data: listData, isLoading } = useListConferenceSponsors(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: {
      enabled: !!pin && !!conferenceId,
      queryKey: getListConferenceSponsorsQueryKey(conferenceId),
    },
  });

  const importSponsors = useBulkImportSponsors({
    request: { headers: { "X-Admin-Pin": pin || "" } },
  });

  const handleCsvImport = (rows: Record<string, unknown>[], replaceAll: boolean) => {
    const sponsors = rows.map((r) => ({
      externalId: r.externalId as string | undefined,
      name: r.name as string,
      tier: (r.tier as string) || "Silver",
      website: r.website as string | undefined,
      logoUrl: r.logoUrl as string | undefined,
      description: r.description as string | undefined,
    })) satisfies SponsorRecord[];

    importSponsors.mutate(
      { id: conferenceId, data: { sponsors, replaceAll } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSponsorsQueryKey(conferenceId) });
          toast({ title: "Import successful", description: `Imported ${res.imported} sponsors.` });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Import failed",
            description: "Check that name and tier columns are present.",
          });
        },
      }
    );
  };

  const handleManualAdd = () => {
    if (!manual.name.trim() || !manual.tier.trim()) {
      toast({ variant: "destructive", title: "Name and Tier are required" });
      return;
    }
    const sponsor: SponsorRecord = {
      name: manual.name.trim(),
      tier: manual.tier,
      website: manual.website.trim() || undefined,
      logoUrl: manual.logoUrl.trim() || undefined,
      description: manual.description.trim() || undefined,
      externalId: manual.externalId.trim() || undefined,
    };
    importSponsors.mutate(
      { id: conferenceId, data: { sponsors: [sponsor], replaceAll: false } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSponsorsQueryKey(conferenceId) });
          toast({ title: "Sponsor added" });
          setManual(EMPTY_SPONSOR);
          setManualOpen(false);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to add sponsor" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Manual entry */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Add Sponsor</CardTitle>
              <CardDescription>Add a single sponsor by entering details manually.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualOpen((o) => !o)}
              data-testid="button-toggle-manual"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {manualOpen ? "Cancel" : "Add manually"}
            </Button>
          </div>
        </CardHeader>
        {manualOpen && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input
                  data-testid="input-sponsor-name"
                  value={manual.name}
                  onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tier *</Label>
                <Select
                  value={manual.tier}
                  onValueChange={(v) => setManual((m) => ({ ...m, tier: v }))}
                >
                  <SelectTrigger data-testid="select-sponsor-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={manual.website}
                  onChange={(e) => setManual((m) => ({ ...m, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={manual.logoUrl}
                  onChange={(e) => setManual((m) => ({ ...m, logoUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={manual.description}
                  onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))}
                  placeholder="Optional short description"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                data-testid="button-add-sponsor"
                onClick={handleManualAdd}
                disabled={importSponsors.isPending}
              >
                {importSponsors.isPending ? "Adding..." : "Add Sponsor"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* CSV import */}
      <CsvImport
        title="Bulk Import via CSV"
        description="Upload a CSV to add or replace multiple sponsors at once. Tier values: Platinum, Gold, Silver, Bronze."
        columns={SPONSOR_COLUMNS}
        onImport={handleCsvImport}
        isPending={importSponsors.isPending}
      />

      {/* Listing */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : listData?.sponsors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No sponsors yet. Add one above or import a CSV.
                </TableCell>
              </TableRow>
            ) : (
              listData?.sponsors.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        TIER_BADGES[s.tier] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.tier}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        {s.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    ) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
