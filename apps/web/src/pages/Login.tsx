import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { api, getErrorMessage } from '../lib/api';
import type { AuthResponse } from '../types';

export function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = 'Enter a valid email address.';
    }
    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await api.post<AuthResponse>('/api/auth/login', {
        email: formData.email.trim(),
        password: formData.password,
      });
      navigate('/organizations');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('credentials')
      ) {
        setError('Email or password is incorrect.');
      } else {
        setError(msg || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <BrandLogo to="/login" />
        <div className="auth-topbar-right">
          <span>New to DAPS?</span>
          <Link to="/register">Create an account</Link>
        </div>
      </header>

      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-header">WORKSPACE ACCESS</div>
          <h2>{error ? 'Unable to sign in' : 'Welcome back'}</h2>
          <div className="auth-subtitle">Sign in to your DAPS workspace.</div>

          {error && (
            <div className="alert alert-error" role="alert">
              <div className="alert-title">{error}</div>
              <div>Check your details and try again.</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                placeholder="sara@daps.tech"
                className={fieldErrors.email ? 'input-error' : ''}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (fieldErrors.email) {
                    setFieldErrors({ ...fieldErrors, email: undefined });
                  }
                }}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <div className="form-error">{fieldErrors.email}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••••••"
                className={fieldErrors.password ? 'input-error' : ''}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (fieldErrors.password) {
                    setFieldErrors({ ...fieldErrors, password: undefined });
                  }
                }}
                autoComplete="current-password"
              />
              {fieldErrors.password ? (
                <div className="form-error">{fieldErrors.password}</div>
              ) : (
                <div className="form-hint">Keep your account secure.</div>
              )}
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing in...' : error ? 'Try again' : 'Sign in'}
            </button>
          </form>

          <div className="auth-card-footer">
            <span>No account yet?</span>
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </main>

      <footer className="auth-page-footer">
        © 2026 DAPS · Secure workspace access
      </footer>
    </div>
  );
}
