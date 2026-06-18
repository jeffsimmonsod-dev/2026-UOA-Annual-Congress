import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import {
  useListConferenceSessions,
  useBulkImportSessions,
  getListConferenceSessionsQueryKey,
} from "@workspace/api-client-react";
import type { SessionRecord } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvImport } from "./csv-import";
import type { CsvColumn, CsvServerError } from "./csv-import";

function splitList(val: string): string[] {
  if (!val || val.trim() === "") return [];
  return val.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
}

const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;
const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SESSION_COLUMNS: CsvColumn[] = [
  { key: "title", label: "title", required: true },
  {
    key: "day",
    label: "day",
    validate: (v) => {
      if (!v) return null;
      if (!VALID_DAYS.some((d) => d.toLowerCase() === v.toLowerCase())) {
        return `"day" must be one of: ${VALID_DAYS.join(", ")}`;
      }
      return null;
    },
  },
  {
    key: "startTime",
    label: "startTime",
    validate: (v) => {
      if (!v) return null;
      if (!TIME_RE.test(v)) return '"startTime" must be HH:MM format (e.g. 09:00)';
      return null;
    },
  },
  {
    key: "endTime",
    label: "endTime",
    validate: (v) => {
      if (!v) return null;
      if (!TIME_RE.test(v)) return '"endTime" must be HH:MM format (e.g. 10:30)';
      return null;
    },
  },
  { key: "room", label: "room" },
  { key: "track", label: "track" },
  { key: "description", label: "description" },
  {
    key: "speakerIds",
    label: "speakerIds",
    transform: (v) => splitList(v),
  },
  {
    key: "tags",
    label: "tags",
    transform: (v) => splitList(v),
  },
  {
    key: "isPara",
    label: "isPara",
    transform: (v) => v.toLowerCase() === "true" || v === "1",
  },
  { key: "externalId", label: "externalId" },
];

export function SessionsTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvServerErrors, setCsvServerErrors] = useState<CsvServerError[] | null>(null);

  const { data: listData, isLoading } = useListConferenceSessions(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: {
      enabled: !!pin && !!conferenceId,
      queryKey: getListConferenceSessionsQueryKey(conferenceId),
    },
  });

  const importSessions = useBulkImportSessions({
    request: { headers: { "X-Admin-Pin": pin || "" } },
  });

  const handleImport = (rows: Record<string, unknown>[], replaceAll: boolean) => {
    const sessions = rows.map((r) => ({
      externalId: r.externalId as string | undefined,
      title: r.title as string,
      description: r.description as string | undefined,
      day: r.day as string | undefined,
      startTime: r.startTime as string | undefined,
      endTime: r.endTime as string | undefined,
      room: r.room as string | undefined,
      track: r.track as string | undefined,
      speakerIds: (r.speakerIds as string[]) ?? [],
      tags: (r.tags as string[]) ?? [],
      isPara: (r.isPara as boolean) ?? false,
    })) satisfies SessionRecord[];

    importSessions.mutate(
      { id: conferenceId, data: { sessions, replaceAll } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSessionsQueryKey(conferenceId) });
          const serverErrs = res.errors && res.errors.length > 0 ? res.errors : null;
          setCsvServerErrors(serverErrs);
          if (serverErrs) {
            toast({
              title: `Imported ${res.imported} sessions`,
              description: `${res.errors.length} rows were rejected by the server.`,
            });
          } else {
            toast({ title: "Import successful", description: `Imported ${res.imported} sessions.` });
          }
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Import failed",
            description: "Check that all required columns are present.",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <CsvImport
        title="Import Sessions"
        description="Upload a CSV file to add or replace sessions. speakerIds and tags accept comma-separated values. day must be a weekday name; startTime/endTime must be HH:MM."
        columns={SESSION_COLUMNS}
        onImport={handleImport}
        isPending={importSessions.isPending}
        serverErrors={csvServerErrors}
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
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : listData?.sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No sessions yet. Import a CSV to get started.
                </TableCell>
              </TableRow>
            ) : (
              listData?.sessions.map((s) => (
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
