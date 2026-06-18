import { useLocation, Link } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { useListConferences, useCreateConference, getListConferencesQueryKey, useCloneConference } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Plus, Calendar, MapPin, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  organization: z.string().min(1, "Organization is required"),
});

const cloneSchema = z.object({
  name: z.string().min(1, "New name is required"),
});

export default function Conferences() {
  const { pin } = useAdmin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneOpenId, setCloneOpenId] = useState<number | null>(null);

  const { data: conferencesList, isLoading } = useListConferences({
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: { enabled: !!pin, queryKey: getListConferencesQueryKey() }
  });

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", organization: "Utah Optometric Association" }
  });

  const cloneForm = useForm<z.infer<typeof cloneSchema>>({
    resolver: zodResolver(cloneSchema),
    defaultValues: { name: "" }
  });

  const createConf = useCreateConference({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const cloneConf = useCloneConference({
    request: { headers: { "X-Admin-Pin": pin || "" } }
  });

  const onCreate = (values: z.infer<typeof createSchema>) => {
    createConf.mutate({ data: values }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListConferencesQueryKey() });
        setCreateOpen(false);
        createForm.reset();
        setLocation(`/conferences/${data.id}`);
        toast({ title: "Conference created successfully" });
      }
    });
  };

  const onClone = (id: number, values: z.infer<typeof cloneSchema>) => {
    cloneConf.mutate({ id, data: values }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListConferencesQueryKey() });
        setCloneOpenId(null);
        cloneForm.reset();
        setLocation(`/conferences/${data.conference.id}`);
        toast({ title: "Conference cloned successfully" });
      }
    });
  };

  if (!pin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conferences</h1>
          <p className="text-muted-foreground mt-1">Manage your events and apps</p>
        </div>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Conference
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Conference</DialogTitle>
              <DialogDescription>Start a new event from scratch.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name</FormLabel>
                      <FormControl><Input placeholder="e.g. UOA Annual Congress 2026" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createConf.isPending}>
                    {createConf.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : conferencesList?.conferences?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <h3 className="mt-2 text-lg font-semibold">No conferences</h3>
          <p className="mt-1 text-muted-foreground text-sm">Get started by creating a new conference.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {conferencesList?.conferences.map((conf) => (
            <Card key={conf.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow group">
              <div 
                className="h-2 w-full" 
                style={{ backgroundColor: conf.primary_color || "hsl(var(--primary))" }}
              />
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="leading-tight group-hover:text-primary transition-colors">
                      <Link href={`/conferences/${conf.id}`}>{conf.name}</Link>
                    </CardTitle>
                    <CardDescription className="mt-1">{conf.organization}</CardDescription>
                  </div>
                  {conf.published && (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Live
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {conf.dates || "Dates TBD"}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    {conf.location || "Location TBD"}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 py-3 flex gap-2 border-t">
                <Button variant="secondary" className="w-full bg-background" asChild>
                  <Link href={`/conferences/${conf.id}`}>Manage</Link>
                </Button>
                
                <Dialog open={cloneOpenId === conf.id} onOpenChange={(open) => !open && setCloneOpenId(null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setCloneOpenId(conf.id)} title="Clone">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Clone Conference</DialogTitle>
                      <DialogDescription>Create a copy of {conf.name} including its structure.</DialogDescription>
                    </DialogHeader>
                    <Form {...cloneForm}>
                      <form onSubmit={cloneForm.handleSubmit((v) => onClone(conf.id, v))} className="space-y-4">
                        <FormField
                          control={cloneForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Event Name</FormLabel>
                              <FormControl><Input placeholder={`${conf.name} (Copy)`} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={cloneConf.isPending}>
                            {cloneConf.isPending ? "Cloning..." : "Clone Event"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
