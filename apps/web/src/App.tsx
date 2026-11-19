import { Routes, Route, Navigate } from 'react-router-dom';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Organizations } from './pages/Organizations';
import { OrganizationDetail } from './pages/OrganizationDetail';
import { ProjectDetail } from './pages/ProjectDetail';
import { NotFound } from './pages/NotFound';
import { Forbidden } from './pages/Forbidden';

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/organizations" element={<Organizations />} />
      <Route path="/organizations/:orgId" element={<OrganizationDetail />} />
      <Route path="/organizations/:orgId/projects/:projectId" element={<ProjectDetail />} />
      <Route path="/not-found" element={<NotFound />} />
      <Route path="/forbidden" element={<Forbidden />} />
      <Route path="/" element={<Navigate to="/organizations" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
