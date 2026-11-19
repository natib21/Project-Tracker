import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import { api, ApiError, getErrorMessage } from '../lib/api';
import type { User, Organization, Project, Task, Member } from '../types';

export function ProjectDetail() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', estimatedCost: '' });
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', estimatedCost: '' });

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', budget: '' });
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectError, setProjectError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userData, orgData, projectData, tasksData, membersData] = await Promise.all([
        api.get<User>('/api/auth/me'),
        api.get<Organization>(`/api/organizations/${orgId}`),
        api.get<Project>(`/api/organizations/${orgId}/projects/${projectId}`),
        api.get<Task[]>(`/api/organizations/${orgId}/projects/${projectId}/tasks`),
        api.get<Member[]>(`/api/organizations/${orgId}/members`),
      ]);
      setUser(userData);
      setOrgName(orgData.name);
      setProject(projectData);
      setTasks(tasksData);

      const currentUserMembership = membersData.find(
        (m) => m.user.email === userData.email,
      );
      setUserRole(currentUserMembership?.role || '');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          navigate('/not-found');
        } else if (err.status === 403) {
          navigate('/forbidden');
        } else {
          setError(getErrorMessage(err));
        }
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    setTaskError('');
    setTaskSubmitting(true);

    try {
      const newTask = await api.post<Task>(`/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        ...taskForm,
        estimatedCost: parseFloat(taskForm.estimatedCost),
      });
      setTasks([...tasks, newTask]);
      setTaskForm({ title: '', description: '', estimatedCost: '' });
      setShowTaskModal(false);
      await loadData(); // Refresh budget
    } catch (err) {
      setTaskError(getErrorMessage(err));
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    try {
      const updated = await api.patch<Task>(
        `/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`,
        {
          ...editForm,
          estimatedCost: parseFloat(editForm.estimatedCost),
        },
      );
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
      setEditingTask(null);
      await loadData(); // Refresh budget
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await api.delete<void>(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t.id !== taskId));
      await loadData(); // Refresh budget
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleEditProject = () => {
    if (project) {
      setProjectForm({
        name: project.name,
        description: project.description || '',
        budget: project.budget.toString(),
      });
      setShowProjectModal(true);
    }
  };

  const handleUpdateProject = async (e: FormEvent) => {
    e.preventDefault();
    setProjectError('');
    setProjectSubmitting(true);

    try {
      const updated = await api.patch<Project>(`/api/organizations/${orgId}/projects/${projectId}`, {
        ...projectForm,
        budget: parseFloat(projectForm.budget),
      });
      setProject(updated);
      setShowProjectModal(false);
    } catch (err) {
      setProjectError(getErrorMessage(err));
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    try {
      await api.delete<void>(`/api/organizations/${orgId}/projects/${projectId}`);
      navigate(`/organizations/${orgId}`);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleLogout = async () => {
    try {
      await api.post<void>('/api/auth/logout');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getStatusBadge = () => {
    if (!project) return { class: '', text: '' };
    if (project.overBudget) return { class: 'badge-over-budget', text: 'Over budget' };
    if (project.remaining === 0) return { class: 'badge-at-budget', text: 'At budget' };
    const percentUsed = (project.spent / project.budget) * 100;
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

  if (!user || !project) {
    return null;
  }

  const isAdmin = userRole === 'admin';
  const status = getStatusBadge();
  const percentUsed = (project.spent / project.budget) * 100;

  return (
    <div className="app-layout">
      <Sidebar organizationId={orgId!} organizationName={orgName} />

      <div className="main-content">
        <div className="top-nav">
          <div className="breadcrumb">
            <Link to="/organizations">Organizations</Link> /
            <Link to={`/organizations/${orgId}`}> {orgName}</Link> /
            <Link to={`/organizations/${orgId}/projects/${projectId}`}> {project.name}</Link>
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
              <h1>{project.name}</h1>
              {project.description && (
                <div className="page-description">{project.description}</div>
              )}
              <div style={{ marginTop: '12px' }}>
                <div className={`badge ${status.class}`}>{status.text}</div>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleEditProject} className="btn btn-secondary btn-small">
                  Edit project
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-danger btn-small"
                >
                  Delete project
                </button>
              </div>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Budget Summary */}
          <div className="card">
            <div className="card-title">Budget Summary</div>
            <div className="stats-grid" style={{ marginTop: '16px' }}>
              <div className="stat-card">
                <div className="stat-label">Project budget · ETB</div>
                <div className="stat-value">{project.budget.toLocaleString()}</div>
                <div className="stat-description">Total allocated budget</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Spent · ETB</div>
                <div className="stat-value">{project.spent.toLocaleString()}</div>
                <div className="stat-description">Sum of task estimated costs</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Remaining · ETB</div>
                <div className="stat-value primary">
                  {project.remaining.toLocaleString()}
                </div>
                <div className="stat-description">
                  {Math.max(0, Math.round(100 - percentUsed))}% available
                </div>
              </div>
            </div>

            <div className="progress-container" style={{ marginTop: '24px' }}>
              <div className="progress-header">
                <div className="progress-label">Budget utilization</div>
                <div className="progress-value">{Math.round(percentUsed)}% used</div>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${percentUsed > 100 ? 'danger' : percentUsed > 80 ? 'warning' : ''}`}
                  style={{
                    width: `${Math.min(percentUsed, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {project.overBudget && (
              <div className="alert alert-error" style={{ marginTop: '16px' }}>
                <strong>⚠️ This project is over budget</strong>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  The sum of task costs exceeds the allocated budget. The remaining project budget will
                  be re-calculated.
                </div>
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tasks</div>
                <div className="card-subtitle">
                  {tasks.length} tasks · All estimated costs in ETB
                </div>
              </div>
              <button onClick={() => setShowTaskModal(true)} className="btn btn-small btn-icon">
                + Add task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-tertiary)' }}>
                No tasks yet. Add your first task to get started.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>TASK / DESCRIPTION</th>
                      <th>ESTIMATED COST · ETB</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) =>
                      editingTask === task.id ? (
                        <tr key={task.id}>
                          <td colSpan={3}>
                            <div style={{ padding: '16px', background: 'var(--color-bg-primary)', borderRadius: '4px' }}>
                              <div className="form-group">
                                <label>Title</label>
                                <input
                                  type="text"
                                  value={editForm.title}
                                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Description</label>
                                <input
                                  type="text"
                                  value={editForm.description}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, description: e.target.value })
                                  }
                                />
                              </div>
                              <div className="form-group">
                                <label>Estimated Cost · ETB</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editForm.estimatedCost}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, estimatedCost: e.target.value })
                                  }
                                  required
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => setEditingTask(null)}
                                  className="btn btn-secondary btn-small"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleUpdateTask(task.id)}
                                  className="btn btn-small"
                                >
                                  Save changes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={task.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{task.title}</div>
                            {task.description && (
                              <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                                {task.description}
                              </div>
                            )}
                          </td>
                          <td>{task.estimatedCost.toLocaleString()}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                onClick={() => {
                                  setEditingTask(task.id);
                                  setEditForm({
                                    title: task.title,
                                    description: task.description || '',
                                    estimatedCost: task.estimatedCost.toString(),
                                  });
                                }}
                                className="table-action"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="table-action danger"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setTaskError('');
        }}
        title="Create task"
        subtitle={`Add work to ${project.name}.`}
      >
        {taskError && <div className="alert alert-error">{taskError}</div>}
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label htmlFor="taskTitle">Task title</label>
            <input
              type="text"
              id="taskTitle"
              placeholder="e.g. API integration"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskDescription">Description</label>
            <input
              type="text"
              id="taskDescription"
              placeholder="Describe the work to be done"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="taskCost">Estimated cost · ETB</label>
            <input
              type="number"
              id="taskCost"
              step="0.01"
              min="0"
              placeholder="0"
              value={taskForm.estimatedCost}
              onChange={(e) => setTaskForm({ ...taskForm, estimatedCost: e.target.value })}
              required
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowTaskModal(false)}
              disabled={taskSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={taskSubmitting}>
              {taskSubmitting ? 'Adding...' : 'Add task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setProjectError('');
        }}
        title="Edit project"
        subtitle="Update the project's name and budget."
      >
        {projectError && <div className="alert alert-error">{projectError}</div>}
        <form onSubmit={handleUpdateProject}>
          <div className="form-group">
            <label htmlFor="projectName">Project name</label>
            <input
              type="text"
              id="projectName"
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
              value={projectForm.budget}
              onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
              required
            />
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
              {projectSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete project?"
        subtitle="This project and all of its tasks will be permanently deleted."
      >
        <div className="alert alert-error">
          <strong>"{project.name}" and all its tasks will be removed.</strong>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            Budget and task history cannot be recovered.
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </button>
          <button onClick={handleDeleteProject} className="btn btn-danger">
            Delete project
          </button>
        </div>
      </Modal>
    </div>
  );
}
