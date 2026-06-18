import { useAdmin } from "@/hooks/use-admin";
import { useListConferenceSessions, useBulkImportSessions, getListConferenceSessionsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvImport } from "./csv-import";
import type { CsvColumn } from "./csv-import";

const SESSION_COLUMNS: CsvColumn[] = [
  { key: "title", label: "Title", required: true },
  { key: "day", label: "Day" },
  { key: "startTime", label: "Start Time" },
  { key: "endTime", label: "End Time" },
  { key: "room", label: "Room" },
  { key: "track", label: "Track" },
  { key: "description", label: "Description" },
  { key: "speakerIds", label: "Speaker IDs" },
  { key: "isPara", label: "Is Para", transform: (v) => v.toLowerCase() === "true" || v === "1" },
  { key: "externalId", label: "External ID" },
];

export function SessionsTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: listData, isLoading } = useListConferenceSessions(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: { enabled: !!pin && !!conferenceId, queryKey: getListConferenceSessionsQueryKey(conferenceId) }
  });

  const importSessions = useBulkImportSessions({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const handleImport = (rows: Record<string, unknown>[], replaceAll: boolean) => {
    importSessions.mutate(
      { id: conferenceId, data: { sessions: rows as never, replaceAll } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSessionsQueryKey(conferenceId) });
          toast({ title: "Import successful", description: `Imported ${res.imported} sessions.` });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Import failed", description: "Check that all required columns are present." });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <CsvImport
        title="Import Sessions"
        description="Upload a CSV file to add or replace sessions. Both Doctor and Para tracks are supported (use isPara column)."
        columns={SESSION_COLUMNS}
        onImport={handleImport}
        isPending={importSessions.isPending}
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Track</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : listData?.sessions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sessions yet. Import a CSV to get started.</TableCell></TableRow>
            ) : (
              listData?.sessions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.day || "-"}</TableCell>
                  <TableCell>{s.start_time ? `${s.start_time} – ${s.end_time}` : "-"}</TableCell>
                  <TableCell>{s.room || "-"}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium">
                      {s.track || "-"}
                      {s.is_para && <span className="ml-1 text-muted-foreground">(Para)</span>}
                    </span>
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
