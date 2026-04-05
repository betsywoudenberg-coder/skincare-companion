import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState, Component } from "react";
import Layout from "@/components/Layout";
import Today from "@/pages/Today";
import LogDay from "@/pages/LogDay";
import Chat from "@/pages/Chat";
import Derm from "@/pages/Derm";
import Progress from "@/pages/Progress";
import NotFound from "@/pages/not-found";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <p className="font-display text-lg text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-sm">{this.state.error}</p>
          <button onClick={() => this.setState({ error: null })} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router hook={useHashLocation}>
            <Layout>
              <Switch>
                <Route path="/" component={Today} />
                <Route path="/log" component={LogDay} />
                <Route path="/log/:date" component={LogDay} />
                <Route path="/chat" component={Chat} />
                <Route path="/derm" component={Derm} />
              <Route path="/progress" component={Progress} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </Router>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
