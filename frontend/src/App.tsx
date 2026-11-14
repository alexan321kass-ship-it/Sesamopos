import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';
import { getApiUrl } from './services/mockApi';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PosScreen from './pages/PosScreen';
import KitchenScreen from './pages/KitchenScreen';
import TablesScreen from './pages/TablesScreen';
import CatalogScreen from './pages/CatalogScreen';
import InventoryScreen from './pages/InventoryScreen';
import PurchasesScreen from './pages/PurchasesScreen';
import CashRegisterScreen from './pages/CashRegisterScreen';
import DeliveryScreen from './pages/DeliveryScreen';
import StaffScreen from './pages/StaffScreen';
import CustomersScreen from './pages/CustomersScreen';
import RecipesScreen from './pages/RecipesScreen';
import ReservationsScreen from './pages/ReservationsScreen';
import AdvancedReportsScreen from './pages/AdvancedReportsScreen';
import SettingsScreen from './pages/SettingsScreen';

import PublicMenu from './pages/PublicMenu';
import InactivityTracker from './components/InactivityTracker';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Despertar backend en segundo plano (útil para Render Free Tier)
    try {
      const url = getApiUrl();
      fetch(url, { method: 'GET', mode: 'no-cors' }).catch(() => {});
    } catch (e) {}
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          {/* Monitor de inactividad: Cierre de sesión automático tras 20 minutos sin interacción */}
          <InactivityTracker />
          <Routes>
            {/* Redirección directa al login para usuarios y colaboradores del sistema */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Acceso exclusivo para clientes escaneando el código QR en mesa */}
            <Route path="/menu" element={<PublicMenu />} />
            
            {/* Inicio de sesión para personal administrativo / empleados */}
            <Route path="/login" element={<Login />} />
            
            {/* Rutas protegidas para personal del restaurante */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pos" element={<PosScreen />} />
              <Route path="kitchen" element={<KitchenScreen />} />
              <Route path="tables" element={<TablesScreen />} />
              <Route path="catalog" element={<CatalogScreen />} />
              <Route path="inventory" element={<InventoryScreen />} />
              <Route path="purchases" element={<PurchasesScreen />} />
              <Route path="cash-register" element={<CashRegisterScreen />} />
              <Route path="delivery" element={<DeliveryScreen />} />
              <Route path="staff" element={<StaffScreen />} />
              <Route path="customers" element={<CustomersScreen />} />
              <Route path="recipes" element={<RecipesScreen />} />
              <Route path="reservations" element={<ReservationsScreen />} />
              <Route path="reports" element={<AdvancedReportsScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
