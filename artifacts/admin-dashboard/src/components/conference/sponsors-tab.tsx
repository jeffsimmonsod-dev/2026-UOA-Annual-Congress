import { useAdmin } from "@/hooks/use-admin";
import { useListConferenceSponsors, useBulkImportSponsors, getListConferenceSponsorsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvImport } from "./csv-import";
import type { CsvColumn } from "./csv-import";

const SPONSOR_COLUMNS: CsvColumn[] = [
  { key: "name", label: "Name", required: true },
  { key: "tier", label: "Tier", required: true },
  { key: "website", label: "Website" },
  { key: "logoUrl", label: "Logo URL" },
  { key: "description", label: "Description" },
  { key: "externalId", label: "External ID" },
];

const TIER_BADGES: Record<string, string> = {
  Platinum: "bg-slate-100 text-slate-700",
  Gold: "bg-yellow-50 text-yellow-700",
  Silver: "bg-gray-100 text-gray-600",
  Bronze: "bg-orange-50 text-orange-700",
};

export function SponsorsTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: listData, isLoading } = useListConferenceSponsors(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: { enabled: !!pin && !!conferenceId, queryKey: getListConferenceSponsorsQueryKey(conferenceId) }
  });

  const importSponsors = useBulkImportSponsors({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const handleImport = (rows: Record<string, unknown>[], replaceAll: boolean) => {
    importSponsors.mutate(
      { id: conferenceId, data: { sponsors: rows as never, replaceAll } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSponsorsQueryKey(conferenceId) });
          toast({ title: "Import successful", description: `Imported ${res.imported} sponsors.` });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Import failed", description: "Check that name and tier columns are present." });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <CsvImport
        title="Import Sponsors"
        description="Upload a CSV file to add or replace sponsors. Tier values: Platinum, Gold, Silver, Bronze."
        columns={SPONSOR_COLUMNS}
        onImport={handleImport}
        isPending={importSponsors.isPending}
      />

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
              <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : listData?.sponsors.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No sponsors yet. Import a CSV to get started.</TableCell></TableRow>
            ) : (
              listData?.sponsors.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TIER_BADGES[s.tier] ?? "bg-muted text-muted-foreground"}`}>
                      {s.tier}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
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
