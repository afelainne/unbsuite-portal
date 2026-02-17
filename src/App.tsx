import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import UnbsColor from "./pages/UnbsColor";
import UnbsGrid from "./pages/UnbsGrid";
import UnbsFont from "./pages/UnbsFont";
import UnbsFormat from "./pages/UnbsFormat";
import UnbsMockup from "./pages/UnbsMockup";
import UnbsType from "./pages/UnbsType";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unbscolor/*" element={<UnbsColor />} />
          <Route path="/unbsgrid/*" element={<UnbsGrid />} />
          <Route path="/unbsfont/*" element={<UnbsFont />} />
          <Route path="/unbsformat/*" element={<UnbsFormat />} />
          <Route path="/unbsmockup/*" element={<UnbsMockup />} />
          <Route path="/unbstype/*" element={<UnbsType />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
