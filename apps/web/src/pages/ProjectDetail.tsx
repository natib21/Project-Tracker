import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { api } from '../lib/api';
import { formatETB } from '../lib/format';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  budget: string;
  spent: string;
  remaining: string;
  overBudget: boolean;
  organizationId: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  estimatedCost: string;
}

interface Member {
  role: string;
}

export function ProjectDetail() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [taskForm, setTaskForm] = useState({ title: '', description: '', estimatedCost: '' });
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', estimatedCost: '' });

  const [editingProject, setEditingProject] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({
    name: '',
    description: '',
    budget: '',
  });

  useEffect(() => {
    loadData();
  }, [orgId, projectId]);

  const loadData = async () => {
    try {
      const [userData, projectData, tasksData, membersData] = await Promise.all([
        api.get('/api/auth/me'),
        api.get(`/api/organizations/${orgId}/projects/${projectId}`),
        api.get(`/api/organizations/${orgId}/projects/${projectId}/tasks`),
        api.get(`/api/organizations/${orgId}/members`),
      ]);
      setUser(userData);
      setProject(projectData);
      setTasks(tasksData);

      const currentUserMembership = membersData.find(
        (m: Member & { user: { email: string } }) => m.user.email === userData.email,
      );
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

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    setTaskError('');
    setTaskSubmitting(true);

    try {
      const newTask = await api.post(`/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        ...taskForm,
        estimatedCost: parseFloat(taskForm.estimatedCost),
      });
      setTasks([...tasks, newTask]);
      setTaskForm({ title: '', description: '', estimatedCost: '' });
      await loadData(); // Refresh to update budget summary
    } catch (err: any) {
      setTaskError(err.message || 'Failed to create task');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task.id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      estimatedCost: task.estimatedCost,
    });
  };

  const handleUpdateTask = async (taskId: string) => {
    try {
      const updated = await api.patch(
        `/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`,
        {
          ...editForm,
          estimatedCost: parseFloat(editForm.estimatedCost),
        },
      );
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
      setEditingTask(null);
      await loadData(); // Refresh to update budget summary
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await api.delete(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t.id !== taskId));
      await loadData(); // Refresh to update budget summary
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleEditProject = () => {
    if (project) {
      setEditingProject(true);
      setProjectEditForm({
        name: project.name,
        description: project.description || '',
        budget: project.budget,
      });
    }
  };

  const handleUpdateProject = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.patch(`/api/organizations/${orgId}/projects/${projectId}`, {
        ...projectEditForm,
        budget: parseFloat(projectEditForm.budget),
      });
      setProject(updated);
      setEditingProject(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? All tasks will be deleted.')) {
      return;
    }

    try {
      await api.delete(`/api/organizations/${orgId}/projects/${projectId}`);
      navigate(`/organizations/${orgId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!user || !project) {
    return null;
  }

  const isAdmin = userRole === 'admin';

  return (
    <>
      <Navigation user={user} />
      <div className="container">
        <div className="breadcrumb">
          <a href="/organizations">Organizations</a> →{' '}
          <a href={`/organizations/${orgId}`}>Organization</a> → {project.name}
        </div>

        <div className="project-header">
          {editingProject ? (
            <form onSubmit={handleUpdateProject} className="edit-form">
              <div className="form-group">
                <label htmlFor="projectName">Name</label>
                <input
                  type="text"
                  id="projectName"
                  value={projectEditForm.name}
                  onChange={(e) =>
                    setProjectEditForm({ ...projectEditForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="projectDescription">Description</label>
                <input
                  type="text"
                  id="projectDescription"
                  value={projectEditForm.description}
                  onChange={(e) =>
                    setProjectEditForm({ ...projectEditForm, description: e.target.value })
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
                  value={projectEditForm.budget}
                  onChange={(e) =>
                    setProjectEditForm({ ...projectEditForm, budget: e.target.value })
                  }
                  required
                />
              </div>
              <div className="button-group">
                <button type="submit" className="btn">
                  Save
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingProject(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div>
                <h2>{project.name}</h2>
                {project.description && <p className="description">{project.description}</p>}
              </div>
              {isAdmin && (
                <div className="button-group">
                  <button onClick={handleEditProject} className="btn">
                    Edit Project
                  </button>
                  <button onClick={handleDeleteProject} className="btn-danger">
                    Delete Project
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="card" style={{ marginTop: '24px' }}>
          <h3>Budget Summary</h3>
          <div className="budget-grid">
            <div className="budget-item-large">
              <span className="label">Budget:</span>
              <span className="value">{formatETB(parseFloat(project.budget))}</span>
            </div>
            <div className="budget-item-large">
              <span className="label">Spent:</span>
              <span className="value">{formatETB(parseFloat(project.spent))}</span>
            </div>
            <div className="budget-item-large">
              <span className="label">Remaining:</span>
              <span className="value">{formatETB(parseFloat(project.remaining))}</span>
            </div>
          </div>
          {project.overBudget && (
            <div className="over-budget-banner">⚠️ This project is over budget</div>
          )}
        </div>

        <div className="card" style={{ marginTop: '24px' }}>
          <h3>Tasks</h3>
          {tasks.length === 0 ? (
            <p>No tasks yet.</p>
          ) : (
            <div className="task-list">
              {tasks.map((task) =>
                editingTask === task.id ? (
                  <div key={task.id} className="task-item editing">
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
                      <label>Estimated Cost (ETB)</label>
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
                    <div className="button-group">
                      <button onClick={() => handleUpdateTask(task.id)} className="btn-small">
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTask(null)}
                        className="btn-small btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={task.id} className="task-item">
                    <div className="task-content">
                      <h4>{task.title}</h4>
                      {task.description && <p>{task.description}</p>}
                      <span className="cost">{formatETB(parseFloat(task.estimatedCost))}</span>
                    </div>
                    <div className="button-group">
                      <button onClick={() => handleEditTask(task)} className="btn-small">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="btn-small btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          <h4 style={{ marginTop: '24px' }}>Add Task</h4>
          {taskError && <div className="error">{taskError}</div>}
          <form onSubmit={handleCreateTask}>
            <div className="form-group">
              <label htmlFor="taskTitle">Title</label>
              <input
                type="text"
                id="taskTitle"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="taskDescription">Description (optional)</label>
              <input
                type="text"
                id="taskDescription"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="taskCost">Estimated Cost (ETB)</label>
              <input
                type="number"
                id="taskCost"
                step="0.01"
                min="0"
                value={taskForm.estimatedCost}
                onChange={(e) => setTaskForm({ ...taskForm, estimatedCost: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn" disabled={taskSubmitting}>
              {taskSubmitting ? 'Adding...' : 'Add Task'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
