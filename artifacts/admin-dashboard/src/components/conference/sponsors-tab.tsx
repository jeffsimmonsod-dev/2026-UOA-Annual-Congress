import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useListConferenceSponsors, useBulkImportSponsors, getListConferenceSponsorsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function SponsorsTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jsonInput, setJsonInput] = useState("");
  const [replaceAll, setReplaceAll] = useState(false);

  const { data: listData, isLoading } = useListConferenceSponsors(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: { enabled: !!pin && !!conferenceId, queryKey: getListConferenceSponsorsQueryKey(conferenceId) }
  });

  const importSponsors = useBulkImportSponsors({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Input must be an array of objects");
      
      importSponsors.mutate({ id: conferenceId, data: { sponsors: parsed, replaceAll } }, {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListConferenceSponsorsQueryKey(conferenceId) });
          toast({ title: "Import successful", description: `Imported ${res.imported} sponsors.` });
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
          <CardTitle>Bulk Import Sponsors</CardTitle>
          <CardDescription>Paste JSON array of sponsor objects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder='[{"name": "Acme Corp", "tier": "Gold", "externalId": "spon_1"}]' 
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="font-mono text-sm h-32"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="replace-all" checked={replaceAll} onCheckedChange={setReplaceAll} />
              <Label htmlFor="replace-all">Replace all existing</Label>
            </div>
            <Button onClick={handleImport} disabled={!jsonInput || importSponsors.isPending}>
              {importSponsors.isPending ? "Importing..." : "Import JSON"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No sponsors found.</TableCell></TableRow>
            ) : (
              listData?.sponsors.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.tier}</TableCell>
                  <TableCell>{s.website || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
