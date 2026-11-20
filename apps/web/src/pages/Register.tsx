import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { api, getErrorMessage } from '../lib/api';
import type { AuthResponse } from '../types';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    } = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required.';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }
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
      await api.post<AuthResponse>('/api/auth/register', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      navigate('/organizations');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <BrandLogo to="/login" />
        <div className="auth-topbar-right">
          <span>Already have an account?</span>
          <Link to="/login">Sign in</Link>
        </div>
      </header>

      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-header">WORKSPACE ACCESS</div>
          <h2>Create your account</h2>
          <div className="auth-subtitle">Start managing projects with confidence.</div>

          {error && (
            <div className="alert alert-error" role="alert">
              <div className="alert-title">Unable to create account</div>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First name</label>
                <input
                  type="text"
                  id="firstName"
                  placeholder="Sara"
                  className={fieldErrors.firstName ? 'input-error' : ''}
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (fieldErrors.firstName) {
                      setFieldErrors({ ...fieldErrors, firstName: undefined });
                    }
                  }}
                  autoComplete="given-name"
                />
                {fieldErrors.firstName && (
                  <div className="form-error">{fieldErrors.firstName}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last name</label>
                <input
                  type="text"
                  id="lastName"
                  placeholder="Tesfaye"
                  className={fieldErrors.lastName ? 'input-error' : ''}
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (fieldErrors.lastName) {
                      setFieldErrors({ ...fieldErrors, lastName: undefined });
                    }
                  }}
                  autoComplete="family-name"
                />
                {fieldErrors.lastName && (
                  <div className="form-error">{fieldErrors.lastName}</div>
                )}
              </div>
            </div>

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
                autoComplete="new-password"
              />
              {fieldErrors.password ? (
                <div className="form-error">{fieldErrors.password}</div>
              ) : (
                <div className="form-hint">Use at least 8 characters.</div>
              )}
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="auth-terms">
            By continuing, you agree to our Terms of Service.
          </div>
          <div className="auth-inline-link">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </main>

      <footer className="auth-page-footer">
        © 2026 DAPS · Secure workspace access
      </footer>
    </div>
  );
}
