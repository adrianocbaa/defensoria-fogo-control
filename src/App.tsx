import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NucleiProvider } from "@/contexts/NucleiContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import MainDashboard from "./pages/MainDashboard";
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
import { Medicao } from "./pages/Medicao";
import Inventory from "./pages/Inventory";

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
      {/* Public routes */}
      <Route path="/public" element={<PublicView />} />
      <Route path="/public/obras" element={<Obras />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      
      {/* Protected routes with AppLayout */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <MainDashboard />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/maintenance" element={
        <ProtectedRoute>
          <AppLayout>
            <Maintenance />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/inventory" element={
        <ProtectedRoute>
          <AppLayout>
            <Inventory />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/obras" element={
        <ProtectedRoute>
          <AppLayout>
            <Obras />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute>
          <AppLayout>
            <AdminPanel />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/obras" element={
        <ProtectedRoute>
          <AppLayout>
            <AdminObras />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/obras/nova" element={
        <ProtectedRoute>
          <AppLayout>
            <AdminObraNova />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/obras/:id/editar" element={
        <ProtectedRoute>
          <AppLayout>
            <AdminObraEdit />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/obras/lista" element={
        <ProtectedRoute>
          <AppLayout>
            <ObrasLista />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Legacy routes without layout */}
      <Route path="/medicao/:id" element={<ProtectedRoute><Medicao /></ProtectedRoute>} />
      <Route path="/nucleus/:id" element={<NucleusDetails />} />
      <Route path="/map-pins" element={
        <ProtectedRoute>
          <MapPinSelector />
        </ProtectedRoute>
      } />
      
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
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
