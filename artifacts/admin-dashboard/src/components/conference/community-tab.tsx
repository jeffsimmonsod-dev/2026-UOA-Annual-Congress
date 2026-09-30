import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAdmin } from "@/hooks/use-admin";
import { AdminPhotoPreview } from "@/components/conference/admin-photo-preview";
import { useToast } from "@/hooks/use-toast";
import { getCommunityLeaderboard, useCommunityActions, useCommunityAdmin, useCommunityAdminActions } from "@/hooks/use-community-admin";
import type { CommunityAdminAction, CommunityContent, CommunityReport } from "@/hooks/use-community-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Check, Download, Eye, EyeOff, Flag, LockKeyhole, RefreshCw, RotateCcw, ShieldAlert, Users } from "lucide-react";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function csvValue(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function contentKey(item: CommunityContent) {
  return `${item.type}:${item.id}`;
}

function actionSummary(item: CommunityAdminAction) {
  const labels: Record<string, string> = {
    hide: "Hid", restore: "Restored", restrict: "Restricted posting for",
    unrestrict: "Restored posting for", resolve_report: "Resolved",
    dismiss_report: "Dismissed", set_cutoff: "Set", clear_cutoff: "Cleared",
  };
  const target = item.targetType === "scoring_cutoff" ? "prize scoring cutoff"
    : item.targetType === "participant" ? `participant ${item.targetId}`
    : `${item.targetType} ${item.targetId}`;
  return `${labels[item.action] || item.action} ${target}`;
}

function actionValue(item: CommunityAdminAction, value: string | null) {
  if (item.targetType === "scoring_cutoff") return value ? dateLabel(value) : "None";
  if (value === "true") return item.targetType === "participant" ? "Restricted" : "Hidden";
  if (value === "false") return item.targetType === "participant" ? "Can post" : "Visible";
  return value || "None";
}

function ContentPreview({ item, conferenceId, pin }: { item: CommunityContent; conferenceId: number; pin: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/35 p-3 text-sm">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{item.authorName || "Unknown author"}</span>
        <span>·</span><span>{item.type}</span><span>·</span><span>{dateLabel(item.createdAt)}</span>
        {item.hidden && <Badge variant="secondary">Hidden</Badge>}
      </div>
      {(item.body || !item.objectPath) && <p className="whitespace-pre-wrap break-words leading-relaxed">{item.body || "No text content"}</p>}
      {item.objectPath && <AdminPhotoPreview objectPath={item.objectPath} conferenceId={conferenceId} pin={pin} alt={`Photo posted by ${item.authorName || "an attendee"}`} />}
    </div>
  );
}

