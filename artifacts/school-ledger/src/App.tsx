import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createIdbPersister } from "@/lib/idb-persister";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import StudentDetail from "@/pages/students/detail";
import Payments from "@/pages/payments";
import Fees from "@/pages/fees";
import Accounts from "@/pages/accounts";
import Capitation from "@/pages/capitation";
import Expenses from "@/pages/expenses";
import Reports from "@/pages/reports";

import { Layout } from "@/components/layout";

const ONE_HOUR = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR * 24;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: ONE_HOUR,
      gcTime: ONE_DAY,
    },
  },
});

const persister = createIdbPersister();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/students" component={Students} />
        <Route path="/students/:id" component={StudentDetail} />
        <Route path="/payments" component={Payments} />
        <Route path="/fees" component={Fees} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/capitation" component={Capitation} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_DAY,
        buster: "v2",
      }}
    >
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
