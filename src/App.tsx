import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NucleiProvider } from "@/contexts/NucleiContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useStorageVersioning } from "@/hooks/useStorageVersioning";
import MainDashboard from "./pages/MainDashboard";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import NucleusDetails from "./pages/NucleusDetails";
import AuthPage from "./pages/AuthPage";
import PublicView from "./pages/PublicView";
import LandingPage from "./pages/LandingPage";
import PublicObras from "./pages/PublicObras";
import PublicPreventivos from "./pages/PublicPreventivos";
import PublicPreventivosDetails from "./pages/PublicPreventivosDetails";
import PublicNucleos from "./pages/PublicNucleos";
import PublicObrasLista from "./pages/PublicObrasLista";
import PublicMedicao from "./pages/PublicMedicao";
import PublicObraDetalhes from "./pages/PublicObraDetalhes";
import PublicRDO from "./pages/PublicRDO";
import PublicRDODiario from "./pages/PublicRDODiario";
import AdminPanel from "./pages/AdminPanel";
import MapPinSelector from "./pages/MapPinSelector";
import Maintenance from "./pages/Maintenance";
import Obras from "./pages/Obras";
import { AdminObras } from "./pages/AdminObras";
import { AdminObraEdit } from "./pages/AdminObraEdit";
import { AdminObraNova } from "./pages/AdminObraNova";
import { ObrasLista } from "./pages/ObrasLista";
import ObrasChecklist from "./pages/ObrasChecklist";
import ObraChecklistDetails from "./pages/ObraChecklistDetails";
import { ManutencaoPage, ObraPage, PreventivoPage, ArCondicionadoPage, ProjetosPage } from "./pages/SectorPages";
import { Medicao } from "./pages/Medicao";
import Inventory from "./pages/Inventory";
import DataRecovery from "./pages/DataRecovery";
import Profile from "./pages/Profile";
import Nucleos from "./pages/Nucleos";
import NucleosDetails from "./pages/NucleosDetails";
import NucleosCentral from "./pages/NucleosCentral";
import NucleoCentralDetails from "./pages/NucleoCentralDetails";
import NucleoCentralForm from "./pages/NucleoCentralForm";
import Teletrabalho from "./pages/Teletrabalho";
import TeletrabalhoDetails from "./pages/TeletrabalhoDetails";
import TeletrabalhoForm from "./pages/TeletrabalhoForm";
import Preventivos from "./pages/Preventivos";
import PreventivosDetails from "./pages/PreventivosDetails";
import PreventivosEdit from "./pages/PreventivosEdit";
import TeletrabalhoEdit from "./pages/TeletrabalhoEdit";
import { RDO } from "./pages/RDO";
import RDODiario from "./pages/RDODiario";
import RdoVerify from "./pages/RdoVerify";
import { PrototypesIndex } from "./pages/prototypes/PrototypesIndex";
import { MedicaoComAbas } from "./pages/prototypes/MedicaoComAbas";
import { MedicaoComSidebar } from "./pages/prototypes/MedicaoComSidebar";
import { MedicaoComAccordion } from "./pages/prototypes/MedicaoComAccordion";
import { MedicaoComModal } from "./pages/prototypes/MedicaoComModal";
import Orcamento from "./pages/Orcamento";

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
      <Route path="/public/obras" element={<PublicObras />} />
      <Route path="/public/obras/lista" element={<PublicObrasLista />} />
          <Route path="/public/obras/:id" element={<PublicObraDetalhes />} />
          <Route path="/public/obras/:id/medicao" element={<PublicMedicao />} />
          <Route path="/public/obras/:id/rdo" element={<PublicRDO />} />
      <Route path="/public/obras/:id/rdo/diario" element={<PublicRDODiario />} />
      <Route path="/public/preventivos" element={<PublicPreventivos />} />
      <Route path="/public/preventivos/:id" element={<PublicPreventivosDetails />} />
      <Route path="/public/nucleos" element={<PublicNucleos />} />
      <Route path="/rdo/verify/:hash" element={<RdoVerify />} />
      <Route path="/apresentacao" element={<LandingPage />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/medicao/:id" element={<ProtectedRoute><Medicao /></ProtectedRoute>} />
      <Route path="/dashboard" element={<Dashboard />} />
      
      {/* Main Dashboard */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainDashboard />
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
            <Preventivos />
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
      <Route 
        path="/orcamento" 
        element={
          <ProtectedRoute>
            <Orcamento />
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
        path="/inventory" 
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos" 
        element={
          <ProtectedRoute>
            <Teletrabalho />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos/novo" 
        element={
          <ProtectedRoute>
            <TeletrabalhoForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos/:id" 
        element={
          <ProtectedRoute>
            <TeletrabalhoDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos/:id/editar" 
        element={
          <ProtectedRoute>
            <TeletrabalhoForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/preventivos/:id" 
        element={
          <ProtectedRoute>
            <PreventivosDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/preventivos/:id/editar" 
        element={
          <ProtectedRoute>
            <PreventivosEdit />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/teletrabalho" 
        element={
          <ProtectedRoute>
            <Teletrabalho />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/teletrabalho/:id" 
        element={
          <ProtectedRoute>
            <TeletrabalhoDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/teletrabalho/:id/editar" 
        element={
          <ProtectedRoute>
            <TeletrabalhoEdit />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos-central" 
        element={
          <ProtectedRoute>
            <NucleosCentral />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos-central/novo" 
        element={
          <ProtectedRoute>
            <NucleoCentralForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos-central/:id" 
        element={
          <ProtectedRoute>
            <NucleoCentralDetails />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/nucleos-central/:id/editar" 
        element={
          <ProtectedRoute>
            <NucleoCentralForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/data-recovery"
        element={
          <ProtectedRoute>
            <DataRecovery />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
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
      <Route 
        path="/admin/obras/checklist" 
        element={
          <ProtectedRoute>
            <ObrasChecklist />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/obras/checklist/:id" 
        element={
          <ProtectedRoute>
            <ObraChecklistDetails />
          </ProtectedRoute>
        } 
      />
      
      {/* Prototype Routes */}
      <Route 
        path="/prototypes" 
        element={
          <ProtectedRoute>
            <PrototypesIndex />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/prototypes/abas" 
        element={
          <ProtectedRoute>
            <MedicaoComAbas />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/prototypes/sidebar" 
        element={
          <ProtectedRoute>
            <MedicaoComSidebar />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/prototypes/accordion" 
        element={
          <ProtectedRoute>
            <MedicaoComAccordion />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/prototypes/modal" 
        element={
          <ProtectedRoute>
            <MedicaoComModal />
          </ProtectedRoute>
        } 
      />
      
      <Route
        path="/obras/:obraId/rdo/diario" 
        element={
          <ProtectedRoute>
            <RDODiario />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/obras/:obraId/rdo/*" 
        element={
          <ProtectedRoute>
            <RDO />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // Detectar e limpar dados antigos/corrompidos do storage
  useStorageVersioning();

  return (
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
};

export default App;
