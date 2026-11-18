import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
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
}

export function Organizations() {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

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
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const newOrg = await api.post('/api/organizations', formData);
      setOrganizations([...organizations, newOrg]);
      setFormData({ name: '', description: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation user={user} />
      <div className="container">
        <h2>My Organizations</h2>

        {error && <div className="error">{error}</div>}

        <div className="org-list">
          {organizations.length === 0 ? (
            <p>No organizations yet. Create one below.</p>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="org-card">
                <Link to={`/organizations/${org.id}`} className="org-link">
                  <h3>{org.name}</h3>
                  {org.description && <p>{org.description}</p>}
                  <span className="role-badge">{org.role}</span>
                </Link>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ marginTop: '32px' }}>
          <h3>Create Organization</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description (optional)</label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Organization'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
