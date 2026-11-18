import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { api } from '../lib/api';
import { formatETB } from '../lib/format';

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

  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState('');

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
    } catch (err: any) {
      setMemberError(err.message || 'Failed to add member');
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
    } catch (err: any) {
      setProjectError(err.message || 'Failed to create project');
    } finally {
      setProjectSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!user || !organization) {
    return null;
  }

  const isAdmin = userRole === 'admin';

  return (
    <>
      <Navigation user={user} />
      <div className="container">
        <h2>{organization.name}</h2>
        {organization.description && <p className="description">{organization.description}</p>}

        {error && <div className="error">{error}</div>}

        <div className="card" style={{ marginTop: '24px' }}>
          <h3>Members</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
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
                    <span className="role-badge">{member.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isAdmin && (
            <>
              <h4 style={{ marginTop: '24px' }}>Add Member</h4>
              {memberError && <div className="error">{memberError}</div>}
              <form onSubmit={handleAddMember}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="memberEmail">Email</label>
                    <input
                      type="email"
                      id="memberEmail"
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
                </div>
                <button type="submit" className="btn" disabled={memberSubmitting}>
                  {memberSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="card" style={{ marginTop: '24px' }}>
          <h3>Projects</h3>
          {projects.length === 0 ? (
            <p>No projects yet.</p>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/organizations/${orgId}/projects/${project.id}`}
                  className="project-card"
                >
                  <h4>{project.name}</h4>
                  <div className="budget-summary">
                    <div className="budget-item">
                      <span className="label">Budget:</span>
                      <span>{formatETB(parseFloat(project.budget))}</span>
                    </div>
                    <div className="budget-item">
                      <span className="label">Spent:</span>
                      <span>{formatETB(parseFloat(project.spent))}</span>
                    </div>
                    <div className="budget-item">
                      <span className="label">Remaining:</span>
                      <span>{formatETB(parseFloat(project.remaining))}</span>
                    </div>
                    {project.overBudget && (
                      <div className="over-budget-badge">Over Budget</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {isAdmin && (
            <>
              <h4 style={{ marginTop: '24px' }}>Create Project</h4>
              {projectError && <div className="error">{projectError}</div>}
              <form onSubmit={handleCreateProject}>
                <div className="form-group">
                  <label htmlFor="projectName">Name</label>
                  <input
                    type="text"
                    id="projectName"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="projectDescription">Description (optional)</label>
                  <input
                    type="text"
                    id="projectDescription"
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, description: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="projectBudget">Budget (ETB)</label>
                  <input
                    type="number"
                    id="projectBudget"
                    step="0.01"
                    min="0"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn" disabled={projectSubmitting}>
                  {projectSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
