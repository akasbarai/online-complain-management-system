
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyAccount } from './pages/VerifyAccount';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { LodgeComplaint } from './pages/LodgeComplaint';
import { ComplaintDetails } from './pages/ComplaintDetails';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { AuthService } from './services/api';
import { Status } from './types';

const ProtectedLayout = () => {
  const [user, setUser] = React.useState(AuthService.getCurrentUser());

  React.useEffect(() => {
    const checkStatus = async () => {
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        setUser(null);
        return;
      }
      
      try {
        const freshUser = await AuthService.getStatus();
        if (freshUser.status === Status.BLOCKED || freshUser.status === Status.INACTIVE) {
          AuthService.logout();
          window.location.reload();
          return;
        }
        
        if (freshUser.status !== user?.status) {
          setUser(freshUser);
          localStorage.setItem('currentUser', JSON.stringify(freshUser));
        }
      } catch {
        AuthService.logout();
        setUser(null);
      }
    };

    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || user.status === Status.BLOCKED || user.status === Status.INACTIVE) return <Navigate to="/login" replace />;
  return <Layout />;
};

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyAccount />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="lodge" element={<LodgeComplaint />} />
          <Route path="complaints/:id" element={<ComplaintDetails />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
