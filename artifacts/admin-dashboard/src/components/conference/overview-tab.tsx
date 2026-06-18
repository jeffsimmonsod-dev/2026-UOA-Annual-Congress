import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdmin } from "@/hooks/use-admin";
import { useUpdateConference, getGetConferenceConfigQueryKey, ConferenceConfig } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  organization: z.string().min(1, "Organization is required"),
  dates: z.string().optional(),
  location: z.string().optional(),
  primaryColor: z.string().optional(),
  primaryDarkColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  secondaryDarkColor: z.string().optional(),
  accentColor: z.string().optional(),
  accentForegroundColor: z.string().optional(),
  logoUrl: z.string().optional(),
  featureVoting: z.boolean().default(false),
  featurePhotos: z.boolean().default(false),
  featureExhibitHall: z.boolean().default(false),
});

export function OverviewTab({ conferenceId, config }: { conferenceId: number; config: ConferenceConfig }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: config.conferenceName || "",
      organization: config.organizationName || "",
      dates: config.dates || "",
      location: config.location || "",
      primaryColor: config.primaryColor || "",
      primaryDarkColor: config.primaryDarkColor || "",
      secondaryColor: config.secondaryColor || "",
      secondaryDarkColor: config.secondaryDarkColor || "",
      accentColor: config.accentColor || "",
      accentForegroundColor: config.accentForegroundColor || "",
      logoUrl: config.logoUrl || "",
      featureVoting: config.featureVoting || false,
      featurePhotos: config.featurePhotos || false,
      featureExhibitHall: config.featureExhibitHall || false,
    }
  });

  const updateConf = useUpdateConference({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const onSubmit = (values: z.infer<typeof updateSchema>) => {
    updateConf.mutate(
      { id: conferenceId, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetConferenceConfigQueryKey(conferenceId) });
          toast({ title: "Configuration saved successfully" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to save configuration" });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core details about the conference.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="organization" render={({ field }) => (
                  <FormItem><FormLabel>Organization</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dates" render={({ field }) => (
                  <FormItem><FormLabel>Dates</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Colors and assets for the event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="logoUrl" render={({ field }) => (
                <FormItem><FormLabel>Logo URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="primaryColor" render={({ field }) => (
                  <FormItem><FormLabel>Primary Color (Hex)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="primaryDarkColor" render={({ field }) => (
                  <FormItem><FormLabel>Primary Dark Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="secondaryColor" render={({ field }) => (
                  <FormItem><FormLabel>Secondary Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="secondaryDarkColor" render={({ field }) => (
                  <FormItem><FormLabel>Secondary Dark Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Enable or disable specific app modules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="featureVoting" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Voting Module</FormLabel>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="featurePhotos" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Photos Module</FormLabel>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="featureExhibitHall" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Exhibit Hall</FormLabel>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateConf.isPending}>
              {updateConf.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
