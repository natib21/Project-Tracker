import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { HelpModal } from './HelpModal';
import { api } from '../lib/api';
import type { User } from '../types';

interface TopBarProps {
  user?: User | null;
  activeLink?: 'organizations';
}

export function TopBar({ user, activeLink }: TopBarProps) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post<void>('/api/auth/logout');
    } catch {
      // Redirect even if cookie already expired
    } finally {
      navigate('/login');
    }
  };

  return (
    <>
      <header className="top-nav top-nav-standalone">
        <div className="top-nav-left">
          <BrandLogo to="/organizations" />
          <nav className="top-nav-links" aria-label="Primary">
            <Link
              to="/organizations"
              className={`top-nav-link ${activeLink === 'organizations' ? 'active' : ''}`}
            >
              Organizations
            </Link>
          </nav>
        </div>

        <div className="user-menu">
          <button
            type="button"
            className="top-nav-link"
            onClick={() => setShowHelp(true)}
          >
            Help & support
          </button>

          {user ? (
            <div className="user-info">
              <div className="user-name">
                {user.firstName} {user.lastName}
              </div>
              <div className="user-meta-line">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-logout-inline"
                >
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-logout-inline">
              Log out
            </Link>
          )}
        </div>

        <div className="mobile-topbar-actions">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="btn-logout-inline"
              style={{ fontSize: '13px' }}
            >
              Log out
            </button>
          ) : (
            <Link to="/organizations" className="btn-logout-inline" style={{ fontSize: '13px' }}>
              Organizations
            </Link>
          )}
        </div>
      </header>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}
