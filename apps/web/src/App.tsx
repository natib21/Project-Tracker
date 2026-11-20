import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Organizations } from './pages/Organizations';
import { OrganizationDetail } from './pages/OrganizationDetail';
import { ProjectDetail } from './pages/ProjectDetail';
import { NotFound } from './pages/NotFound';
import { Forbidden } from './pages/Forbidden';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route
          path="/organizations/:orgId"
          element={<OrganizationDetail section="overview" />}
        />
        <Route
          path="/organizations/:orgId/projects"
          element={<OrganizationDetail section="projects" />}
        />
        <Route
          path="/organizations/:orgId/members"
          element={<OrganizationDetail section="members" />}
        />
        <Route
          path="/organizations/:orgId/projects/:projectId"
          element={<ProjectDetail />}
        />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="/" element={<Navigate to="/organizations" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
