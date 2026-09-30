import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import {
  useListConferenceSpeakers,
  useBulkImportSpeakers,
  getListConferenceSpeakersQueryKey,
} from "@workspace/api-client-react";
import type { Speaker, SpeakerRecord } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CsvImport } from "./csv-import";
import type { CsvColumn, CsvServerError } from "./csv-import";
import { Button } from "@/components/ui/button";
import { EditSpeakerDialog } from "./edit-speaker-dialog";

const SPEAKER_COLUMNS: CsvColumn[] = [
  { key: "name", label: "name", required: true },
  { key: "title", label: "title" },
  { key: "organization", label: "organization" },
  { key: "bio", label: "bio" },
  { key: "photoUrl", label: "photoUrl" },
  { key: "externalId", label: "externalId" },
];

export function SpeakersTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [csvServerErrors, setCsvServerErrors] = useState<CsvServerError[] | null>(null);
  const [editing, setEditing] = useState<Speaker | null>(null);

  const { data: listData, isLoading } = useListConferenceSpeakers(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: {
      enabled: !!pin && !!conferenceId,
      queryKey: getListConferenceSpeakersQueryKey(conferenceId),
    },
  });

  const importSpeakers = useBulkImportSpeakers({
    request: { headers: { "X-Admin-Pin": pin || "" } },
  });

  const handleImport = (rows: Record<string, unknown>[], replaceAll: boolean) => {
    const speakers = rows.map((r) => ({
      externalId: r.externalId as string | undefined,
      name: r.name as string,
      title: r.title as string | undefined,
      organization: r.organization as string | undefined,
      bio: r.bio as string | undefined,
      photoUrl: r.photoUrl as string | undefined,
    })) satisfies SpeakerRecord[];

    importSpeakers.mutate(
      { id: conferenceId, data: { speakers, replaceAll } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSpeakersQueryKey(conferenceId) });
          const serverErrs = res.errors && res.errors.length > 0 ? res.errors : null;
          setCsvServerErrors(serverErrs);
          if (serverErrs) {
            toast({
              title: `Imported ${res.imported} speakers`,
              description: `${res.errors.length} rows were rejected by the server.`,
            });
          } else {
            toast({ title: "Import successful", description: `Imported ${res.imported} speakers.` });
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
        title="Import Speakers"
        description="Upload a CSV file to add or replace speakers. If your column headers differ from the expected names, a mapping step will let you match them."
        columns={SPEAKER_COLUMNS}
        onImport={handleImport}
        isPending={importSpeakers.isPending}
        serverErrors={csvServerErrors}
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Ext ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : listData?.speakers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No speakers yet. Import a CSV to get started.
                </TableCell>
              </TableRow>
            ) : (
              listData?.speakers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.title || "-"}</TableCell>
                  <TableCell>{s.company || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{s.external_id}</TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>Edit</Button></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {editing && <EditSpeakerDialog key={editing.id} speaker={editing} conferenceId={conferenceId} onClose={() => setEditing(null)} />}
    </div>
  );
}
