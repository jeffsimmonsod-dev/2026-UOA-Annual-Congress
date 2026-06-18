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

export function VotingTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const headers = { "X-Conference-Id": String(conferenceId), "X-Admin-Pin": pin || "" };

  const { data: state, isLoading: stateLoading } = useGetVotingState({
    request: { headers: { "X-Conference-Id": String(conferenceId) } },
    query: { enabled: !!conferenceId, queryKey: getGetVotingStateQueryKey() }
  });

  const { data: results, isLoading: resultsLoading } = useGetVotingResults({
    request: { headers },
    query: { enabled: !!conferenceId && !!pin, queryKey: getGetVotingResultsQueryKey() }
  });

  const openVoting = useOpenVoting({ request: { headers } });
  const closeVoting = useCloseVoting({ request: { headers } });
  const resetVoting = useResetVoting({ request: { headers } });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetVotingStateQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetVotingResultsQueryKey() });
  };

  const handleAction = (mutation: any, actionName: string) => {
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

  if (stateLoading || resultsLoading) return <div>Loading voting data...</div>;

  const isOpen = state?.isOpen || false;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className={isOpen ? "border-primary/50 shadow-sm" : ""}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voting Control</CardTitle>
              <CardDescription>Manage the active voting session.</CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isOpen ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {isOpen ? "LIVE" : "CLOSED"}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {!isOpen ? (
              <Button onClick={() => handleAction(openVoting, "opened")} disabled={openVoting.isPending} className="w-32">
                <Play className="w-4 h-4 mr-2" /> Start Voting
              </Button>
            ) : (
              <Button onClick={() => handleAction(closeVoting, "closed")} variant="destructive" disabled={closeVoting.isPending} className="w-32">
                <Square className="w-4 h-4 mr-2" /> Stop Voting
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={resetVoting.isPending || isOpen}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset Votes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all votes currently recorded for this conference.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleAction(resetVoting, "reset")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, reset votes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Officer Slate</CardTitle>
            <CardDescription>Total votes: {results?.totalVotes || 0}</CardDescription>
          </CardHeader>
          <CardContent>
            {results?.slateResults && Object.keys(results.slateResults).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(results.slateResults).map(([key, count]) => (
                  <div key={key} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium capitalize">{key}</span>
                    <span className="bg-muted px-2 py-1 rounded-md text-sm">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No slate votes yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trustee Election</CardTitle>
            <CardDescription>Individual candidates</CardDescription>
          </CardHeader>
          <CardContent>
            {results?.trusteeResults && Object.keys(results.trusteeResults).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(results.trusteeResults).map(([key, count]) => (
                  <div key={key} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium">{key}</span>
                    <span className="bg-muted px-2 py-1 rounded-md text-sm">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No trustee votes yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
