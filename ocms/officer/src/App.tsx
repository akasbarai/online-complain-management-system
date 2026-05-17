
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Complaints } from './pages/Complaints';
import { ComplaintDetails } from './pages/ComplaintDetails';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { ResetPassword } from './pages/ResetPassword';
import { AuthService } from './services/api';
import { Status } from './types';

// Use a layout component pattern instead of wrapping children to handle protection
const ProtectedLayout = () => {
  const [officer, setOfficer] = React.useState(AuthService.getCurrentOfficer());

  React.useEffect(() => {
    const checkStatus = async () => {
      const currentOfficer = AuthService.getCurrentOfficer();
      if (!currentOfficer) {
        setOfficer(null);
        return;
      }
      
      try {
        const freshOfficer = await AuthService.getStatus();
        if (freshOfficer.status === Status.INACTIVE || freshOfficer.status === Status.BLOCKED) {
          AuthService.logout();
          window.location.reload();
          return;
        }
        
        if (freshOfficer.status !== officer?.status) {
          setOfficer(freshOfficer);
          localStorage.setItem('currentOfficer', JSON.stringify(freshOfficer));
        }
      } catch {
        AuthService.logout();
        setOfficer(null);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [officer]);

  if (!officer || officer.status === Status.INACTIVE || officer.status === Status.BLOCKED) {
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="complaints/:id" element={<ComplaintDetails />} />
          <Route path="resolved" element={<Complaints />} /> 
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
