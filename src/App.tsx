import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NucleiProvider } from "@/contexts/NucleiContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import NucleusDetails from "./pages/NucleusDetails";
import AuthPage from "./pages/AuthPage";
import PublicView from "./pages/PublicView";
import AdminPanel from "./pages/AdminPanel";
import MapPinSelector from "./pages/MapPinSelector";
import Maintenance from "./pages/Maintenance";
import Obras from "./pages/Obras";
import { AdminObras } from "./pages/AdminObras";
import { AdminObraEdit } from "./pages/AdminObraEdit";
import { AdminObraNova } from "./pages/AdminObraNova";
import { ObrasLista } from "./pages/ObrasLista";
import { ManutencaoPage, ObraPage, PreventivoPage, ArCondicionadoPage, ProjetosPage } from "./pages/SectorPages";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/public" element={<PublicView />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      
      {/* Main Dashboard */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Sector Pages */}
      <Route 
        path="/manutencao" 
        element={
          <ProtectedRoute>
            <ManutencaoPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/obra" 
        element={
          <ProtectedRoute>
            <ObraPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/preventivos" 
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ar-condicionado" 
        element={
          <ProtectedRoute>
            <ArCondicionadoPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/projetos" 
        element={
          <ProtectedRoute>
            <ProjetosPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Legacy Routes */}
      <Route 
        path="/nucleus/:id" 
        element={<NucleusDetails />} 
      />
      <Route 
        path="/map-pins" 
        element={
          <ProtectedRoute>
            <MapPinSelector />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/maintenance" 
        element={
          <ProtectedRoute>
            <Maintenance />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/obras" 
        element={
          <ProtectedRoute>
            <Obras />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/obras" 
        element={
          <ProtectedRoute>
            <AdminObras />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/obras/nova" 
        element={
          <ProtectedRoute>
            <AdminObraNova />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/obras/:id/editar" 
        element={
          <ProtectedRoute>
            <AdminObraEdit />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/obras/lista" 
        element={
          <ProtectedRoute>
            <ObrasLista />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NucleiProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </NucleiProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
