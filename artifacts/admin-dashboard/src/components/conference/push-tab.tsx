import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

export function PushTab({ conferenceId }: { conferenceId: number }) {
  const { pin } = useAdmin();
  const { toast } = useToast();

  const { data: stats } = useGetPushStats({
    request: { headers: { "X-Conference-Id": String(conferenceId) } },
    query: { enabled: !!conferenceId, queryKey: getGetPushStatsQueryKey() }
  });

  const form = useForm<z.infer<typeof pushSchema>>({
    resolver: zodResolver(pushSchema),
    defaultValues: { title: "", body: "" }
  });

  const sendPush = useSendPushNotification({
    request: { headers: { "X-Conference-Id": String(conferenceId) } }
  });

  const onSubmit = (values: z.infer<typeof pushSchema>) => {
    sendPush.mutate(
      { data: { ...values, adminPin: pin || "" } },
      {
        onSuccess: (res) => {
          if (res.success) {
            toast({ title: "Notification Sent", description: `Successfully sent ${res.sent} notifications.` });
            form.reset();
          } else {
            toast({ variant: "destructive", title: "Send Failed", description: res.message || "Unknown error" });
          }
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to send notification." });
        }
      }
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
          <p className="text-sm text-muted-foreground mt-1">Registered devices capable of receiving notifications.</p>
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
    </div>
  );
}
