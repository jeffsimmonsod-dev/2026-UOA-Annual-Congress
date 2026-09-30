import { useRef, useState } from "react";
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
import { ImageUp, Loader2 } from "lucide-react";

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: defaultsFromConfig(config),
  });
  const { dirtyFields } = form.formState;

  useEffect(() => {
    // Refresh saved fields without discarding edits to other conference settings.
    form.reset(defaultsFromConfig(config), { keepDirtyValues: Object.keys(dirtyFields).length > 0 });
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

  const handleLogoFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Please select an image file" });
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`/api/conferences/${conferenceId}/logo`, {
        method: "POST",
        headers: { "X-Admin-Pin": pin || "" },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Upload failed");
      }
      const { logoUrl } = await res.json() as { logoUrl: string };
      form.setValue("logoUrl", logoUrl, { shouldDirty: true });
      try {
        await updateConf.mutateAsync({ id: conferenceId, data: { logoUrl } });
        form.resetField("logoUrl", { defaultValue: logoUrl });
        void queryClient.invalidateQueries({ queryKey: getGetConferenceConfigQueryKey(conferenceId) });
        toast({ title: "Logo saved" });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Logo uploaded but could not be saved",
          description: `Try Save Changes to retry. ${String(err)}`,
        });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Logo upload failed", description: String(err) });
    } finally {
      setLogoUploading(false);
    }
  };

  const primaryColor = form.watch("primaryColor") || "#4f46e5";
  const primaryDarkColor = form.watch("primaryDarkColor") || "#818cf8";
  const secondaryColor = form.watch("secondaryColor") || "#f1f5f9";
  const secondaryDarkColor = form.watch("secondaryDarkColor") || "#1e293b";
  const accentColor = form.watch("accentColor") || "#e0e7ff";
  const accentForegroundColor = form.watch("accentForegroundColor") || "#3730a3";
  const logoUrl = form.watch("logoUrl");
  const conferenceName = form.watch("name") || "Conference Name";
  const conferenceDates = form.watch("dates") || "Date TBD";

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
              <CardDescription>Colors and logo that define the event app's visual identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo upload */}
              <FormField control={form.control} name="logoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conference Logo</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-3 items-center">
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt="logo preview"
                          className="h-12 w-auto max-w-[120px] rounded border border-border object-contain bg-muted p-1"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="flex gap-2 items-center flex-1">
                        <FormControl>
                          <Input
                            data-testid="input-logo-url"
                            placeholder="https://... or upload a file"
                            {...field}
                            className="flex-1"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={logoUploading}
                          onClick={() => logoInputRef.current?.click()}
                          data-testid="button-upload-logo"
                        >
                          {logoUploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ImageUp className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1.5">{logoUploading ? "Uploading…" : "Upload"}</span>
                        </Button>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoFileUpload(file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a file (JPEG, PNG, WebP, GIF, or SVG) or paste a URL directly.
                    </p>
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

              {/* Live branding preview */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live App Preview</p>
                <p className="text-xs text-muted-foreground -mt-1">
                  Simulated home screen and session card based on your current branding.
                </p>
                <div className="flex gap-4 flex-wrap">
                  {/* Home screen mock */}
                  <div className="w-44 rounded-xl overflow-hidden shadow-md border border-border shrink-0"
                    style={{ background: secondaryColor }}>
                    {/* Header */}
                    <div className="px-3 py-4" style={{ background: primaryColor }}>
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="logo"
                          className="h-7 w-auto max-w-full object-contain mb-2"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="h-5 w-20 rounded mb-2" style={{ background: `${primaryDarkColor}55` }} />
                      )}
                      <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">
                        {conferenceName}
                      </p>
                      <p className="text-white/70 text-[9px] mt-0.5">{conferenceDates}</p>
                    </div>
                    {/* Body */}
                    <div className="px-3 py-2.5 space-y-2">
                      <p className="text-[9px] font-bold tracking-wider" style={{ color: primaryColor }}>
                        UPCOMING
                      </p>
                      <div className="rounded-lg p-2" style={{ background: accentColor }}>
                        <p className="text-[9px] font-bold leading-tight" style={{ color: accentForegroundColor }}>
                          General Session
                        </p>
                        <p className="text-[8px] mt-0.5" style={{ color: accentForegroundColor, opacity: 0.75 }}>
                          9:00 AM · Main Hall
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {["Schedule", "Speakers"].map((label) => (
                          <div key={label} className="flex-1 rounded py-1.5 text-center" style={{ background: primaryColor }}>
                            <p className="text-[8px] text-white font-medium">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex border-t" style={{ borderColor: `${secondaryDarkColor}20` }}>
                      {["Home", "Sched", "More"].map((tab) => (
                        <div key={tab} className="flex-1 py-1.5 text-center">
                          <div className="w-3 h-3 rounded-sm mx-auto mb-0.5" style={{ background: `${secondaryDarkColor}30` }} />
                          <p className="text-[7px]" style={{ color: secondaryDarkColor }}>{tab}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Session card mock */}
                  <div className="w-44 rounded-xl overflow-hidden shadow-md border border-border bg-white shrink-0">
                    <div className="h-1.5" style={{ background: primaryColor }} />
                    <div className="px-3 py-3 space-y-1.5">
                      <span
                        className="inline-block text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: accentColor, color: accentForegroundColor }}
                      >
                        Keynote
                      </span>
                      <p className="text-[10px] font-bold text-gray-900 leading-tight">
                        Opening Keynote Address
                      </p>
                      <p className="text-[9px] text-gray-500">9:00 – 10:00 AM · Main Hall</p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <div className="h-5 w-5 rounded-full shrink-0" style={{ background: primaryColor }} />
                        <p className="text-[9px] text-gray-600">Dr. Jane Smith</p>
                      </div>
                    </div>
                    <div className="px-3 pb-3">
                      <div
                        className="rounded py-1.5 text-center"
                        style={{ background: primaryColor }}
                      >
                        <p className="text-[9px] text-white font-medium">+ Save to My Schedule</p>
                      </div>
                    </div>
                  </div>
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
            <Button type="submit" data-testid="button-save-overview" disabled={updateConf.isPending || logoUploading}>
              {updateConf.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
