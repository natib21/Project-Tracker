import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

export function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        navigate('/login');
        return;
      }

      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <h1>Project Tracker</h1>
          <div className="navbar-right">
            <span className="user-info">
              {user.firstName} {user.lastName}
            </span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <div className="container">
        <div className="card">
          <h2>Welcome, {user.firstName}!</h2>
          <p>
            You are successfully logged in as <strong>{user.email}</strong>.
          </p>
          <p style={{ marginTop: '16px' }}>
            This is the home page of your multi-tenant project tracker. 
            Future features will include organizations, projects, and tasks.
          </p>
        </div>
      </div>
    </>
  );
}
