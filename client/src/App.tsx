import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { BookSelectionProvider } from "@/contexts/BookSelectionContext";
import { SpeedInsights } from "@vercel/speed-insights/react";
// REMOVED: Navigation guards - were causing redirect loops

import { DemoBadge } from "@/components/ui/demo-badge";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Home = lazy(() => import("@/pages/Home"));
const Product = lazy(() => import("@/pages/Product"));
const Views = lazy(() => import("@/pages/Views"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const Success = lazy(() => import("@/pages/Success"));
const Account = lazy(() => import("@/pages/Account"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

const Learn = lazy(() => import("@/pages/Learn"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Sports = lazy(() => import("@/pages/Sports"));
const Scores = lazy(() => import("@/pages/Scores"));
const Calculator = lazy(() => import("@/pages/Calculator"));
const TradingTerminal = lazy(() => import("@/pages/TradingTerminal"));
const ViewBuilder = lazy(() => import("@/pages/ViewBuilder"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ApiTest = lazy(() => import("@/pages/ApiTest"));

const FAQ = lazy(() => import("@/pages/FAQ"));
const Tutorials = lazy(() => import("@/pages/Tutorials"));
const Resources = lazy(() => import("@/pages/Resources"));
const Glossary = lazy(() => import("@/pages/Glossary"));
const Support = lazy(() => import("@/pages/Support"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Affiliate = lazy(() => import("@/pages/Affiliate"));
const GoogleCallback = lazy(() => import("@/pages/auth/google/callback"));


function Router() {
  const [location, setLocation] = useLocation();

  // REMOVED: Guarded navigation - was causing redirect loops
  // Let the router handle navigation normally

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <main>
        <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>}>
          <Switch>
          <Route path="/" component={Home} />
          <Route path="/product" component={Product} />
          <Route path="/views" component={Views} />
          <Route path="/presets" component={Views} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/success" component={Success} />
          <Route path="/account" component={Account} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />

          <Route path="/learn" component={Learn} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/scores" component={Scores} />
          <Route path="/calculator" component={Calculator} />
          <Route path="/trading-terminal" component={TradingTerminal} />
          <Route path="/preset-terminal" component={lazy(() => import("./pages/PresetTerminal"))} />
          <Route path="/view-builder" component={ViewBuilder} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/apitest" component={ApiTest} />


          <Route path="/faq" component={FAQ} />
          <Route path="/tutorials" component={Tutorials} />
          <Route path="/resources" component={Resources} />
          <Route path="/glossary" component={Glossary} />
          <Route path="/support" component={Support} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/affiliate" component={Affiliate} />
          <Route path="/auth/google/callback" component={GoogleCallback} />
          <Route component={NotFound} />
        </Switch>
        </Suspense>
      </main>
      <Footer />

      <DemoBadge />
    </div>
  );
}

function App() {
  // Initialize bulletproof debugging and monitoring
  useEffect(() => {
    console.log('🔍 Initializing bulletproof auth redirect protection...');
    // DISABLED: Tripwire monitoring was causing interference with auth flow
    // if (process.env.NODE_ENV !== "production") {
    //   initTripwireMonitoring();
    // }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DemoModeProvider>
          <BookSelectionProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
              <SpeedInsights />
            </TooltipProvider>
          </BookSelectionProvider>
        </DemoModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
