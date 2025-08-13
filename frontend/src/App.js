import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import MainLayout from './components/Layout/MainLayout';
import LazyLoader from './components/Loading/LazyLoader';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardTest from './pages/DashboardTest';
import DashboardSimple from './pages/DashboardSimple';
import './styles/index.css';
import 'react-toastify/dist/ReactToastify.css';

// Lazy loading de componentes para melhor performance
const FinancialDashboard = lazy(() => import('./pages/Financial/FinancialDashboard'));
const TransactionsList = lazy(() => import('./pages/Financial/TransactionsList'));
const TransactionDetails = lazy(() => import('./pages/Financial/TransactionDetails'));
const CreateTransaction = lazy(() => import('./pages/Financial/CreateTransaction'));

const MaintenanceDashboard = lazy(() => import('./pages/Maintenance/MaintenanceDashboard'));
const MaintenanceRequestsList = lazy(() => import('./pages/Maintenance/MaintenanceRequestsList'));
const CreateMaintenanceRequest = lazy(() => import('./pages/Maintenance/CreateMaintenanceRequest'));
const MaintenanceRequestDetails = lazy(() => import('./pages/Maintenance/MaintenanceRequestDetails'));

const CommunicationsDashboard = lazy(() => import('./pages/Communications/CommunicationsDashboard'));
const CommunicationsList = lazy(() => import('./pages/Communications/CommunicationsList'));
const CreateCommunication = lazy(() => import('./pages/Communications/CreateCommunication'));

const CommonAreasDashboard = lazy(() => import('./pages/CommonAreas/CommonAreasDashboard'));
const CommonAreasList = lazy(() => import('./pages/CommonAreas/CommonAreasList'));
const CreateCommonArea = lazy(() => import('./pages/CommonAreas/CreateCommonArea'));

const BookingsDashboard = lazy(() => import('./pages/Bookings/BookingsDashboard'));
const BookingsList = lazy(() => import('./pages/Bookings/BookingsList'));
const CreateBooking = lazy(() => import('./pages/Bookings/CreateBooking'));

const UsersDashboard = lazy(() => import('./pages/Users/UsersDashboard'));
const UsersList = lazy(() => import('./pages/Users/UsersList'));
const CreateUser = lazy(() => import('./pages/Users/CreateUser'));

const CondominiumDashboard = lazy(() => import('./pages/Condominiums/CondominiumDashboard'));
const CondominiumsList = lazy(() => import('./pages/Condominiums/CondominiumsList'));
const CreateCondominium = lazy(() => import('./pages/Condominiums/CreateCondominium'));

const UnitsDashboard = lazy(() => import('./pages/Units/UnitsDashboard'));
const UnitsList = lazy(() => import('./pages/Units/UnitsList'));
const CreateUnit = lazy(() => import('./pages/Units/CreateUnit'));
const UnitDetails = lazy(() => import('./pages/Units/UnitDetails'));

const Reports = lazy(() => import('./pages/Reports/Reports'));
const FinancialReport = lazy(() => import('./pages/Reports/FinancialReport'));






// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// App Routes component (needs to be inside AuthProvider and WebSocketProvider)
const AppRoutes = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Test routes - sem layout */}
          <Route path="/dashboard-test" element={
            <ProtectedRoute>
              <DashboardTest />
            </ProtectedRoute>
          } />
          <Route path="/dashboard-simple" element={
            <ProtectedRoute>
              <DashboardSimple />
            </ProtectedRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard-simple" element={<DashboardSimple />} />
            <Route path="dashboard-test" element={<DashboardTest />} />
            
            {/* Financial Module Routes */}
            <Route path="financeiro" element={
              <Suspense fallback={<LazyLoader />}>
                <FinancialDashboard />
              </Suspense>
            } />
            <Route path="financeiro/transacoes" element={
              <Suspense fallback={<LazyLoader />}>
                <TransactionsList />
              </Suspense>
            } />
            <Route path="financeiro/transacoes/:id" element={
              <Suspense fallback={<LazyLoader />}>
                <TransactionDetails />
              </Suspense>
            } />
            <Route path="financeiro/transacoes/nova" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateTransaction />
              </Suspense>
            } />
            <Route path="financeiro/transacoes/:id/editar" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateTransaction />
              </Suspense>
            } />
            
            {/* Maintenance Module Routes */}
            <Route path="manutencao" element={
              <Suspense fallback={<LazyLoader />}>
                <MaintenanceDashboard />
              </Suspense>
            } />
            <Route path="manutencao/solicitacoes" element={
              <Suspense fallback={<LazyLoader />}>
                <MaintenanceRequestsList />
              </Suspense>
            } />
            <Route path="manutencao/solicitacoes/nova" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateMaintenanceRequest />
              </Suspense>
            } />
            <Route path="manutencao/solicitacoes/:id" element={
              <Suspense fallback={<LazyLoader />}>
                <MaintenanceRequestDetails />
              </Suspense>
            } />
            
            {/* Communications Module Routes */}
            <Route path="comunicados" element={
              <Suspense fallback={<LazyLoader />}>
                <CommunicationsDashboard />
              </Suspense>
            } />
            <Route path="comunicados/lista" element={
              <Suspense fallback={<LazyLoader />}>
                <CommunicationsList />
              </Suspense>
            } />
            <Route path="comunicados/nova" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateCommunication />
              </Suspense>
            } />
            
            {/* Common Areas Module Routes */}
            <Route path="areas-comuns" element={
              <Suspense fallback={<LazyLoader />}>
                <CommonAreasDashboard />
              </Suspense>
            } />
            <Route path="areas-comuns/lista" element={
              <Suspense fallback={<LazyLoader />}>
                <CommonAreasList />
              </Suspense>
            } />
            <Route path="areas-comuns/nova" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateCommonArea />
              </Suspense>
            } />
            
            {/* Bookings Module Routes */}
            <Route path="reservas" element={
              <Suspense fallback={<LazyLoader />}>
                <BookingsDashboard />
              </Suspense>
            } />
            <Route path="reservas/lista" element={
              <Suspense fallback={<LazyLoader />}>
                <BookingsList />
              </Suspense>
            } />
            <Route path="reservas/nova" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateBooking />
              </Suspense>
            } />
            
            {/* Users Module Routes */}
            <Route path="usuarios" element={
              <Suspense fallback={<LazyLoader />}>
                <UsersDashboard />
              </Suspense>
            } />
            <Route path="usuarios/lista" element={
              <Suspense fallback={<LazyLoader />}>
                <UsersList />
              </Suspense>
            } />
            <Route path="usuarios/novo" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateUser />
              </Suspense>
            } />
            <Route path="usuarios/:id/editar" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateUser />
              </Suspense>
            } />
            
            {/* Condominiums Module Routes */}
            <Route path="condominios" element={
              <Suspense fallback={<LazyLoader />}>
                <CondominiumDashboard />
              </Suspense>
            } />
            <Route path="condominios/lista" element={
              <Suspense fallback={<LazyLoader />}>
                <CondominiumsList />
              </Suspense>
            } />
            <Route path="condominios/novo" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateCondominium />
              </Suspense>
            } />
            <Route path="condominios/:id/editar" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateCondominium />
              </Suspense>
            } />
            
            {/* Units Module Routes */}
            <Route path="unidades" element={
              <Suspense fallback={<LazyLoader />}>
                <UnitsDashboard />
              </Suspense>
            } />
            <Route path="unidades/lista" element={
              <Suspense fallback={<LazyLoader />}>
                <UnitsList />
              </Suspense>
            } />
            <Route path="unidades/nova" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateUnit />
              </Suspense>
            } />
            <Route path="unidades/:id/editar" element={
              <Suspense fallback={<LazyLoader />}>
                <CreateUnit />
              </Suspense>
            } />
            <Route path="unidades/:id/detalhes" element={
              <Suspense fallback={<LazyLoader />}>
                <UnitDetails />
              </Suspense>
            } />
            
            {/* Reports Module Routes */}
            <Route path="relatorios" element={
              <Suspense fallback={<LazyLoader />}>
                <Reports />
              </Suspense>
            } />
            <Route path="relatorios/financeiro" element={
              <Suspense fallback={<LazyLoader />}>
                <FinancialReport />
              </Suspense>
            } />
            <Route path="reports/financial" element={
              <Suspense fallback={<LazyLoader />}>
                <FinancialReport />
              </Suspense>
            } />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        
        {/* Toast notifications container */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppRoutes />
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;