import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { WorkspaceLayout } from '../components/WorkspaceLayout';
import { Modal } from '../components/Modal';
import { WorkspaceSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api, ApiError, getErrorMessage } from '../lib/api';
import type {
  User,
  Organization,
  Project,
  Task,
  TaskPriority,
  Member,
} from '../types';

export function ProjectDetail() {
  const { orgId, projectId } = useParams<{
    orgId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Priority is shown only when the backend returns it in the tasks response.
  const [priorityEnabled, setPriorityEnabled] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>(
    'all',
  );
  // The ref lets loadData read the latest filter without being re-created.
  const priorityFilterRef = useRef<'all' | TaskPriority>('all');

  // Create Task Modal
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    estimatedCost: string;
    priority: TaskPriority;
  }>({
    title: '',
    description: '',
    estimatedCost: '',
    priority: 'medium',
  });
  const [taskFieldErrors, setTaskFieldErrors] = useState<{
    title?: string;
    estimatedCost?: string;
  }>({});
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Edit Task Modal
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<{
    title: string;
    description: string;
    estimatedCost: string;
    priority: TaskPriority;
  }>({
    title: '',
    description: '',
    estimatedCost: '',
    priority: 'medium',
  });
  const [editTaskFieldErrors, setEditTaskFieldErrors] = useState<{
    title?: string;
    estimatedCost?: string;
  }>({});
  const [editTaskSubmitting, setEditTaskSubmitting] = useState(false);
  const [editTaskError, setEditTaskError] = useState('');

  // Delete Task Modal
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteTaskSubmitting, setDeleteTaskSubmitting] = useState(false);

  // Edit Project Modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    budget: '',
  });
  const [projectFieldErrors, setProjectFieldErrors] = useState<{
    name?: string;
    budget?: string;
  }>({});
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectError, setProjectError] = useState('');

  // Delete Project Modal
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [deleteProjectSubmitting, setDeleteProjectSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const priorityQuery =
        priorityFilterRef.current === 'all'
          ? ''
          : `?priority=${priorityFilterRef.current}`;

      const [userData, orgData, projectData, tasksData, membersData] =
        await Promise.all([
          api.get<User>('/api/auth/me'),
          api.get<Organization>(`/api/organizations/${orgId}`),
          api.get<Project>(
            `/api/organizations/${orgId}/projects/${projectId}`,
          ),
          api.get<Task[]>(
            `/api/organizations/${orgId}/projects/${projectId}/tasks${priorityQuery}`,
          ),
          api.get<Member[]>(`/api/organizations/${orgId}/members`),
        ]);
      setUser(userData);
      setOrgName(orgData.name);
      setProject(projectData);
      setTasks(tasksData);

      // Show priority only if the API really returns it.
      // An empty list tells us nothing, so keep the previous value.
      setPriorityEnabled((prev) =>
        tasksData.length > 0
          ? tasksData.some((t) => t.priority !== undefined && t.priority !== null)
          : prev,
      );

      const currentUserMembership = membersData.find(
        (m) => m.user.email === userData.email,
      );
      setUserRole(currentUserMembership?.role || 'member');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          navigate('/login');
          return;
        }
        if (err.status === 404) {
          navigate('/not-found');
          return;
        }
        if (err.status === 403) {
          navigate('/forbidden');
          return;
        }
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [orgId, projectId, navigate]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    setTaskError('');
    const errors: { title?: string; estimatedCost?: string } = {};

    const trimmedTitle = taskForm.title.trim();
    const parsedCost = Number(taskForm.estimatedCost);

    if (!trimmedTitle) {
      errors.title = 'Task title is required.';
    }
    if (
      taskForm.estimatedCost === '' ||
      Number.isNaN(parsedCost) ||
      parsedCost < 0
    ) {
      errors.estimatedCost = 'Estimated cost must be 0 or greater.';
    }

    setTaskFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setTaskSubmitting(true);
    try {
      await api.post<Task>(
        `/api/organizations/${orgId}/projects/${projectId}/tasks`,
        {
          title: trimmedTitle,
          description: taskForm.description.trim() || undefined,
          estimatedCost: parsedCost,
          ...(priorityEnabled ? { priority: taskForm.priority } : {}),
        },
      );
      setTaskForm({
        title: '',
        description: '',
        estimatedCost: '',
        priority: 'medium',
      });
      setShowCreateTaskModal(false);
      await loadData();
      showToast('success', 'Task added', `${trimmedTitle} has been added.`);
    } catch (err) {
      setTaskError(getErrorMessage(err));
    } finally {
      setTaskSubmitting(false);
    }
  };

  const openEditTaskModal = (task: Task) => {
    setTaskToEdit(task);
    setEditTaskForm({
      title: task.title,
      description: task.description || '',
      estimatedCost: task.estimatedCost.toString(),
      priority: task.priority || 'medium',
    });
    setEditTaskFieldErrors({});
    setEditTaskError('');
  };

  const handleUpdateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskToEdit) return;
    setEditTaskError('');

    const errors: { title?: string; estimatedCost?: string } = {};
    const trimmedTitle = editTaskForm.title.trim();
    const parsedCost = Number(editTaskForm.estimatedCost);

    if (!trimmedTitle) {
      errors.title = 'Task title is required.';
    }
    if (
      editTaskForm.estimatedCost === '' ||
      Number.isNaN(parsedCost) ||
      parsedCost < 0
    ) {
      errors.estimatedCost = 'Estimated cost must be 0 or greater.';
    }

    setEditTaskFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditTaskSubmitting(true);
    try {
      await api.patch<Task>(
        `/api/organizations/${orgId}/projects/${projectId}/tasks/${taskToEdit.id}`,
        {
          title: trimmedTitle,
          description: editTaskForm.description.trim(),
          estimatedCost: parsedCost,
          ...(priorityEnabled ? { priority: editTaskForm.priority } : {}),
        },
      );
      setTaskToEdit(null);
      await loadData();
      showToast('success', 'Task updated', `${trimmedTitle} was saved.`);
    } catch (err) {
      setEditTaskError(getErrorMessage(err));
    } finally {
      setEditTaskSubmitting(false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleteTaskSubmitting(true);
    try {
      await api.delete<void>(
        `/api/organizations/${orgId}/projects/${projectId}/tasks/${taskToDelete.id}`,
      );
      const removedTitle = taskToDelete.title;
      setTaskToDelete(null);
      await loadData();
      showToast(
        'success',
        'Task deleted',
        `${removedTitle} was removed and budget recalculated.`,
      );
    } catch (err) {
      showToast('error', "Couldn't delete task", getErrorMessage(err));
    } finally {
      setDeleteTaskSubmitting(false);
    }
  };

  const handleOpenEditProject = () => {
    if (!project) return;
    setProjectForm({
      name: project.name,
      description: project.description || '',
      budget: project.budget.toString(),
    });
    setProjectFieldErrors({});
    setProjectError('');
    setShowProjectModal(true);
  };

  const handleUpdateProject = async (e: FormEvent) => {
    e.preventDefault();
    setProjectError('');
    const errors: { name?: string; budget?: string } = {};

    const trimmedName = projectForm.name.trim();
    const parsedBudget = Number(projectForm.budget);

    if (!trimmedName) {
      errors.name = 'Project name is required.';
    }
    if (
      projectForm.budget === '' ||
      Number.isNaN(parsedBudget) ||
      parsedBudget <= 0
    ) {
      errors.budget = 'Budget must be greater than 0 ETB.';
    }

    setProjectFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setProjectSubmitting(true);
    try {
      await api.patch<Project>(
        `/api/organizations/${orgId}/projects/${projectId}`,
        {
          name: trimmedName,
          description: projectForm.description.trim(),
          budget: parsedBudget,
        },
      );
      setShowProjectModal(false);
      await loadData();
      showToast(
        'success',
        'Project updated',
        `${trimmedName} details have been saved.`,
      );
    } catch (err) {
      setProjectError(getErrorMessage(err));
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!project) return;
    setDeleteProjectSubmitting(true);
    try {
      await api.delete<void>(
        `/api/organizations/${orgId}/projects/${projectId}`,
      );
      showToast(
        'success',
        'Project deleted',
        `${project.name} and its tasks were removed.`,
      );
      navigate(`/organizations/${orgId}`);
    } catch (err) {
      showToast('error', "Couldn't delete project", getErrorMessage(err));
      setDeleteProjectSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (!project) return { class: '', text: '' };
    if (project.overBudget) {
      return { class: 'badge-over-budget', text: 'Over budget' };
    }
    if (project.remaining === 0) {
      return { class: 'badge-at-budget', text: 'At budget' };
    }
    const percentUsed =
      project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
    if (percentUsed > 80) {
      return { class: 'badge-at-risk', text: 'At risk' };
    }
    return { class: 'badge-on-track', text: 'On track' };
  };

  const getPriorityBadgeClass = (priority?: TaskPriority) => {
    if (priority === 'high') return 'badge-priority-high';
    if (priority === 'low') return 'badge-priority-low';
    return 'badge-priority-medium';
  };

  const formatPriorityLabel = (priority?: TaskPriority) => {
    const val = priority || 'medium';
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  const handlePriorityFilterChange = (value: 'all' | TaskPriority) => {
    priorityFilterRef.current = value;
    setPriorityFilter(value);
    loadData();
  };

  const isAdmin = userRole === 'admin';
  const status = getStatusBadge();
  const percentUsed =
    project && project.budget > 0
      ? Math.round((project.spent / project.budget) * 100)
      : 0;
  const availablePct = Math.max(0, 100 - percentUsed);

  return (
    <WorkspaceLayout
      organizationId={orgId || ''}
      organizationName={orgName || 'Workspace'}
      user={user}
      userRole={userRole}
      topBreadcrumb={
        <>
          <Link to="/organizations">Workspace</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to={`/organizations/${orgId}`}>{orgName || 'Organization'}</Link>
        </>
      }
    >
      {loading ? (
        <WorkspaceSkeleton label="Fetching project details and tasks..." />
      ) : !project ? (
        <div className="alert alert-error" role="alert">
          <div className="alert-title">Could not load project</div>
          <div>{error || 'Please refresh or return to the workspace.'}</div>
        </div>
      ) : (
        <>
          <div className="breadcrumb page-breadcrumb">
            <Link to="/organizations">Organizations</Link>
            <span className="breadcrumb-sep">/</span>
            <Link to={`/organizations/${orgId}`}>{orgName}</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{project.name}</span>
          </div>

          <div className="page-header-actions">
            <div className="page-header">
              <h1>{project.name}</h1>
              {project.description && (
                <div className="page-description">{project.description}</div>
              )}
              <div style={{ marginTop: '14px' }}>
                <span className={`badge ${status.class}`}>{status.text}</span>
              </div>
            </div>

            {isAdmin && (
              <div className="page-header-buttons desktop-header-actions">
                <button
                  type="button"
                  onClick={handleOpenEditProject}
                  className="btn btn-secondary btn-small"
                >
                  Edit project
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteProjectModal(true)}
                  className="btn btn-secondary btn-small"
                >
                  Delete project
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {/* Desktop 3 Stat Cards + Progress Card */}
          <div className="desktop-stats-grid" style={{ display: 'block' }}>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Project budget · ETB</div>
                <div className="stat-value">
                  {project.budget.toLocaleString()}
                </div>
                <div className="stat-description">Total allocated budget</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Spent · ETB</div>
                <div className="stat-value">
                  {project.spent.toLocaleString()}
                </div>
                <div className="stat-description">
                  Sum of task estimated costs
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Remaining · ETB</div>
                <div
                  className="stat-value primary"
                  style={
                    project.overBudget
                      ? { color: 'var(--color-error)' }
                      : undefined
                  }
                >
                  {project.remaining.toLocaleString()}
                </div>
                <div className="stat-description">
                  {availablePct}% available
                </div>
              </div>
            </div>

            <div className="progress-card">
              <div className="progress-header">
                <div className="progress-label">Budget utilization</div>
                <div className="progress-value">{percentUsed}% used</div>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${
                    percentUsed > 100
                      ? 'danger'
                      : percentUsed > 80
                        ? 'warning'
                        : ''
                  }`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mobile Combined Stat Cards */}
          <div className="mobile-stats-pair">
            <div className="stat-card">
              <div className="stat-label">Project budget · ETB</div>
              <div className="stat-value">
                {project.budget.toLocaleString()}
              </div>
              <div className="stat-description">{project.name}</div>
            </div>
            <div className="stat-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '6px',
                }}
              >
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Spent
                </span>
                <strong className="table-num">
                  ETB {project.spent.toLocaleString()}
                </strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    color: project.overBudget
                      ? 'var(--color-error)'
                      : 'var(--color-primary)',
                  }}
                >
                  Remaining
                </span>
                <strong
                  className="table-num"
                  style={{
                    color: project.overBudget
                      ? 'var(--color-error)'
                      : 'var(--color-primary)',
                  }}
                >
                  ETB {project.remaining.toLocaleString()}
                </strong>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${
                    percentUsed > 100
                      ? 'danger'
                      : percentUsed > 80
                        ? 'warning'
                        : ''
                  }`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>
              <div className="stat-description">{percentUsed}% of budget used</div>
            </div>
          </div>

          {project.overBudget && (
            <div className="alert alert-error" style={{ marginBottom: '24px' }}>
              <div className="alert-title">This project is over budget</div>
              <div>
                The sum of task costs exceeds the allocated budget. Adjust task
                estimates or increase the project budget.
              </div>
            </div>
          )}

          {/* Tasks Section */}
          <section>
            <div className="section-header-row" style={{ flexWrap: 'wrap' }}>
              <div>
                <h2 className="section-title">Tasks</h2>
                <div className="section-subtitle">
                  {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} · All
                  estimated costs in ETB
                </div>
              </div>

              <div className="section-actions">
                {priorityEnabled && (
                  <select
                    aria-label="Filter tasks by priority"
                    className="filter-select"
                    value={priorityFilter}
                    onChange={(e) =>
                      handlePriorityFilterChange(
                        e.target.value as 'all' | TaskPriority,
                      )
                    }
                  >
                    <option value="all">All priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setTaskForm({
                      title: '',
                      description: '',
                      estimatedCost: '',
                      priority: 'medium',
                    });
                    setTaskFieldErrors({});
                    setTaskError('');
                    setShowCreateTaskModal(true);
                  }}
                  className="btn btn-small"
                >
                  + Add task
                </button>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div
                className="card"
                style={{ textAlign: 'center', padding: '48px 24px' }}
              >
                <div
                  style={{
                    color: 'var(--color-text-secondary)',
                    marginBottom: '16px',
                  }}
                >
                  {priorityFilter === 'all'
                    ? 'No tasks yet. Add your first task to get started.'
                    : `No ${priorityFilter} priority tasks found.`}
                </div>
                {priorityFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="btn btn-small"
                  >
                    + Add task
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Tasks Table */}
                <div className="table-card desktop-table-card">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>TASK / DESCRIPTION</th>
                          <th>ESTIMATED COST · ETB</th>
                          {priorityEnabled && <th>PRIORITY</th>}
                          <th style={{ textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => (
                          <tr key={task.id}>
                            <td>
                              <div style={{ fontWeight: 500 }}>
                                {task.title}
                              </div>
                              {task.description && (
                                <div
                                  style={{
                                    fontSize: '13px',
                                    color: 'var(--color-text-tertiary)',
                                    marginTop: '4px',
                                  }}
                                >
                                  {task.description}
                                </div>
                              )}
                            </td>
                            <td className="table-num">
                              {task.estimatedCost.toLocaleString()}
                            </td>
                            {priorityEnabled && (
                              <td>
                                <span
                                  className={`badge ${getPriorityBadgeClass(
                                    task.priority,
                                  )}`}
                                >
                                  {formatPriorityLabel(task.priority)}
                                </span>
                              </td>
                            )}
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  onClick={() => openEditTaskModal(task)}
                                  className="table-action"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTaskToDelete(task)}
                                  className="table-action danger"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Tasks Cards */}
                <div className="mobile-cards-list">
                  {tasks.map((task) => (
                    <div key={task.id} className="mobile-item-card">
                      <h4>{task.title}</h4>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '8px',
                          marginBottom: '8px',
                        }}
                      >
                        {priorityEnabled ? (
                          <span
                            className={`badge ${getPriorityBadgeClass(
                              task.priority,
                            )}`}
                          >
                            {formatPriorityLabel(task.priority)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span
                          className="table-num"
                          style={{ fontWeight: 600, fontSize: '13px' }}
                        >
                          ETB {task.estimatedCost.toLocaleString()}
                        </span>
                      </div>
                      {task.description && (
                        <div className="mobile-item-meta">
                          {task.description}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginTop: '10px',
                          fontSize: '13px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => openEditTaskModal(task)}
                          className="table-action"
                        >
                          Edit
                        </button>
                        <span
                          aria-hidden="true"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          className="table-action danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Mobile bottom admin actions */}
            {isAdmin && (
              <div className="mobile-footer-actions">
                <button
                  type="button"
                  onClick={handleOpenEditProject}
                  className="btn btn-secondary"
                >
                  Edit project
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteProjectModal(true)}
                  className="btn btn-secondary"
                >
                  Delete project
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => {
          setShowCreateTaskModal(false);
          setTaskError('');
          setTaskFieldErrors({});
        }}
        title="Create task"
        subtitle={`Add work to ${project?.name || 'project'}.`}
      >
        {taskError && (
          <div className="alert alert-error" role="alert">
            {taskError}
          </div>
        )}
        <form onSubmit={handleCreateTask} noValidate>
          <div className="form-group">
            <label htmlFor="taskTitle">Task title</label>
            <input
              type="text"
              id="taskTitle"
              placeholder="e.g. API integration"
              className={taskFieldErrors.title ? 'input-error' : ''}
              value={taskForm.title}
              onChange={(e) => {
                setTaskForm({ ...taskForm, title: e.target.value });
                if (taskFieldErrors.title) {
                  setTaskFieldErrors({ ...taskFieldErrors, title: undefined });
                }
              }}
            />
            {taskFieldErrors.title && (
              <div className="form-error">{taskFieldErrors.title}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="taskDescription">Description</label>
            <input
              type="text"
              id="taskDescription"
              placeholder="Describe the work to be done"
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm({ ...taskForm, description: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="taskCost">Estimated cost · ETB</label>
              <input
                type="number"
                id="taskCost"
                step="0.01"
                min="0"
                placeholder="0"
                className={taskFieldErrors.estimatedCost ? 'input-error' : ''}
                value={taskForm.estimatedCost}
                onChange={(e) => {
                  setTaskForm({ ...taskForm, estimatedCost: e.target.value });
                  if (taskFieldErrors.estimatedCost) {
                    setTaskFieldErrors({
                      ...taskFieldErrors,
                      estimatedCost: undefined,
                    });
                  }
                }}
              />
              {taskFieldErrors.estimatedCost && (
                <div className="form-error">
                  {taskFieldErrors.estimatedCost}
                </div>
              )}
            </div>

            {priorityEnabled && (
              <div className="form-group">
                <label htmlFor="taskPriority">Priority</label>
                <select
                  id="taskPriority"
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      priority: e.target.value as TaskPriority,
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}
          </div>

          {priorityEnabled && (
            <>
              <div className="form-hint" style={{ marginTop: '-8px' }}>
                New tasks default to Medium.
              </div>

              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-tertiary)',
                    marginBottom: '6px',
                  }}
                >
                  Available priorities
                </div>
                <div className="priority-chip-row">
                  {(['low', 'medium', 'high'] as TaskPriority[]).map(
                    (level) => (
                      <button
                        key={level}
                        type="button"
                        className={`priority-chip-btn ${getPriorityBadgeClass(
                          level,
                        )} ${taskForm.priority === level ? 'active' : ''}`}
                        onClick={() =>
                          setTaskForm({ ...taskForm, priority: level })
                        }
                      >
                        {formatPriorityLabel(level)}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateTaskModal(false)}
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

      {/* Edit Task Modal */}
      <Modal
        isOpen={Boolean(taskToEdit)}
        onClose={() => {
          setTaskToEdit(null);
          setEditTaskError('');
          setEditTaskFieldErrors({});
        }}
        title="Edit task"
        subtitle={
          priorityEnabled
            ? 'Update the work, estimate and priority.'
            : 'Update the work and estimate.'
        }
      >
        {editTaskError && (
          <div className="alert alert-error" role="alert">
            {editTaskError}
          </div>
        )}
        <form onSubmit={handleUpdateTask} noValidate>
          <div className="form-group">
            <label htmlFor="editTaskTitle">Task title</label>
            <input
              type="text"
              id="editTaskTitle"
              className={editTaskFieldErrors.title ? 'input-error' : ''}
              value={editTaskForm.title}
              onChange={(e) => {
                setEditTaskForm({ ...editTaskForm, title: e.target.value });
                if (editTaskFieldErrors.title) {
                  setEditTaskFieldErrors({
                    ...editTaskFieldErrors,
                    title: undefined,
                  });
                }
              }}
            />
            {editTaskFieldErrors.title && (
              <div className="form-error">{editTaskFieldErrors.title}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="editTaskDescription">Description</label>
            <input
              type="text"
              id="editTaskDescription"
              value={editTaskForm.description}
              onChange={(e) =>
                setEditTaskForm({
                  ...editTaskForm,
                  description: e.target.value,
                })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="editTaskCost">Estimated cost · ETB</label>
              <input
                type="number"
                id="editTaskCost"
                step="0.01"
                min="0"
                className={
                  editTaskFieldErrors.estimatedCost ? 'input-error' : ''
                }
                value={editTaskForm.estimatedCost}
                onChange={(e) => {
                  setEditTaskForm({
                    ...editTaskForm,
                    estimatedCost: e.target.value,
                  });
                  if (editTaskFieldErrors.estimatedCost) {
                    setEditTaskFieldErrors({
                      ...editTaskFieldErrors,
                      estimatedCost: undefined,
                    });
                  }
                }}
              />
              {editTaskFieldErrors.estimatedCost && (
                <div className="form-error">
                  {editTaskFieldErrors.estimatedCost}
                </div>
              )}
            </div>

            {priorityEnabled && (
              <div className="form-group">
                <label htmlFor="editTaskPriority">Priority</label>
                <select
                  id="editTaskPriority"
                  value={editTaskForm.priority}
                  onChange={(e) =>
                    setEditTaskForm({
                      ...editTaskForm,
                      priority: e.target.value as TaskPriority,
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}
          </div>

          {priorityEnabled && (
            <div
              className="form-hint"
              style={{ marginTop: '-8px', marginBottom: '12px' }}
            >
              Existing tasks keep Medium unless changed.
            </div>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTaskToEdit(null)}
              disabled={editTaskSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={editTaskSubmitting}
            >
              {editTaskSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Task Confirmation Modal */}
      <Modal
        isOpen={Boolean(taskToDelete)}
        onClose={() => !deleteTaskSubmitting && setTaskToDelete(null)}
        title="Delete task?"
        subtitle="This action can't be undone."
      >
        <div className="alert alert-error">
          <div className="alert-title">
            &ldquo;{taskToDelete?.title}&rdquo; will be removed.
          </div>
          <div>The remaining project budget will be recalculated.</div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setTaskToDelete(null)}
            disabled={deleteTaskSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteTask}
            className="btn btn-danger"
            disabled={deleteTaskSubmitting}
          >
            {deleteTaskSubmitting ? 'Deleting...' : 'Delete task'}
          </button>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setProjectError('');
          setProjectFieldErrors({});
        }}
        title="Edit project"
        subtitle="Update the project details and budget."
      >
        {projectError && (
          <div className="alert alert-error" role="alert">
            {projectError}
          </div>
        )}
        <form onSubmit={handleUpdateProject} noValidate>
          <div className="form-group">
            <label htmlFor="editProjectName">Project name</label>
            <input
              type="text"
              id="editProjectName"
              className={projectFieldErrors.name ? 'input-error' : ''}
              value={projectForm.name}
              onChange={(e) => {
                setProjectForm({ ...projectForm, name: e.target.value });
                if (projectFieldErrors.name) {
                  setProjectFieldErrors({
                    ...projectFieldErrors,
                    name: undefined,
                  });
                }
              }}
            />
            {projectFieldErrors.name && (
              <div className="form-error">{projectFieldErrors.name}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="editProjectDescription">Description</label>
            <input
              type="text"
              id="editProjectDescription"
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({ ...projectForm, description: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="editProjectBudget">Budget · ETB</label>
            <input
              type="number"
              id="editProjectBudget"
              step="0.01"
              min="0"
              className={projectFieldErrors.budget ? 'input-error' : ''}
              value={projectForm.budget}
              onChange={(e) => {
                setProjectForm({ ...projectForm, budget: e.target.value });
                if (projectFieldErrors.budget) {
                  setProjectFieldErrors({
                    ...projectFieldErrors,
                    budget: undefined,
                  });
                }
              }}
            />
            {projectFieldErrors.budget ? (
              <div className="form-error">{projectFieldErrors.budget}</div>
            ) : (
              <div className="form-hint">Budget must be greater than 0 ETB.</div>
            )}
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
            <button
              type="submit"
              className="btn"
              disabled={projectSubmitting}
            >
              {projectSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={showDeleteProjectModal}
        onClose={() =>
          !deleteProjectSubmitting && setShowDeleteProjectModal(false)
        }
        title="Delete project?"
        subtitle="This project and all of its tasks will be permanently deleted."
      >
        <div className="alert alert-error">
          <div className="alert-title">
            &ldquo;{project?.name}&rdquo; and all of its tasks will be removed.
          </div>
          <div>Budget and task history cannot be recovered.</div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDeleteProjectModal(false)}
            disabled={deleteProjectSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteProject}
            className="btn btn-danger"
            disabled={deleteProjectSubmitting}
          >
            {deleteProjectSubmitting ? 'Deleting...' : 'Delete project'}
          </button>
        </div>
      </Modal>
    </WorkspaceLayout>
  );
}
