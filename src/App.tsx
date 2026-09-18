import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Each tool is its own chunk: the suite index opens instantly and a tool's
// heavy data (color libraries, font engines, paper.js) loads only when used.
const Login = lazy(() => import("./pages/Login"));
const UnbsColor = lazy(() => import("./pages/UnbsColor"));
const UnbsGrid = lazy(() => import("./pages/UnbsGrid"));
const UnbsFormat = lazy(() => import("./pages/UnbsFormat"));
const UnbsFont = lazy(() => import("./pages/UnbsFont"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="h-dvh flex flex-col bg-background" aria-busy="true" aria-live="polite">
    <div className="h-12 material-chrome" />
    <div className="flex-1 grid place-items-center">
      <div className="flex items-center gap-2 text-footnote text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-accent pulse-dot shadow-hairline-strong" />
        Carregando ferramenta…
      </div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unbscolor/*" element={<UnbsColor />} />
            <Route path="/unbsgrid/*" element={<UnbsGrid />} />
            <Route path="/unbsformat/*" element={<UnbsFormat />} />
            <Route path="/unbsfont/*" element={<UnbsFont />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
