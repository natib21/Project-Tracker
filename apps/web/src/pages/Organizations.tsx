import { useState, useEffect, FormEvent, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { Modal } from '../components/Modal';
import { OrganizationsSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api, ApiError, getErrorMessage } from '../lib/api';
import type { User, OrganizationListItem, Organization } from '../types';

export function Organizations() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [userData, orgsData] = await Promise.all([
        api.get<User>('/api/auth/me'),
        api.get<OrganizationListItem[]>('/api/organizations'),
      ]);
      setUser(userData);
      setOrganizations(orgsData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setNameError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setNameError('Organization name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.post<Organization>('/api/organizations', {
        name: trimmedName,
        description: formData.description.trim() || undefined,
      });
      setFormData({ name: '', description: '' });
      setShowCreateModal(false);
      showToast(
        'success',
        'Workspace created',
        `${created.name || trimmedName} is ready for your team.`,
      );
      await loadData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return parts
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="standalone-layout">
      <TopBar user={user} activeLink="organizations" />

      <main className="standalone-main">
        <div className="container">
          <div className="page-header-actions">
            <div className="page-header">
              <div className="page-title">YOUR WORKSPACES</div>
              <h1>Organizations</h1>
              <div className="page-description">
                Choose an organization to manage its projects and budgets.
              </div>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-small"
              >
                + Create organization
              </button>
            )}
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <div className="alert-title">Could not load organizations</div>
              <div>{error}</div>
            </div>
          )}

          {loading ? (
            <OrganizationsSkeleton />
          ) : organizations.length === 0 ? (
            <div className="empty-state">
              <div className="badge badge-eyebrow">GET STARTED</div>
              <h3>Your next project starts here</h3>
              <p>
                Create an organization to bring your team, projects and budgets
                together.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="btn btn-small"
              >
                + Create organization
              </button>
              <p className="empty-state-hint">
                Already part of a team? Ask an admin to add your email.
              </p>
            </div>
          ) : (
            <>
              <div className="orgs-grid">
                {organizations.map((org) => (
                  <Link
                    key={org.id}
                    to={`/organizations/${org.id}`}
                    className="org-card"
                  >
                    <div className="org-card-header">
                      <div className="org-initial">{getInitials(org.name)}</div>
                      <div
                        className={`badge badge-${(
                          org.role || 'member'
                        ).toLowerCase()}`}
                      >
                        {org.role || 'member'}
                      </div>
                    </div>
                    <h3>{org.name}</h3>
                    <div className="org-card-description">
                      {org.description || 'Your enterprise workspace'}
                    </div>
                    <div className="org-card-meta">
                      <span>
                        {org.projectCount}{' '}
                        {org.projectCount === 1 ? 'project' : 'projects'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {org.memberCount}{' '}
                        {org.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <div className="org-card-footer">
                      <span>Open workspace</span>
                      <span aria-hidden="true">→</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="orgs-footnote">
                Only organizations associated with your account are shown.
              </div>
            </>
          )}
        </div>
      </main>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError('');
          setNameError('');
        }}
        title="Create organization"
        subtitle="Create a dedicated workspace for your team."
      >
        {formError && (
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateOrg} noValidate>
          <div className="form-group">
            <label htmlFor="orgName">Organization name</label>
            <input
              type="text"
              id="orgName"
              placeholder="e.g. DAPS Technologies"
              className={nameError ? 'input-error' : ''}
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (nameError) setNameError('');
              }}
            />
            {nameError && <div className="form-error">{nameError}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="orgDescription">Description (optional)</label>
            <input
              type="text"
              id="orgDescription"
              placeholder="What is this organization about?"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
