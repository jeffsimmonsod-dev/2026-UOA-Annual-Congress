import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { useGetPushStats, useSendPushNotification, getGetPushStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

const pushSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
});

interface PushSendRecord {
  id: number;
  title: string;
  source: string;
  attempted: number;
  accepted: number;
  failed: number;
  delivered: number;
  receipt_failed: number;
  awaiting_receipts: number;
  created_at: string;
}

export function PushTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const headers = { "X-Conference-Id": String(conferenceId), "X-Admin-Pin": pin || "" };

  const statsKey = [...getGetPushStatsQueryKey(), conferenceId];
  const { data: stats } = useGetPushStats({
    request: { headers },
    query: { enabled: !!conferenceId && !!pin, queryKey: statsKey },
  });

  const historyKey = ["push-history", conferenceId];
  const { data: history } = useQuery({
    queryKey: historyKey,
    enabled: !!conferenceId && !!pin,
    queryFn: async () => {
      const res = await fetch("/api/push/history", { headers });
      if (!res.ok) throw new Error(`Could not load send history (${res.status})`);
      return (await res.json()) as { sends: PushSendRecord[] };
    },
  });

  const form = useForm<z.infer<typeof pushSchema>>({
    resolver: zodResolver(pushSchema),
    defaultValues: { title: "", body: "" },
  });

  const sendPush = useSendPushNotification({ request: { headers } });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: statsKey });
    queryClient.invalidateQueries({ queryKey: historyKey });
  };

  const onSubmit = (values: z.infer<typeof pushSchema>) => {
    sendPush.mutate(
      { data: values },
      {
        onSuccess: (res) => {
          refresh();
          const attempted = res.attempted ?? 0;
          const sent = res.sent ?? 0;
          const failed = res.failed ?? 0;
          if (!res.success) {
            toast({ variant: "destructive", title: "Not sent", description: res.message || "Unknown error" });
            return;
          }
          const counts = `Accepted for ${sent} of ${attempted} device(s)${failed ? `, ${failed} failed` : ""}.`;
          toast({
            variant: failed ? "destructive" : undefined,
            title: failed ? "Partly sent" : "Notification sent",
            description: res.warning ? `${counts} ${res.warning}` : counts,
          });
          form.reset();
        },
        onError: (err) => {
          refresh();
          toast({ variant: "destructive", title: "Not sent", description: err.message || "Failed to send notification." });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Bell className="w-5 h-5 mr-2" />
            Audience Reach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.registeredDevices || 0}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Registered devices capable of receiving notifications
            {stats && (stats.ios !== undefined || stats.android !== undefined)
              ? ` (iOS ${stats.ios ?? 0}, Android ${stats.android ?? 0})`
              : ""}
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>Blast a push notification to all attendees.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Keynote starting soon!" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Body</FormLabel>
                  <FormControl><Textarea placeholder="The opening keynote will begin in 10 minutes in the Main Hall." rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={sendPush.isPending || !stats?.registeredDevices}>
                  {sendPush.isPending ? "Sending..." : "Send to All Devices"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {history && history.sends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sends</CardTitle>
            <CardDescription>
              "Accepted" means Expo's push service took the message. "Delivered" comes from delivery receipts, which
              arrive about 15 minutes later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {history.sends.map((s) => (
                <li key={s.id} className="py-2">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleString()} · {s.source === "scheduled" ? "scheduled" : "manual"} ·{" "}
                    {s.attempted === 0
                      ? "no registered devices"
                      : `accepted ${s.accepted}/${s.attempted}${s.failed ? `, failed ${s.failed}` : ""}` +
                        ` · delivered ${s.delivered}${s.receipt_failed ? `, undeliverable ${s.receipt_failed}` : ""}` +
                        (s.awaiting_receipts ? ` · ${s.awaiting_receipts} awaiting receipts` : "")}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
