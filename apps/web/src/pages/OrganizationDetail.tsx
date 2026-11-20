import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { WorkspaceLayout } from '../components/WorkspaceLayout';
import { Modal } from '../components/Modal';
import { WorkspaceSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api, ApiError, getErrorMessage } from '../lib/api';
import type {
  User,
  Organization,
  Member,
  Project,
  Task,
  TaskPriority,
} from '../types';

interface OrganizationDetailProps {
  section?: 'overview' | 'projects' | 'members';
}

export function OrganizationDetail({
  section = 'overview',
}: OrganizationDetailProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline Add Member form state
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberFieldError, setMemberFieldError] = useState('');

  // Create Project modal state
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

  // Projects section Task CRUD state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>(
    'all',
  );

  // Create Task modal state
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

  // Edit Task modal state
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

  // Delete Task modal state
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteTaskSubmitting, setDeleteTaskSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userData, orgData, membersData, projectsData] = await Promise.all([
        api.get<User>('/api/auth/me'),
        api.get<Organization>(`/api/organizations/${orgId}`),
        api.get<Member[]>(`/api/organizations/${orgId}/members`),
        api.get<Project[]>(`/api/organizations/${orgId}/projects`),
      ]);
      setUser(userData);
      setOrganization(orgData);
      setMembers(membersData);
      setProjects(projectsData);
      setSelectedProjectId((prev) => {
        if (prev && projectsData.some((p) => p.id === prev)) {
          return prev;
        }
        return projectsData[0]?.id || '';
      });

      const currentUserMembership = membersData.find(
        (m: Member) => m.user.email === userData.email,
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
  }, [orgId, navigate]);

  const loadProjectTasks = useCallback(
    async (projectIdToLoad: string) => {
      if (!orgId || !projectIdToLoad) {
        setProjectTasks([]);
        return;
      }
      setTasksLoading(true);
      try {
        const tasksData = await api.get<Task[]>(
          `/api/organizations/${orgId}/projects/${projectIdToLoad}/tasks`,
        );
        setProjectTasks(
          tasksData.map((t) => ({
            ...t,
            priority: t.priority || 'medium',
          })),
        );
      } catch (err) {
        showToast('error', "Couldn't load tasks", getErrorMessage(err));
      } finally {
        setTasksLoading(false);
      }
    },
    [orgId, showToast],
  );

  const refreshProjectsOnly = useCallback(async () => {
    if (!orgId) return;
    const projectsData = await api.get<Project[]>(
      `/api/organizations/${orgId}/projects`,
    );
    setProjects(projectsData);
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (section === 'projects' && selectedProjectId) {
      loadProjectTasks(selectedProjectId);
    }
  }, [section, selectedProjectId, loadProjectTasks]);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setMemberFieldError('');

    const emailTrimmed = memberForm.email.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setMemberFieldError('Enter a valid email address.');
      return;
    }

    setMemberSubmitting(true);
    try {
      const newMember = await api.post<Member>(
        `/api/organizations/${orgId}/members`,
        {
          email: emailTrimmed,
          role: memberForm.role,
        },
      );
      setMembers((prev) => [...prev, newMember]);
      setMemberForm({ email: '', role: 'member' });
      showToast(
        'success',
        'Member added',
        `${newMember.user.firstName} ${newMember.user.lastName} joined as ${newMember.role}.`,
      );
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('not found')) {
        setMemberFieldError(
          'User not found. They must register an account first.',
        );
      } else if (message.toLowerCase().includes('already a member')) {
        setMemberFieldError(
          `${emailTrimmed} is already a member of this organization.`,
        );
      } else {
        setMemberFieldError(message);
      }
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleCreateProject = async (e: FormEvent) => {
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
    if (Object.keys(errors).length > 0) {
      return;
    }

    setProjectSubmitting(true);
    try {
      const newProject = await api.post<Project>(
        `/api/organizations/${orgId}/projects`,
        {
          name: trimmedName,
          description: projectForm.description.trim() || undefined,
          budget: parsedBudget,
        },
      );
      setProjects((prev) => [...prev, newProject]);
      setSelectedProjectId((prev) => prev || newProject.id);
      setProjectForm({ name: '', description: '', budget: '' });
      setShowProjectModal(false);
      showToast(
        'success',
        'Project created',
        `${newProject.name} is ready for your team.`,
      );
    } catch (err) {
      setProjectError(getErrorMessage(err));
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
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
        `/api/organizations/${orgId}/projects/${selectedProjectId}/tasks`,
        {
          title: trimmedTitle,
          description: taskForm.description.trim() || undefined,
          estimatedCost: parsedCost,
          priority: taskForm.priority,
        },
      );
      setTaskForm({
        title: '',
        description: '',
        estimatedCost: '',
        priority: 'medium',
      });
      setShowCreateTaskModal(false);
      await Promise.all([
        loadProjectTasks(selectedProjectId),
        refreshProjectsOnly(),
      ]);
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
    if (!taskToEdit || !selectedProjectId) return;
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
        `/api/organizations/${orgId}/projects/${selectedProjectId}/tasks/${taskToEdit.id}`,
        {
          title: trimmedTitle,
          description: editTaskForm.description.trim(),
          estimatedCost: parsedCost,
          priority: editTaskForm.priority,
        },
      );
      setTaskToEdit(null);
      await Promise.all([
        loadProjectTasks(selectedProjectId),
        refreshProjectsOnly(),
      ]);
      showToast('success', 'Task updated', `${trimmedTitle} was saved.`);
    } catch (err) {
      setEditTaskError(getErrorMessage(err));
    } finally {
      setEditTaskSubmitting(false);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete || !selectedProjectId) return;
    setDeleteTaskSubmitting(true);
    try {
      await api.delete<void>(
        `/api/organizations/${orgId}/projects/${selectedProjectId}/tasks/${taskToDelete.id}`,
      );
      const removedTitle = taskToDelete.title;
      setTaskToDelete(null);
      await Promise.all([
        loadProjectTasks(selectedProjectId),
        refreshProjectsOnly(),
      ]);
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

  const getTotalBudget = () =>
    projects.reduce((sum, p) => sum + Number(p.budget || 0), 0);

  const getTotalSpent = () =>
    projects.reduce((sum, p) => sum + Number(p.spent || 0), 0);

  const getTotalRemaining = () => getTotalBudget() - getTotalSpent();

  const getStatusBadge = (project: Project) => {
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

  const totalBudget = getTotalBudget();
  const totalSpent = getTotalSpent();
  const totalRemaining = getTotalRemaining();
  const overallPercent =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0;

  const isAdmin = userRole === 'admin';
  const showOverviewStats = section === 'overview';
  const showProjectsSection = section === 'overview' || section === 'projects';
  const showMembersSection = section === 'overview' || section === 'members';

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  const filteredTasks = projectTasks.filter((task) => {
    if (priorityFilter === 'all') return true;
    return (task.priority || 'medium') === priorityFilter;
  });

  const sectionEyebrow =
    section === 'projects'
      ? 'ORGANIZATION PROJECTS'
      : section === 'members'
        ? 'TEAM DIRECTORY'
        : 'ORGANIZATION OVERVIEW';

  return (
    <WorkspaceLayout
      organizationId={orgId || ''}
      organizationName={organization?.name || 'Workspace'}
      user={user}
      userRole={userRole}
      topBreadcrumb={
        <>
          <Link to="/organizations">Workspace</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to={`/organizations/${orgId}`}>
            {organization?.name || 'Organization'}
          </Link>
          {section !== 'overview' && (
            <>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">
                {section === 'projects' ? 'Projects' : 'Members'}
              </span>
            </>
          )}
        </>
      }
    >
      {loading ? (
        <WorkspaceSkeleton label="Fetching your projects and budgets..." />
      ) : !organization ? (
        <div className="alert alert-error" role="alert">
          <div className="alert-title">Could not load workspace</div>
          <div>{error || 'Please refresh or return to organizations.'}</div>
        </div>
      ) : (
        <>
          <div className="page-header-actions">
            <div className="page-header">
              <div className="page-title">{sectionEyebrow}</div>
              <div className="page-title-row">
                <h1>
                  {section === 'projects'
                    ? 'Projects'
                    : section === 'members'
                      ? 'Members'
                      : organization.name}
                </h1>
                <span
                  className={`badge ${isAdmin ? 'badge-admin' : 'badge-member'}`}
                >
                  {isAdmin ? 'Admin' : 'Member'}
                </span>
              </div>
              <div className="page-description">
                {section === 'projects'
                  ? `All projects, ETB budgets, and tasks inside ${organization.name}.`
                  : section === 'members'
                    ? `Manage people and workspace roles in ${organization.name}.`
                    : organization.description ||
                      'Your projects, people and budgets in one place.'}
              </div>
            </div>

            {section === 'projects' && isAdmin && (
              <div className="page-header-buttons">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(true)}
                  className="btn btn-small"
                >
                  + Create project
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {showOverviewStats && (
            <>
              {/* Desktop 3-column stats */}
              <div className="stats-grid desktop-stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total budget · ETB</div>
                  <div className="stat-value">
                    {totalBudget.toLocaleString()}
                  </div>
                  <div className="stat-description">
                    Across {projects.length}{' '}
                    {projects.length === 1 ? 'project' : 'projects'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total spent · ETB</div>
                  <div className="stat-value">
                    {totalSpent.toLocaleString()}
                  </div>
                  <div className="stat-description">
                    {projects.length > 0 && totalBudget > 0
                      ? `${overallPercent}% of allocated budget`
                      : 'No spending yet'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Remaining · ETB</div>
                  <div className="stat-value primary">
                    {totalRemaining.toLocaleString()}
                  </div>
                  <div className="stat-description">
                    Available across all projects
                  </div>
                </div>
              </div>

              {/* Mobile combined stat cards */}
              <div className="mobile-stats-pair">
                <div className="stat-card">
                  <div className="stat-label">Total budget · ETB</div>
                  <div className="stat-value">
                    {totalBudget.toLocaleString()}
                  </div>
                  <div className="stat-description">
                    Across {projects.length} active{' '}
                    {projects.length === 1 ? 'project' : 'projects'}
                  </div>
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
                      ETB {totalSpent.toLocaleString()}
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
                    <span style={{ color: 'var(--color-primary)' }}>
                      Remaining
                    </span>
                    <strong
                      className="table-num"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      ETB {totalRemaining.toLocaleString()}
                    </strong>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${
                        overallPercent > 100
                          ? 'danger'
                          : overallPercent > 80
                            ? 'warning'
                            : ''
                      }`}
                      style={{ width: `${Math.min(overallPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Projects Section */}
          {showProjectsSection && (
            <section style={{ marginBottom: '32px' }}>
              <div className="section-header-row">
                <div>
                  <h2 className="section-title">
                    {section === 'projects'
                      ? `All projects (${projects.length})`
                      : 'Projects'}
                  </h2>
                  <div className="section-subtitle">
                    {projects.length}{' '}
                    {projects.length === 1 ? 'project' : 'projects'} · All
                    amounts in ETB
                  </div>
                </div>
                {isAdmin && section === 'overview' && (
                  <button
                    type="button"
                    onClick={() => setShowProjectModal(true)}
                    className="btn btn-small"
                  >
                    + Create project
                  </button>
                )}
              </div>

              {projects.length === 0 ? (
                <div
                  className="card"
                  style={{ textAlign: 'center', padding: '48px 24px' }}
                >
                  <div
                    style={{
                      color: 'var(--color-text-secondary)',
                      marginBottom: isAdmin ? '16px' : '0',
                    }}
                  >
                    No projects yet in this organization.
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowProjectModal(true)}
                      className="btn btn-small"
                    >
                      + Create project
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="table-card desktop-table-card">
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>PROJECT NAME</th>
                            <th>BUDGET · ETB</th>
                            <th>SPENT · ETB</th>
                            <th>REMAINING · ETB</th>
                            <th>STATUS</th>
                            <th style={{ textAlign: 'right' }}>TASKS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((project) => {
                            const status = getStatusBadge(project);
                            const percentUsed =
                              project.budget > 0
                                ? (project.spent / project.budget) * 100
                                : 0;
                            return (
                              <tr key={project.id}>
                                <td className="project-name-cell">
                                  <Link
                                    to={`/organizations/${orgId}/projects/${project.id}`}
                                    className="project-name-link"
                                  >
                                    {project.name}
                                  </Link>
                                  <div className="progress-bar">
                                    <div
                                      className={`progress-fill ${
                                        percentUsed > 100
                                          ? 'danger'
                                          : percentUsed > 80
                                            ? 'warning'
                                            : ''
                                      }`}
                                      style={{
                                        width: `${Math.min(percentUsed, 100)}%`,
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="table-num">
                                  {project.budget.toLocaleString()}
                                </td>
                                <td className="table-num">
                                  {project.spent.toLocaleString()}
                                </td>
                                <td
                                  className="table-num"
                                  style={{
                                    color: project.overBudget
                                      ? 'var(--color-error)'
                                      : 'var(--color-primary)',
                                  }}
                                >
                                  {project.remaining.toLocaleString()}
                                </td>
                                <td>
                                  <span className={`badge ${status.class}`}>
                                    {status.text}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <Link
                                    to={`/organizations/${orgId}/projects/${project.id}`}
                                    className="table-action"
                                    style={{
                                      color: 'var(--color-primary)',
                                      textDecoration: 'none',
                                      fontWeight: 500,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Manage tasks →
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Project Cards */}
                  <div className="mobile-cards-list">
                    {projects.map((project) => {
                      const status = getStatusBadge(project);
                      const percentUsed =
                        project.budget > 0
                          ? (project.spent / project.budget) * 100
                          : 0;
                      return (
                        <Link
                          key={project.id}
                          to={`/organizations/${orgId}/projects/${project.id}`}
                          className="mobile-item-card"
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <h4>{project.name}</h4>
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'var(--color-primary)',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Tasks →
                            </span>
                          </div>
                          <div className="mobile-item-meta table-num">
                            Budget ETB {project.budget.toLocaleString()}
                          </div>
                          <div className="mobile-item-meta table-num">
                            Spent {project.spent.toLocaleString()} · Left{' '}
                            {project.remaining.toLocaleString()}
                          </div>
                          <div className="mobile-item-footer">
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div
                                className={`progress-fill ${
                                  percentUsed > 100
                                    ? 'danger'
                                    : percentUsed > 80
                                      ? 'warning'
                                      : ''
                                }`}
                                style={{
                                  width: `${Math.min(percentUsed, 100)}%`,
                                }}
                              />
                            </div>
                            <span className={`badge ${status.class}`}>
                              {status.text}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Direct Task CRUD inside Projects page */}
              {section === 'projects' && selectedProject && (
                <div style={{ marginTop: '36px' }}>
                  <div
                    className="section-header-row"
                    style={{ flexWrap: 'wrap' }}
                  >
                    <div>
                      <h2 className="section-title">Project Tasks</h2>
                      <div className="section-subtitle">
                        Manage tasks and priorities directly inside{' '}
                        <Link
                          to={`/organizations/${orgId}/projects/${selectedProject.id}`}
                          style={{
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          {selectedProject.name}
                        </Link>
                      </div>
                    </div>

                    <div className="section-actions" style={{ flexWrap: 'wrap' }}>
                      <select
                        aria-label="Select project for tasks"
                        className="filter-select"
                        value={selectedProject.id}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="Filter tasks by priority"
                        className="filter-select"
                        value={priorityFilter}
                        onChange={(e) =>
                          setPriorityFilter(
                            e.target.value as 'all' | TaskPriority,
                          )
                        }
                      >
                        <option value="all">All priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>

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

                  {tasksLoading ? (
                    <div className="card">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        {[0, 1, 2].map((row) => (
                          <div
                            key={row}
                            className="skeleton-box"
                            style={{ height: '18px', width: '100%' }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div
                      className="card"
                      style={{ textAlign: 'center', padding: '40px 24px' }}
                    >
                      <div
                        style={{
                          color: 'var(--color-text-secondary)',
                          marginBottom: '16px',
                        }}
                      >
                        {projectTasks.length === 0
                          ? `No tasks yet in ${selectedProject.name}. Add your first task to start tracking costs.`
                          : `No ${priorityFilter} priority tasks found in ${selectedProject.name}.`}
                      </div>
                      {projectTasks.length === 0 && (
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
                                <th>PRIORITY</th>
                                <th style={{ textAlign: 'right' }}>ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTasks.map((task) => (
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
                                  <td>
                                    <span
                                      className={`badge ${getPriorityBadgeClass(
                                        task.priority,
                                      )}`}
                                    >
                                      {formatPriorityLabel(task.priority)}
                                    </span>
                                  </td>
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

                      {/* Mobile Task Cards */}
                      <div className="mobile-cards-list">
                        {filteredTasks.map((task) => (
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
                              <span
                                className={`badge ${getPriorityBadgeClass(
                                  task.priority,
                                )}`}
                              >
                                {formatPriorityLabel(task.priority)}
                              </span>
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
                </div>
              )}
            </section>
          )}

          {/* Members Section */}
          {showMembersSection && (
            <section>
              <div className="section-header-row">
                <div>
                  <h2 className="section-title">Members</h2>
                  <div className="section-subtitle">
                    {members.length}{' '}
                    {members.length === 1 ? 'person' : 'people'} in this
                    organization
                  </div>
                </div>
              </div>

              <div className="members-grid">
                <div>
                  {/* Desktop Members Table */}
                  <div className="table-card desktop-table-card">
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
                              <td style={{ fontWeight: 500 }}>
                                {member.user.firstName} {member.user.lastName}
                              </td>
                              <td style={{ color: 'var(--color-text-secondary)' }}>
                                {member.user.email}
                              </td>
                              <td>
                                <span className="role-label-text">
                                  {member.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Members Card */}
                  <div className="mobile-cards-list">
                    <div className="mobile-item-card">
                      {members.map((member, index) => (
                        <div
                          key={member.id}
                          style={{
                            paddingTop: index === 0 ? 0 : '12px',
                            paddingBottom:
                              index === members.length - 1 ? 0 : '12px',
                            borderBottom:
                              index === members.length - 1
                                ? 'none'
                                : '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>
                            {member.user.firstName} {member.user.lastName} ·{' '}
                            <span className="role-label-text">
                              {member.role}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: 'var(--color-text-tertiary)',
                              marginTop: '2px',
                            }}
                          >
                            {member.user.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side Card */}
                {isAdmin ? (
                  <div className="member-side-card">
                    <div>
                      <h3>Add a team member</h3>
                      <p style={{ marginBottom: '16px' }}>
                        Invite an existing user by email.
                      </p>

                      <form onSubmit={handleAddMember} noValidate>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label htmlFor="memberEmail">Email address</label>
                          <input
                            type="email"
                            id="memberEmail"
                            placeholder="name@company.com"
                            className={memberFieldError ? 'input-error' : ''}
                            value={memberForm.email}
                            onChange={(e) => {
                              setMemberForm({
                                ...memberForm,
                                email: e.target.value,
                              });
                              if (memberFieldError) setMemberFieldError('');
                            }}
                          />
                          {memberFieldError && (
                            <div className="form-error">{memberFieldError}</div>
                          )}
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label htmlFor="memberRole">Role</label>
                          <select
                            id="memberRole"
                            value={memberForm.role}
                            onChange={(e) =>
                              setMemberForm({
                                ...memberForm,
                                role: e.target.value,
                              })
                            }
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="btn"
                          disabled={memberSubmitting}
                        >
                          {memberSubmitting ? 'Adding...' : 'Add member'}
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="member-side-card">
                    <div>
                      <div style={{ marginBottom: '16px' }}>
                        <span className="badge badge-member">Member access</span>
                      </div>
                      <h3>Focus on delivery</h3>
                      <p>
                        You can add, edit and remove tasks. Organization and
                        project settings are managed by an admin.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setProjectError('');
          setProjectFieldErrors({});
        }}
        title="Create project"
        subtitle="Set a clear scope and allocate a budget."
      >
        {projectError && (
          <div className="alert alert-error" role="alert">
            {projectError}
          </div>
        )}
        <form onSubmit={handleCreateProject} noValidate>
          <div className="form-group">
            <label htmlFor="projectName">Project name</label>
            <input
              type="text"
              id="projectName"
              placeholder="e.g. Customer analytics"
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
            <label htmlFor="projectDescription">Description</label>
            <input
              type="text"
              id="projectDescription"
              placeholder="What is this project about?"
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({ ...projectForm, description: e.target.value })
              }
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
              {projectSubmitting ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Task Modal (Projects view) */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => {
          setShowCreateTaskModal(false);
          setTaskError('');
          setTaskFieldErrors({});
        }}
        title="Create task"
        subtitle={`Add work to ${selectedProject?.name || 'project'}.`}
      >
        {taskError && (
          <div className="alert alert-error" role="alert">
            {taskError}
          </div>
        )}
        <form onSubmit={handleCreateTask} noValidate>
          <div className="form-group">
            <label htmlFor="orgTaskTitle">Task title</label>
            <input
              type="text"
              id="orgTaskTitle"
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
            <label htmlFor="orgTaskDescription">Description</label>
            <input
              type="text"
              id="orgTaskDescription"
              placeholder="Describe the work to be done"
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm({ ...taskForm, description: e.target.value })
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="orgTaskCost">Estimated cost · ETB</label>
              <input
                type="number"
                id="orgTaskCost"
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

            <div className="form-group">
              <label htmlFor="orgTaskPriority">Priority</label>
              <select
                id="orgTaskPriority"
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
          </div>

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
              {(['low', 'medium', 'high'] as TaskPriority[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`priority-chip-btn ${getPriorityBadgeClass(
                    level,
                  )} ${taskForm.priority === level ? 'active' : ''}`}
                  onClick={() => setTaskForm({ ...taskForm, priority: level })}
                >
                  {formatPriorityLabel(level)}
                </button>
              ))}
            </div>
          </div>

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

      {/* Edit Task Modal (Projects view) */}
      <Modal
        isOpen={Boolean(taskToEdit)}
        onClose={() => {
          setTaskToEdit(null);
          setEditTaskError('');
          setEditTaskFieldErrors({});
        }}
        title="Edit task"
        subtitle="Update the work, estimate and priority."
      >
        {editTaskError && (
          <div className="alert alert-error" role="alert">
            {editTaskError}
          </div>
        )}
        <form onSubmit={handleUpdateTask} noValidate>
          <div className="form-group">
            <label htmlFor="orgEditTaskTitle">Task title</label>
            <input
              type="text"
              id="orgEditTaskTitle"
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
            <label htmlFor="orgEditTaskDescription">Description</label>
            <input
              type="text"
              id="orgEditTaskDescription"
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
              <label htmlFor="orgEditTaskCost">Estimated cost · ETB</label>
              <input
                type="number"
                id="orgEditTaskCost"
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

            <div className="form-group">
              <label htmlFor="orgEditTaskPriority">Priority</label>
              <select
                id="orgEditTaskPriority"
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
          </div>

          <div
            className="form-hint"
            style={{ marginTop: '-8px', marginBottom: '12px' }}
          >
            Existing tasks keep Medium unless changed.
          </div>

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

      {/* Delete Task Confirmation Modal (Projects view) */}
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
    </WorkspaceLayout>
  );
}