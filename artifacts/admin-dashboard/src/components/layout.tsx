import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Layers, LogOut, Settings } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { pin, logout } = useAdmin();
  const [location] = useLocation();

  if (!pin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-card border-r flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b">
          <Layers className="h-6 w-6 text-primary mr-3" />
          <span className="font-bold text-lg tracking-tight">UOA Congress</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link href="/conferences" className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${location.startsWith("/conferences") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            <Settings className="h-5 w-5 mr-3 flex-shrink-0" />
            Conferences
          </Link>
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="h-5 w-5 mr-3" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 border-b bg-card md:hidden">
          <div className="flex items-center">
            <Layers className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold">UOA Congress</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
