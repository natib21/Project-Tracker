import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/login', formData);
      navigate('/organizations');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <h1>DAPS</h1>
        <div className="subtitle">PROJECT TRACKER</div>
      </div>

      <div className="auth-container">
        <div className="auth-header">WORKSPACE ACCESS</div>
        <h2>Welcome back</h2>
        <div className="auth-subtitle">Sign in to your DAPS workspace.</div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              placeholder="sara@daps.tech"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <div className="form-hint">Keep your account secure.</div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          <div className="auth-footer-text">No account yet?</div>
          <Link to="/register" className="auth-footer-link">
            Create an account
          </Link>
        </div>
      </div>

      <div className="auth-page-footer">© 2026 DAPS · Secure workspace access</div>
    </div>
  );
}
