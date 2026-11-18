import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  role: string;
  _count?: { projects: number; memberships: number };
}

export function Organizations() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, orgsData] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/organizations'),
      ]);
      setUser(userData);
      setOrganizations(orgsData);
    } catch (err: any) {
      if (err.status === 401) {
        navigate('/login');
      } else {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await api.post('/api/organizations', formData);
      setFormData({ name: '', description: '' });
      setShowCreateModal(false);
      // Reload all data to get updated counts
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="app-layout">
      <div className="main-content" style={{ marginLeft: 0 }}>
        <div className="top-nav">
          <div className="breadcrumb">
            <img 
              src="https://dapsanalytics.com/assets/images/daps-logo-nav.svg" 
              alt="DAPS" 
              style={{ height: '24px', width: 'auto' }}
            />
          </div>
          <div className="user-menu">
            <div className="user-info">
              <div className="user-name">
                {user.firstName} {user.lastName}
              </div>
              <div className="user-role">Log out</div>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Log out
            </button>
          </div>
        </div>

        <div className="container">
          <div className="page-header-actions">
            <div className="page-header">
              <div className="page-title">YOUR WORKSPACES</div>
              <h1>Organizations</h1>
              <div className="page-description">
                Choose an organization to manage its projects and budgets.
              </div>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-small btn-icon">
              + Create organization
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {organizations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">GET STARTED</div>
              <h3>Your next project starts here</h3>
              <p>Create an organization to bring your team, projects and budgets together.</p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-small">
                + Create organization
              </button>
              <p style={{ marginTop: '16px', fontSize: '13px' }}>
                Already part of a team? Ask an admin to add your email.
              </p>
            </div>
          ) : (
            <div className="orgs-grid">
              {organizations.map((org) => (
                <Link key={org.id} to={`/organizations/${org.id}`} className="org-card">
                  <div className="org-card-header">
                    <div className="org-initial">{getInitials(org.name)}</div>
                    <div className={`badge badge-${(org.role || 'member').toLowerCase()}`}>
                      {org.role || 'member'}
                    </div>
                  </div>
                  <h3>{org.name}</h3>
                  <div className="org-card-description">
                    {org.description || 'Your enterprise workspace'}
                  </div>
                  <div className="org-card-meta">
                    <span>{org._count?.projects || 0} projects</span>
                    <span>·</span>
                    <span>{org._count?.memberships || 0} members</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {organizations.length > 0 && (
            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              Only organizations associated with your account are shown.
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormError('');
        }}
        title="Create organization"
        subtitle="Create a relational workspace for your team."
      >
        {formError && <div className="alert alert-error">{formError}</div>}
        <form onSubmit={handleCreateOrg}>
          <div className="form-group">
            <label htmlFor="orgName">Organization name</label>
            <input
              type="text"
              id="orgName"
              placeholder="e.g. DAPS Technologies"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="orgDescription">Description (optional)</label>
            <input
              type="text"
              id="orgDescription"
              placeholder="What is this organization about?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
