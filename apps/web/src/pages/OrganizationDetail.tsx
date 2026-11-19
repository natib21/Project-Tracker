import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
}

interface Member {
  id: string;
  user: { firstName: string; lastName: string; email: string };
  role: string;
}

interface Project {
  id: string;
  name: string;
  budget: string;
  spent: string;
  remaining: string;
  overBudget: boolean;
}

export function OrganizationDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', budget: '' });
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectError, setProjectError] = useState('');

  useEffect(() => {
    loadData();
  }, [orgId]);

  const loadData = async () => {
    try {
      const [userData, orgData, membersData, projectsData] = await Promise.all([
        api.get('/api/auth/me'),
        api.get(`/api/organizations/${orgId}`),
        api.get(`/api/organizations/${orgId}/members`),
        api.get(`/api/organizations/${orgId}/projects`),
      ]);
      setUser(userData);
      setOrganization(orgData);
      setMembers(membersData);
      setProjects(projectsData);

      const currentUserMembership = membersData.find((m: Member) => m.user.email === userData.email);
      setUserRole(currentUserMembership?.role || '');
    } catch (err: any) {
      if (err.status === 404) {
        navigate('/not-found');
      } else if (err.status === 403) {
        navigate('/forbidden');
      } else {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSubmitting(true);

    try {
      const newMember = await api.post(`/api/organizations/${orgId}/members`, memberForm);
      setMembers([...members, newMember]);
      setMemberForm({ email: '', role: 'member' });
      setShowMemberModal(false);
    } catch (err: any) {
      if (err.message.includes('User not found')) {
        setMemberError('User not found. They must create an account first before being added to the organization.');
      } else if (err.message.includes('already a member')) {
        setMemberError('This user is already a member of the organization.');
      } else {
        setMemberError(err.message || 'Failed to add member');
      }
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    setProjectError('');
    setProjectSubmitting(true);

    try {
      const newProject = await api.post(`/api/organizations/${orgId}/projects`, {
        ...projectForm,
        budget: parseFloat(projectForm.budget),
      });
      setProjects([...projects, newProject]);
      setProjectForm({ name: '', description: '', budget: '' });
      setShowProjectModal(false);
    } catch (err: any) {
      setProjectError(err.message || 'Failed to create project');
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getTotalBudget = () => {
    return projects.reduce((sum, p) => sum + parseFloat(p.budget), 0);
  };

  const getTotalSpent = () => {
    return projects.reduce((sum, p) => sum + parseFloat(p.spent), 0);
  };

  const getTotalRemaining = () => {
    return getTotalBudget() - getTotalSpent();
  };

  const getStatusBadge = (project: Project) => {
    if (project.overBudget) return { class: 'badge-over-budget', text: 'Over budget' };
    if (parseFloat(project.remaining) === 0) return { class: 'badge-at-budget', text: 'At budget' };
    const percentUsed = (parseFloat(project.spent) / parseFloat(project.budget)) * 100;
    if (percentUsed > 80) return { class: 'badge-at-risk', text: 'At risk' };
    return { class: 'badge-on-track', text: 'On track' };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user || !organization) {
    return null;
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="app-layout">
      <Sidebar organizationId={orgId!} organizationName={organization.name} />

      <div className="main-content">
        <div className="top-nav">
          <div className="breadcrumb">
            <Link to="/organizations">Workspace</Link> / {organization.name}
          </div>
          <div className="user-menu">
            <div className="user-info">
              <div className="user-name">
                {user.firstName} {user.lastName}
              </div>
              <div className="user-role">{userRole} account</div>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Log out
            </button>
          </div>
        </div>

        <div className="container">
          <div className="page-header-actions">
            <div className="page-header">
              <div className="page-title">ORGANIZATION OVERVIEW</div>
              <h1>{organization.name}</h1>
              {isAdmin && <div className="badge badge-admin">Admin</div>}
              {!isAdmin && <div className="badge badge-member">Member</div>}
              <div className="page-description">
                {organization.description || 'Your projects, people and budgets in one place.'}
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Budget Overview */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total budget · ETB</div>
              <div className="stat-value">{getTotalBudget().toLocaleString()}</div>
              <div className="stat-description">Across {projects.length} projects</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Spent · ETB</div>
              <div className="stat-value">{getTotalSpent().toLocaleString()}</div>
              <div className="stat-description">
                {projects.length > 0
                  ? `${Math.round((getTotalSpent() / getTotalBudget()) * 100)}% of allocated budget`
                  : 'No spending yet'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Remaining · ETB</div>
              <div className="stat-value primary">{getTotalRemaining().toLocaleString()}</div>
              <div className="stat-description">Available across all projects</div>
            </div>
          </div>

          {/* Projects Section */}
          <div className="card" id="projects">
            <div className="card-header">
              <div>
                <div className="card-title">Projects</div>
                <div className="card-subtitle">
                  {projects.length} projects · All amounts in ETB
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => setShowProjectModal(true)} className="btn btn-small btn-icon">
                  + Create project
                </button>
              )}
            </div>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-tertiary)' }}>
                No projects yet.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>PROJECT NAME</th>
                      <th>BUDGET · ETB</th>
                      <th>SPENT · ETB</th>
                      <th>REMAINING · ETB</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const status = getStatusBadge(project);
                      const percentUsed =
                        (parseFloat(project.spent) / parseFloat(project.budget)) * 100;
                      return (
                        <tr key={project.id}>
                          <td>
                            <Link
                              to={`/organizations/${orgId}/projects/${project.id}`}
                              style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: 500 }}
                            >
                              {project.name}
                            </Link>
                            <div className="progress-container" style={{ marginTop: '8px' }}>
                              <div className="progress-bar">
                                <div
                                  className={`progress-fill ${percentUsed > 100 ? 'danger' : percentUsed > 80 ? 'warning' : ''}`}
                                  style={{
                                    width: `${Math.min(percentUsed, 100)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td>{parseFloat(project.budget).toLocaleString()}</td>
                          <td>{parseFloat(project.spent).toLocaleString()}</td>
                          <td style={{ color: project.overBudget ? 'var(--color-error)' : 'var(--color-primary)' }}>
                            {parseFloat(project.remaining).toLocaleString()}
                          </td>
                          <td>
                            <div className={`badge ${status.class}`}>{status.text}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Members Section */}
          <div className="card" id="members">
            <div className="card-header">
              <div>
                <div className="card-title">Members</div>
                <div className="card-subtitle">{members.length} people in this organization</div>
              </div>
              {isAdmin && (
                <button onClick={() => setShowMemberModal(true)} className="btn btn-small btn-icon">
                  + Add member
                </button>
              )}
            </div>

            {!isAdmin && (
              <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                <strong>Member access</strong>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  You can add, edit and remove tasks. Organization and project settings are managed by
                  an admin.
                </div>
              </div>
            )}

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        {member.user.firstName} {member.user.lastName}
                      </td>
                      <td>{member.user.email}</td>
                      <td>
                        <div className={`badge badge-${member.role.toLowerCase()}`}>
                          {member.role}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => {
          setShowMemberModal(false);
          setMemberError('');
        }}
        title="Add a team member"
        subtitle="Invite an existing user by email. They must have an account first."
      >
        {memberError && <div className="alert alert-error">{memberError}</div>}
        <form onSubmit={handleAddMember}>
          <div className="form-group">
            <label htmlFor="memberEmail">Email address</label>
            <input
              type="email"
              id="memberEmail"
              placeholder="name@company.com"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="memberRole">Role</label>
            <select
              id="memberRole"
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowMemberModal(false)}
              disabled={memberSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={memberSubmitting}>
              {memberSubmitting ? 'Adding...' : 'Add member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setProjectError('');
        }}
        title="Create project"
        subtitle="Set a clear budget and execute it a budget."
      >
        {projectError && <div className="alert alert-error">{projectError}</div>}
        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label htmlFor="projectName">Project name</label>
            <input
              type="text"
              id="projectName"
              placeholder="e.g. Customer analytics"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="projectDescription">Description</label>
            <input
              type="text"
              id="projectDescription"
              placeholder="What is this project about?"
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="projectBudget">Budget · ETB</label>
            <input
              type="number"
              id="projectBudget"
              step="0.01"
              min="0"
              placeholder="0"
              value={projectForm.budget}
              onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
              required
            />
            <div className="form-hint">Budget must be greater than 0 ETB.</div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowProjectModal(false)}
              disabled={projectSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={projectSubmitting}>
              {projectSubmitting ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
