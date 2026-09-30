import { useParams, Link, useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { useGetConferenceConfig, getGetConferenceConfigQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { OverviewTab } from "@/components/conference/overview-tab";
import { SpeakersTab } from "@/components/conference/speakers-tab";
import { SessionsTab } from "@/components/conference/sessions-tab";
import { SponsorsTab } from "@/components/conference/sponsors-tab";
import { PushTab } from "@/components/conference/push-tab";
import { VotingTab } from "@/components/conference/voting-tab";
import { CommunityTab } from "@/components/conference/community-tab";

export default function ConferenceDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { pin } = useAdmin();
  const conferenceId = Number(id);

  if (!pin) {
    setLocation("/");
    return null;
  }

  const { data: config, isLoading, error } = useGetConferenceConfig(conferenceId, {
    request: { headers: { "X-Admin-Pin": pin || "" } },
    query: { enabled: !!conferenceId, queryKey: getGetConferenceConfigQueryKey(conferenceId) }
  });

  if (isNaN(conferenceId)) {
    return <div className="p-8 text-center">Invalid conference ID</div>;
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading conference data...</div>;
  }

  if (error || !config) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive font-medium">Failed to load conference</p>
        <Button onClick={() => setLocation("/conferences")} variant="outline">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full -ml-2">
          <Link href="/conferences">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{config.conferenceName}</h1>
          <p className="text-muted-foreground mt-1">{config.organizationName}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 flex w-full justify-start overflow-x-auto bg-transparent h-auto p-0 border-b rounded-none">
          {['overview', 'speakers', 'sessions', 'sponsors', 'push', 'voting', 'community'].map(tab => (
            <TabsTrigger 
              key={tab} 
              value={tab} 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 capitalize font-medium"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab conferenceId={conferenceId} config={config} />
        </TabsContent>
        <TabsContent value="speakers" className="mt-0">
          <SpeakersTab conferenceId={conferenceId} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-0">
          <SessionsTab conferenceId={conferenceId} />
        </TabsContent>
        <TabsContent value="sponsors" className="mt-0">
          <SponsorsTab conferenceId={conferenceId} />
        </TabsContent>
        <TabsContent value="push" className="mt-0">
          <PushTab conferenceId={conferenceId} />
        </TabsContent>
        <TabsContent value="voting" className="mt-0">
          <VotingTab conferenceId={conferenceId} />
        </TabsContent>
        <TabsContent value="community" className="mt-0">
          <CommunityTab conferenceId={conferenceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
