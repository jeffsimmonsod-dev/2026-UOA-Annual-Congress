import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getGetVotingResultsQueryKey } from "@workspace/api-client-react";

type BallotResponse =
  | { configured: true; trusteeCandidates: string[]; maxTrusteeSelections: number }
  | { configured: false; code?: string; error?: string };

/**
 * Per-conference trustee ballot: candidate names (one per line, in ballot
 * order) and how many each voter may pick. Saved with PUT /api/voting/config.
 */
export function BallotCard({ conferenceId, isOpen }: { conferenceId: number; isOpen: boolean }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const headers = { "X-Conference-Id": String(conferenceId), "X-Admin-Pin": pin || "" };
  const queryKey = ["voting-config", conferenceId];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!conferenceId,
    queryFn: async (): Promise<BallotResponse> => {
      const res = await fetch("/api/voting/config", { headers: { "X-Conference-Id": String(conferenceId) } });
      if (res.status === 404) return { configured: false };
      if (!res.ok) throw new Error(`Could not load the ballot (${res.status})`);
      return (await res.json()) as BallotResponse;
    },
  });

  const [names, setNames] = useState("");
  const [max, setMax] = useState("1");
  useEffect(() => {
    if (data?.configured) {
      setNames(data.trusteeCandidates.join("\n"));
      setMax(String(data.maxTrusteeSelections));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async (force: boolean) => {
      const trusteeCandidates = names.split("\n").map((n) => n.trim()).filter(Boolean);
      const res = await fetch("/api/voting/config", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ trusteeCandidates, maxTrusteeSelections: Number(max), force }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) throw Object.assign(new Error(body.error || `Save failed (${res.status})`), { code: body.code });
      return body;
    },
    onSuccess: () => {
      toast({ title: "Ballot saved" });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: getGetVotingResultsQueryKey() });
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === "votes_exist" && window.confirm(`${err.message}\n\nChange the candidates anyway?`)) {
        save.mutate(true);
        return;
      }
      toast({ variant: "destructive", title: "Could not save the ballot", description: err.message });
    },
  });

  const count = names.split("\n").filter((n) => n.trim()).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ballot</CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading…"
            : data?.configured
              ? "Trustee candidates shown in the app for this conference."
              : "Voting is not set up for this conference yet. Add candidates to enable it."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ballot-candidates">Trustee candidates (one per line, in ballot order)</Label>
          <Textarea
            id="ballot-candidates"
            data-testid="input-ballot-candidates"
            rows={6}
            value={names}
            onChange={(e) => setNames(e.target.value)}
            disabled={isOpen}
            placeholder={"Dr. Jane Doe\nDr. John Smith"}
          />
        </div>
        <div className="flex items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="ballot-max">Max picks per voter</Label>
            <Input
              id="ballot-max"
              data-testid="input-ballot-max"
              type="number"
              min={1}
              max={Math.max(count, 1)}
              className="w-28"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              disabled={isOpen}
            />
          </div>
          <Button
            data-testid="button-save-ballot"
            onClick={() => save.mutate(false)}
            disabled={isOpen || save.isPending || count === 0 || !pin}
          >
            Save ballot
          </Button>
        </div>
        {isOpen && <p className="text-sm text-muted-foreground">Close voting to change the ballot.</p>}
      </CardContent>
    </Card>
  );
}