export function CommunityTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const secret = pin || "";
  const { data, isLoading, isError, error, isFetching, refetch } = useCommunityAdmin(conferenceId, secret);
  const history = useCommunityAdminActions(conferenceId, secret);
  const actions = useCommunityActions(conferenceId, secret);
  const [reason, setReason] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const form = useForm<{ cutoffAt: string }>({ defaultValues: { cutoffAt: "" } });

  useEffect(() => {
    if (data && !form.formState.isDirty) form.reset({ cutoffAt: localDateTime(data.cutoffAt) });
  }, [data?.cutoffAt, form.reset, form.formState.isDirty]);

  const notifyError = (message: string, failure: unknown) =>
    toast({ variant: "destructive", title: message, description: failure instanceof Error ? failure.message : "Please try again." });

  function requiredReason() {
    const value = reason.trim();
    if (!value) toast({ variant: "destructive", title: "Enter a reason before making a decision" });
    return value;
  }

  async function changeContent(item: CommunityContent) {
    const explanation = requiredReason();
    if (!explanation) return;
    try {
      await actions.content.mutateAsync({ type: item.type, id: item.id, hidden: !item.hidden, reason: explanation });
      setReason("");
      toast({ title: item.hidden ? "Content restored" : "Content hidden" });
    } catch (failure) { notifyError("Could not update content", failure); }
  }

  async function changeUser(sessionToken: string, restricted: boolean) {
    const explanation = requiredReason();
    if (!explanation) return;
    try {
      await actions.users.mutateAsync({ sessionToken, restricted, reason: explanation });
      setReason("");
      toast({ title: restricted ? "Posting restricted" : "Posting restored" });
    } catch (failure) { notifyError("Could not update posting access", failure); }
  }

  async function changeReport(report: CommunityReport, status: "dismissed" | "resolved") {
    const explanation = requiredReason();
    if (!explanation) return;
    try {
      await actions.reports.mutateAsync({ id: report.id, status, reason: explanation });
      setReason("");
      toast({ title: status === "resolved" ? "Report resolved" : "Report dismissed" });
    } catch (failure) { notifyError("Could not update report", failure); }
  }

  async function saveCutoff(values: { cutoffAt: string }) {
    const explanation = requiredReason();
    if (!explanation) return;
    const date = new Date(values.cutoffAt);
    if (!values.cutoffAt || Number.isNaN(date.getTime())) {
      form.setError("cutoffAt", { message: "Choose a valid local date and time." });
      return;
    }
    try {
      const result = await actions.settings.mutateAsync({ cutoffAt: date.toISOString(), reason: explanation });
      form.reset({ cutoffAt: localDateTime(result.cutoffAt) });
      setReason("");
      toast({ title: "Prize scoring cutoff saved" });
    } catch (failure) { notifyError("Could not save cutoff", failure); }
  }

  async function clearCutoff() {
    const explanation = requiredReason();
    if (!explanation) return;
    try {
      await actions.settings.mutateAsync({ cutoffAt: null, reason: explanation });
      form.reset({ cutoffAt: "" });
      setReason("");
      toast({ title: "Prize scoring cutoff cleared" });
    } catch (failure) { notifyError("Could not clear cutoff", failure); }
  }

  async function exportLeaderboard() {
    setExporting(true);
    try {
      const response = await getCommunityLeaderboard(conferenceId, secret);
      if (!Array.isArray(response.leaders)) throw new Error("The leaderboard response is not a list.");
      if (!response.leaders.length) {
        toast({ title: "No leaderboard entries to export" });
        return;
      }
      const columns = ["rank", "name", "points", "sessionToken"] as const;
      const csv = "\uFEFF" + [columns.map(csvValue).join(","), ...response.leaders.map(row => columns.map(column => csvValue(row[column])).join(","))].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `community-leaderboard-${conferenceId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: `Exported ${response.leaders.length} leaderboard entries` });
    } catch (failure) { notifyError("Could not export leaderboard", failure); }
    finally { setExporting(false); }
  }

  if (isLoading) return (
    <div className="space-y-5 max-w-6xl" data-testid="status-community-loading">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]"><Skeleton className="h-96 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>
    </div>
  );

  if (isError || !data) return (
    <Card className="max-w-2xl border-destructive/30">
      <CardContent className="py-10 text-center space-y-4">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <div><h2 className="font-semibold">Community moderation unavailable</h2><p className="mt-1 text-sm text-muted-foreground" data-testid="status-community-error">{error instanceof Error ? error.message : "Unable to load community data."}</p></div>
        <Button variant="outline" onClick={() => void refetch()} data-testid="button-retry-community"><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
      </CardContent>
    </Card>
  );

  const pending = data.reports.filter(report => report.status !== "dismissed" && report.status !== "resolved");
  const closed = data.reports.filter(report => report.status === "dismissed" || report.status === "resolved");
  const byNewest = (a: CommunityReport, b: CommunityReport) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  const shownReports = showClosed ? [...pending.sort(byNewest), ...closed.sort(byNewest)] : pending.sort(byNewest);
  const hiddenCount = data.content.filter(item => item.hidden).length;
  const restrictedCount = data.users.filter(user => user.restricted).length;

  return (
    <div className="max-w-6xl space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><ShieldAlert className="h-4 w-4" /> Community operations</div>
          <h2 className="text-2xl font-bold tracking-tight">Keep the conversation useful.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review reports, manage posting access, and set when prize scoring ends.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching} data-testid="button-refresh-community"><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh</Button>
          <Button variant="outline" onClick={() => void exportLeaderboard()} disabled={exporting} data-testid="button-export-leaderboard"><Download className="mr-2 h-4 w-4" />{exporting ? "Exporting…" : "Export leaderboard CSV"}</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><Flag className="mb-3 h-4 w-4 text-primary" /><div className="text-2xl font-bold" data-testid="text-open-reports">{pending.length}</div><div className="text-xs text-muted-foreground">Reports to review</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><EyeOff className="mb-3 h-4 w-4 text-primary" /><div className="text-2xl font-bold" data-testid="text-hidden-content">{hiddenCount}</div><div className="text-xs text-muted-foreground">Hidden posts</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><LockKeyhole className="mb-3 h-4 w-4 text-primary" /><div className="text-2xl font-bold" data-testid="text-restricted-users">{restrictedCount}</div><div className="text-xs text-muted-foreground">Restricted attendees</div></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Reason for your next decision</CardTitle><CardDescription>Required for hiding or restoring content, posting access, reports, and scoring cutoff changes. The reason is saved with that decision, then cleared.</CardDescription></CardHeader>
        <CardContent>
          <Input value={reason} onChange={event => setReason(event.target.value)} maxLength={500} placeholder="Explain why you are making this change" aria-label="Reason for moderation decision" data-testid="input-community-action-reason" />
          <p className="mt-2 text-xs text-muted-foreground">Up to 500 characters. Admins share a PIN, so the history identifies actions as “Admin (shared PIN)”, not by person.</p>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2"><Flag className="h-4 w-4 text-primary" />Reports</CardTitle><CardDescription>Review the flagged item before closing a report.</CardDescription></div>
              {closed.length > 0 && <Button size="sm" variant="ghost" onClick={() => setShowClosed(!showClosed)} data-testid="button-toggle-closed-reports">{showClosed ? "Hide closed" : `Show closed (${closed.length})`}</Button>}
            </CardHeader>
            <CardContent className="space-y-3">
              {!shownReports.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground" data-testid="status-reports-empty"><Check className="mx-auto mb-2 h-6 w-6 text-primary" />No reports need attention.</div> : shownReports.map(report => {
                const target = data.content.find(item => item.type === report.type && String(item.id) === String(report.targetId));
                const isClosed = report.status === "dismissed" || report.status === "resolved";
                return <div key={report.id} className="rounded-xl border border-border p-4 space-y-3" data-testid={`card-report-${report.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Badge variant={isClosed ? "secondary" : "default"}>{report.status}</Badge><span className="text-xs text-muted-foreground">{report.type} #{report.targetId}</span></div>
                    <span className="text-xs text-muted-foreground">{dateLabel(report.createdAt)}</span>
                  </div>
                  <div><p className="text-sm font-medium break-words">{report.reason}</p><p className="mt-1 text-xs text-muted-foreground">Reported by {report.reporterName || "Unknown attendee"}</p></div>
                  {target ? <ContentPreview item={target} conferenceId={conferenceId} pin={secret} /> : <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Target content is not available in this list.</p>}
                  {!isClosed && <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => void changeReport(report, "resolved")} disabled={actions.reports.isPending} data-testid={`button-resolve-report-${report.id}`}><Check className="mr-1.5 h-3.5 w-3.5" />Resolve</Button>
                    <Button size="sm" variant="outline" onClick={() => void changeReport(report, "dismissed")} disabled={actions.reports.isPending} data-testid={`button-dismiss-report-${report.id}`}>Dismiss</Button>
                    {target && !target.hidden && <Button size="sm" variant="outline" onClick={() => void changeContent(target)} disabled={actions.content.isPending} data-testid={`button-hide-reported-${report.id}`}><EyeOff className="mr-1.5 h-3.5 w-3.5" />Hide content</Button>}
                  </div>}
                </div>;
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Content</CardTitle><CardDescription>Hide posts from attendees or restore them to the board.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {!data.content.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground" data-testid="status-content-empty">No community content yet.</div> : data.content.map(item => <div key={contentKey(item)} className="space-y-2" data-testid={`card-content-${contentKey(item)}`}>
                <ContentPreview item={item} conferenceId={conferenceId} pin={secret} />
                <Button size="sm" variant="ghost" className="ml-auto flex" disabled={actions.content.isPending} onClick={() => void changeContent(item)} data-testid={`button-toggle-content-${contentKey(item)}`}>{item.hidden ? <RotateCcw className="mr-2 h-3.5 w-3.5" /> : <EyeOff className="mr-2 h-3.5 w-3.5" />}{item.hidden ? "Restore" : "Hide"}</Button>
              </div>)}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Posting access</CardTitle><CardDescription>Restrictions prevent an attendee from posting again.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {!data.users.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground" data-testid="status-users-empty">No community participants yet.</div> : data.users.map(user => <div key={user.sessionToken} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3" data-testid={`row-user-${user.sessionToken}`}>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{user.name || "Unnamed attendee"}</p><p className="text-xs text-muted-foreground">{user.restricted ? "Posting restricted" : "Can post"}</p></div>
                {user.restricted ? <Button size="sm" variant="outline" disabled={actions.users.isPending} onClick={() => void changeUser(user.sessionToken, false)} data-testid={`button-unrestrict-user-${user.sessionToken}`}>Unrestrict</Button> : <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={actions.users.isPending} data-testid={`button-restrict-user-${user.sessionToken}`}>Restrict</Button></AlertDialogTrigger>
                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restrict {user.name || "this attendee"}?</AlertDialogTitle><AlertDialogDescription>They will no longer be able to post to the community. You can undo this later.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void changeUser(user.sessionToken, true)}>Restrict posting</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>}
              </div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-primary" />Prize scoring cutoff</CardTitle><CardDescription>Set when community activity stops earning points. Posting remains available. Times are shown in your local timezone.</CardDescription></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm" data-testid="status-posting-cutoff">{data.cutoffAt ? <>Current scoring cutoff: <strong>{dateLabel(data.cutoffAt)}</strong></> : "No scoring cutoff is set."}</p>
              <Form {...form}><form className="space-y-3" onSubmit={form.handleSubmit(saveCutoff)}>
                <FormField control={form.control} name="cutoffAt" render={({ field }) => <FormItem><FormLabel>Cutoff date and time</FormLabel><FormControl><Input type="datetime-local" {...field} data-testid="input-posting-cutoff" /></FormControl><FormMessage /></FormItem>} />
                <div className="flex flex-wrap gap-2"><Button type="submit" disabled={actions.settings.isPending} data-testid="button-save-cutoff">{actions.settings.isPending ? "Saving…" : "Save cutoff"}</Button>{data.cutoffAt && <Button type="button" variant="outline" disabled={actions.settings.isPending} onClick={() => void clearCutoff()} data-testid="button-clear-cutoff">Clear cutoff</Button>}</div>
              </form></Form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card data-testid="card-community-action-history">
        <CardHeader><CardTitle>Decision history</CardTitle><CardDescription>Newest first. Only changes to this conference are shown. Earlier decisions made before history was enabled are not available.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {history.isPending ? <Skeleton className="h-20 w-full" /> : history.isError
            ? <div className="text-sm text-destructive">Could not load decision history. <Button size="sm" variant="outline" onClick={() => void history.refetch()}>Retry</Button></div>
            : !history.data?.pages[0]?.actions.length
              ? <p className="text-sm text-muted-foreground" data-testid="status-action-history-empty">No decisions recorded yet.</p>
              : history.data.pages.flatMap(page => page.actions).map(item => (
                <div key={item.id} className="rounded-lg border border-border p-3 text-sm" data-testid={`row-community-action-${item.id}`}>
                  <div className="flex flex-wrap justify-between gap-1">
                    <strong className="break-all">{actionSummary(item)}</strong>
                    <span className="text-xs text-muted-foreground">{dateLabel(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{actionValue(item, item.previousValue)} → {actionValue(item, item.newValue)} · {item.actorLabel}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words">{item.reason}</p>
                </div>
              ))}
          {history.hasNextPage && <Button variant="outline" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()} data-testid="button-more-community-actions">{history.isFetchingNextPage ? "Loading…" : "Load older decisions"}</Button>}
        </CardContent>
      </Card>
    </div>
  );
}