import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdmin } from "@/hooks/use-admin";
import { useUpdateConference, getGetConferenceConfigQueryKey } from "@workspace/api-client-react";
import type { ConferenceConfig } from "@workspace/api-client-react";
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
  published: z.boolean().default(false),
});

type UpdateFormValues = z.infer<typeof updateSchema>;

function defaultsFromConfig(config: ConferenceConfig): UpdateFormValues {
  return {
    name: config.conferenceName || "",
    organization: config.organizationName || "",
    dates: config.dates || "",
    location: config.location || "",
    primaryColor: config.primaryColor || "#4f46e5",
    primaryDarkColor: config.primaryDarkColor || "#818cf8",
    secondaryColor: config.secondaryColor || "#f1f5f9",
    secondaryDarkColor: config.secondaryDarkColor || "#1e293b",
    accentColor: config.accentColor || "#e0e7ff",
    accentForegroundColor: config.accentForegroundColor || "#3730a3",
    logoUrl: config.logoUrl || "",
    featureVoting: config.featureVoting ?? false,
    featurePhotos: config.featurePhotos ?? false,
    featureExhibitHall: config.featureExhibitHall ?? false,
    published: (config as ConferenceConfig & { published?: boolean }).published ?? false,
  };
}

export function OverviewTab({ conferenceId, config }: { conferenceId: number; config: ConferenceConfig }) {
  const { pin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: defaultsFromConfig(config),
  });

  useEffect(() => {
    form.reset(defaultsFromConfig(config));
  }, [config]);

  const updateConf = useUpdateConference({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const onSubmit = (values: UpdateFormValues) => {
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

  const primaryColor = form.watch("primaryColor") || "#4f46e5";
  const primaryDarkColor = form.watch("primaryDarkColor") || "#818cf8";
  const secondaryColor = form.watch("secondaryColor") || "#f1f5f9";
  const secondaryDarkColor = form.watch("secondaryDarkColor") || "#1e293b";
  const accentColor = form.watch("accentColor") || "#e0e7ff";
  const accentForegroundColor = form.watch("accentForegroundColor") || "#3730a3";
  const logoUrl = form.watch("logoUrl");

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core details about the conference.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input data-testid="input-name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="organization" render={({ field }) => (
                  <FormItem><FormLabel>Organization</FormLabel><FormControl><Input data-testid="input-organization" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dates" render={({ field }) => (
                  <FormItem><FormLabel>Dates</FormLabel><FormControl><Input data-testid="input-dates" placeholder="e.g. June 4–7, 2026" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><FormControl><Input data-testid="input-location" placeholder="Venue name and city" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Colors and logo for the event app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <FormField control={form.control} name="logoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <div className="flex gap-3 items-center">
                    {logoUrl && (
                      <img src={logoUrl} alt="logo preview" className="h-10 w-auto rounded border border-border object-contain bg-muted p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    <FormControl><Input data-testid="input-logo-url" placeholder="https://..." {...field} /></FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Color pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { name: "primaryColor" as const, label: "Primary Color", val: primaryColor },
                  { name: "primaryDarkColor" as const, label: "Primary Dark Color", val: primaryDarkColor },
                  { name: "secondaryColor" as const, label: "Secondary Color", val: secondaryColor },
                  { name: "secondaryDarkColor" as const, label: "Secondary Dark Color", val: secondaryDarkColor },
                  { name: "accentColor" as const, label: "Accent Color", val: accentColor },
                  { name: "accentForegroundColor" as const, label: "Accent Foreground", val: accentForegroundColor },
                ].map(({ name, label, val }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={val.startsWith("#") ? val : "#000000"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-9 w-10 rounded border border-input cursor-pointer p-0.5 shrink-0"
                          data-testid={`color-${name}`}
                        />
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="#000000"
                            className="font-mono text-sm"
                            data-testid={`input-${name}`}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                ))}
              </div>

              {/* Live preview strip */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Color Preview</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Primary", color: primaryColor },
                    { label: "Primary Dark", color: primaryDarkColor },
                    { label: "Secondary", color: secondaryColor },
                    { label: "Accent", color: accentColor },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded border border-border shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features + Publishing */}
          <Card>
            <CardHeader>
              <CardTitle>Features & Publishing</CardTitle>
              <CardDescription>Enable modules and control visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField control={form.control} name="published" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-semibold">Published</FormLabel>
                    <p className="text-sm text-muted-foreground">Make this conference visible to attendees</p>
                  </div>
                  <FormControl><Switch data-testid="switch-published" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="featureVoting" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Voting Module</FormLabel>
                    <p className="text-sm text-muted-foreground">Business meeting ballot and results</p>
                  </div>
                  <FormControl><Switch data-testid="switch-voting" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="featurePhotos" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Photos Module</FormLabel>
                    <p className="text-sm text-muted-foreground">Attendee photo sharing gallery</p>
                  </div>
                  <FormControl><Switch data-testid="switch-photos" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="featureExhibitHall" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Exhibit Hall</FormLabel>
                    <p className="text-sm text-muted-foreground">Sponsor booths and QR check-ins</p>
                  </div>
                  <FormControl><Switch data-testid="switch-exhibit" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" data-testid="button-save-overview" disabled={updateConf.isPending}>
              {updateConf.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
