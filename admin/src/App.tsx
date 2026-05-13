
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Departments } from './pages/Departments';
import { Hierarchy } from './pages/Hierarchy';
import { Officers } from './pages/Officers';
import { Complaints } from './pages/Complaints';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Notifications } from './pages/Notifications';
import { Login } from './pages/Login';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/hierarchy" element={<Hierarchy />} />
          <Route path="/officers" element={<Officers />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
