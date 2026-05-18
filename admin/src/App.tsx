
import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Departments = lazy(() => import('./pages/Departments').then(module => ({ default: module.Departments })));
const Hierarchy = lazy(() => import('./pages/Hierarchy').then(module => ({ default: module.Hierarchy })));
const Officers = lazy(() => import('./pages/Officers').then(module => ({ default: module.Officers })));
const Complaints = lazy(() => import('./pages/Complaints').then(module => ({ default: module.Complaints })));
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Users = lazy(() => import('./pages/Users').then(module => ({ default: module.Users })));
const Notifications = lazy(() => import('./pages/Notifications').then(module => ({ default: module.Notifications })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
    Loading...
  </div>
);

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </Router>
  );
}

export default App;
