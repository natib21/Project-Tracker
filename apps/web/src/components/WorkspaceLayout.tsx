import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BrandLogo } from './BrandLogo';
import { HelpModal } from './HelpModal';
import { api } from '../lib/api';
import type { User } from '../types';

interface WorkspaceLayoutProps {
  organizationId: string;
  organizationName: string;
  user: User | null;
  userRole?: string;
  topBreadcrumb?: ReactNode;
  children: ReactNode;
}

export function WorkspaceLayout({
  organizationId,
  organizationName,
  user,
  userRole,
  topBreadcrumb,
  children,
}: WorkspaceLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post<void>('/api/auth/logout');
    } catch {
      // Redirect even if already logged out
    } finally {
      navigate('/login');
    }
  };

  const isOverviewActive =
    location.pathname === `/organizations/${organizationId}`;
  const isProjectsActive =
    location.pathname.startsWith(`/organizations/${organizationId}/projects`);
  const isMembersActive =
    location.pathname === `/organizations/${organizationId}/members`;

  const roleLabel = userRole
    ? `${userRole.charAt(0).toUpperCase()}${userRole.slice(1)} account`
    : 'Workspace account';

  return (
    <div className="app-layout">
      <Sidebar
        organizationId={organizationId}
        organizationName={organizationName || 'Workspace'}
        onOpenHelp={() => setShowHelp(true)}
      />

      <div className="main-content">
        <header className="top-nav">
          <div className="mobile-workspace-logo">
            <BrandLogo to="/organizations" />
          </div>

          <div className="breadcrumb desktop-breadcrumb">
            {topBreadcrumb || (
              <>
                <Link to="/organizations">Workspace</Link>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">{organizationName}</span>
              </>
            )}
          </div>

          {user && (
            <div className="user-menu">
              <div className="user-info">
                <div className="user-name">
                  {user.firstName} {user.lastName}
                </div>
                <div className="user-meta-line">
                  <span>{roleLabel}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-logout-inline"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mobile-topbar-actions">
            <button
              type="button"
              onClick={handleLogout}
              className="btn-logout-inline"
              style={{ fontSize: '13px' }}
            >
              Log out
            </button>
          </div>
        </header>

        <nav className="mobile-menu-strip" aria-label="Workspace mobile navigation">
          <Link
            to={`/organizations/${organizationId}`}
            className={`mobile-nav-pill ${isOverviewActive ? 'active' : ''}`}
          >
            Overview
          </Link>
          <Link
            to={`/organizations/${organizationId}/projects`}
            className={`mobile-nav-pill ${isProjectsActive ? 'active' : ''}`}
          >
            Projects
          </Link>
          <Link
            to={`/organizations/${organizationId}/members`}
            className={`mobile-nav-pill ${isMembersActive ? 'active' : ''}`}
          >
            Members
          </Link>
          <Link to="/organizations" className="mobile-nav-pill">
            All orgs
          </Link>
        </nav>

        <main className="workspace-container">{children}</main>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
