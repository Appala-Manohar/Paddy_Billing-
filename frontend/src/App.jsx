import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import NewBilling from './pages/NewBilling';
import BillHistory from './pages/BillHistory';
import MillLedger from './pages/MillLedger';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = () => {
  const { user } = useAuth();
  return (
    <div className={user ? "app-container" : ""}>
      <Sidebar />
      <main className={user ? "main-content" : ""}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login initialMode="register" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/farmers" element={<ProtectedRoute><Farmers /></ProtectedRoute>} />
          <Route path="/new-billing" element={<ProtectedRoute><NewBilling /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><BillHistory /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><MillLedger /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
