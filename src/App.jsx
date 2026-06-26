import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrgAuthProvider, useOrgAuth } from './context/OrgAuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OrgProtectedRoute } from './components/OrgProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/toaster.jsx';
import { Layout } from './components/layout/Layout';
import { OrgLayout } from './components/org/OrgLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Specialties from './pages/Specialties';
import Earnings from './pages/Earnings';
import Content from './pages/Content';
import PushNotifications from './pages/PushNotifications';
import OrgLogin from './pages/org/OrgLogin';
import OrgDashboard from './pages/org/OrgDashboard';
import OrgDrivers from './pages/org/OrgDrivers';
import OrgAdmins from './pages/org/OrgAdmins';
import Organizations from './pages/Organizations';
import OrganizationAdmins from './pages/OrganizationAdmins';
import Settings from './pages/Settings';
import DoctorWithdrawalRequests from './pages/DoctorWithdrawalRequests';
import Reels from './pages/Reels';
import SosEvents from './pages/SosEvents';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginOrRedirect />} />
      <Route path="/org/login" element={<OrgLoginOrRedirect />} />
      <Route
        path="/org"
        element={
          <OrgProtectedRoute>
            <OrgLayout>
              <OrgDashboard />
            </OrgLayout>
          </OrgProtectedRoute>
        }
      />
      <Route
        path="/org/drivers"
        element={
          <OrgProtectedRoute>
            <OrgLayout>
              <OrgDrivers />
            </OrgLayout>
          </OrgProtectedRoute>
        }
      />
      <Route
        path="/org/admins"
        element={
          <OrgProtectedRoute>
            <OrgLayout>
              <OrgAdmins />
            </OrgLayout>
          </OrgProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctors"
        element={
          <ProtectedRoute>
            <Layout>
              <Doctors />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <Layout>
              <Patients />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <Layout>
              <Appointments />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/specialties"
        element={
          <ProtectedRoute>
            <Layout>
              <Specialties />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/earnings"
        element={
          <ProtectedRoute>
            <Layout>
              <Earnings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor-withdrawals"
        element={
          <ProtectedRoute>
            <Layout>
              <DoctorWithdrawalRequests />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/content"
        element={
          <ProtectedRoute>
            <Layout>
              <Content />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reels"
        element={
          <ProtectedRoute>
            <Layout>
              <Reels />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <PushNotifications />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations"
        element={
          <ProtectedRoute>
            <Layout>
              <Organizations />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization-admins"
        element={
          <ProtectedRoute>
            <Layout>
              <OrganizationAdmins />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sos-events"
        element={
          <ProtectedRoute>
            <Layout>
              <SosEvents />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LoginOrRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh bg-dots">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

function OrgLoginOrRedirect() {
  const { isAuthenticated, loading } = useOrgAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh bg-dots">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/org" replace />;
  }
  return <OrgLogin />;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <OrgAuthProvider>
            <ErrorBoundary>
              <AppRoutes />
              <Toaster />
            </ErrorBoundary>
          </OrgAuthProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
