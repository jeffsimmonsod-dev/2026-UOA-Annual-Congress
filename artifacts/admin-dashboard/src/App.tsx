import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminProvider } from "@/hooks/use-admin";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Conferences from "@/pages/conferences";
import ConferenceDetail from "@/pages/conference-detail";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/conferences" component={Conferences} />
      <Route path="/conferences/:id" component={ConferenceDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AdminProvider>
            <AppLayout>
              <Router />
            </AppLayout>
          </AdminProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
