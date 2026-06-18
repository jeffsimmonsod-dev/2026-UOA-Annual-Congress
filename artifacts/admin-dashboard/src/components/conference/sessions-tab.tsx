import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useListConferenceSessions, useBulkImportSessions, getListConferenceSessionsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SessionsTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jsonInput, setJsonInput] = useState("");
  const [replaceAll, setReplaceAll] = useState(false);

  const { data: listData, isLoading } = useListConferenceSessions(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: { enabled: !!pin && !!conferenceId, queryKey: getListConferenceSessionsQueryKey(conferenceId) }
  });

  const importSessions = useBulkImportSessions({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Input must be an array of objects");
      
      importSessions.mutate({ id: conferenceId, data: { sessions: parsed, replaceAll } }, {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSessionsQueryKey(conferenceId) });
          toast({ title: "Import successful", description: `Imported ${res.imported} sessions.` });
          setJsonInput("");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Import failed" });
        }
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Invalid JSON", description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Sessions</CardTitle>
          <CardDescription>Paste JSON array of session objects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder='[{"title": "Opening Keynote", "day": "Friday", "startTime": "09:00", "externalId": "sess_1"}]' 
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="font-mono text-sm h-32"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="replace-all" checked={replaceAll} onCheckedChange={setReplaceAll} />
              <Label htmlFor="replace-all">Replace all existing</Label>
            </div>
            <Button onClick={handleImport} disabled={!jsonInput || importSessions.isPending}>
              {importSessions.isPending ? "Importing..." : "Import JSON"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : listData?.sessions.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No sessions found.</TableCell></TableRow>
            ) : (
              listData?.sessions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.day || "-"}</TableCell>
                  <TableCell>{s.start_time ? `${s.start_time} - ${s.end_time}` : "-"}</TableCell>
                  <TableCell>{s.room || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
