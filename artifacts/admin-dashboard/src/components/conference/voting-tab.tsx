import { useAdmin } from "@/hooks/use-admin";
import {
  useGetVotingState,
  useGetVotingResults,
  useOpenVoting,
  useCloseVoting,
  useResetVoting,
  getGetVotingStateQueryKey,
  getGetVotingResultsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SLATE_COLORS: Record<string, string> = {
  approve: "#22c55e",
  disapprove: "#ef4444",
  abstain: "#94a3b8",
};

const TRUSTEE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];

export function VotingTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const headers = { "X-Conference-Id": String(conferenceId), "X-Admin-Pin": pin || "" };

  const { data: state, isLoading: stateLoading } = useGetVotingState({
    request: { headers: { "X-Conference-Id": String(conferenceId) } },
    query: {
      enabled: !!conferenceId,
      queryKey: getGetVotingStateQueryKey(),
      refetchInterval: 10000,
    }
  });

  const { data: results, isLoading: resultsLoading } = useGetVotingResults({
    request: { headers },
    query: {
      enabled: !!conferenceId && !!pin,
      queryKey: getGetVotingResultsQueryKey(),
      refetchInterval: 10000,
    }
  });

  const openVoting = useOpenVoting({ request: { headers } });
  const closeVoting = useCloseVoting({ request: { headers } });
  const resetVoting = useResetVoting({ request: { headers } });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetVotingStateQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetVotingResultsQueryKey() });
  };

  const handleAction = (mutation: { mutate: (v: undefined, opts: object) => void; isPending: boolean }, actionName: string) => {
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast({ title: `Voting ${actionName}` });
        refresh();
      },
      onError: () => {
        toast({ variant: "destructive", title: `Failed to ${actionName.toLowerCase()} voting` });
      }
    });
  };

  if (stateLoading || resultsLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading voting data...</div>;
  }

  const isOpen = state?.isOpen ?? false;
  const totalVotes = results?.totalVotes ?? 0;

  const slateData = results?.slateResults
    ? Object.entries(results.slateResults).map(([key, count]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        votes: Number(count),
        key,
      }))
    : [];

  const trusteeData = results?.trusteeResults
    ? Object.entries(results.trusteeResults)
        .map(([key, count]) => ({ name: key, votes: Number(count) }))
        .sort((a, b) => b.votes - a.votes)
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Control Panel */}
      <Card className={isOpen ? "border-green-500/40 shadow-sm" : ""}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voting Control</CardTitle>
              <CardDescription>
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""} recorded · refreshes every 10s
              </CardDescription>
            </div>
            <div
              data-testid="voting-status-badge"
              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                isOpen ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground"
              }`}
            >
              {isOpen ? "● LIVE" : "CLOSED"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {!isOpen ? (
              <Button
                data-testid="button-open-voting"
                onClick={() => handleAction(openVoting, "opened")}
                disabled={openVoting.isPending}
              >
                <Play className="w-4 h-4 mr-2" /> Open Voting
              </Button>
            ) : (
              <Button
                data-testid="button-close-voting"
                variant="destructive"
                onClick={() => handleAction(closeVoting, "closed")}
                disabled={closeVoting.isPending}
              >
                <Square className="w-4 h-4 mr-2" /> Close Voting
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  data-testid="button-reset-voting"
                  variant="outline"
                  disabled={resetVoting.isPending || isOpen}
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset All Votes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all votes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes all {totalVotes} recorded votes. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleAction(resetVoting, "reset")}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, reset votes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Officer Slate */}
        <Card>
          <CardHeader>
            <CardTitle>Officer Slate</CardTitle>
            <CardDescription>Approve / Disapprove / Abstain</CardDescription>
          </CardHeader>
          <CardContent>
            {slateData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={slateData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} vote${value !== 1 ? "s" : ""}`, ""]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                    {slateData.map((entry) => (
                      <Cell key={entry.key} fill={SLATE_COLORS[entry.key] ?? "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No slate votes yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trustee Election */}
        <Card>
          <CardHeader>
            <CardTitle>Trustee Election</CardTitle>
            <CardDescription>Top candidates by vote count</CardDescription>
          </CardHeader>
          <CardContent>
            {trusteeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={trusteeData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} vote${value !== 1 ? "s" : ""}`, ""]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="votes" radius={[0, 4, 4, 0]}>
                    {trusteeData.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={TRUSTEE_COLORS[i % TRUSTEE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No trustee votes yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw results table for reference */}
      {(slateData.length > 0 || trusteeData.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Raw Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              {slateData.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Officer Slate</p>
                  <div className="space-y-1">
                    {slateData.map((row) => (
                      <div key={row.key} className="flex justify-between py-1 border-b border-border last:border-0">
                        <span className="capitalize">{row.name}</span>
                        <span className="font-mono font-medium">{row.votes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {trusteeData.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Trustee Candidates</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {trusteeData.map((row) => (
                      <div key={row.name} className="flex justify-between py-1 border-b border-border last:border-0">
                        <span>{row.name}</span>
                        <span className="font-mono font-medium">{row.votes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
