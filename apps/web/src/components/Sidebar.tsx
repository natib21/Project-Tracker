import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  organizationName?: string;
}

export function Sidebar({ organizationName }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/overview') {
      return location.pathname.match(/\/organizations\/[^/]+$/);
    }
    return location.pathname.includes(path);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>DAPS</h2>
        <div className="brand-subtitle">PROJECT TRACKER</div>
      </div>

      {organizationName && (
        <>
          <div className="sidebar-nav">
            <div className="sidebar-section-title">WORKSPACE</div>
            <div style={{ padding: '0 20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {organizationName}
              </div>
            </div>

            <Link
              to={`/organizations/${location.pathname.split('/')[2]}`}
              className={`sidebar-item ${isActive('/overview') ? 'active' : ''}`}
            >
              Overview
            </Link>
            <Link
              to={`/organizations/${location.pathname.split('/')[2]}`}
              className={`sidebar-item ${isActive('/projects') && !isActive('/overview') ? 'active' : ''}`}
            >
              Projects
            </Link>
            <Link
              to={`/organizations/${location.pathname.split('/')[2]}`}
              className={`sidebar-item`}
            >
              Members
            </Link>
          </div>

          <div className="sidebar-footer">
            <Link to="/organizations" className="sidebar-footer-link">
              ← All organizations
            </Link>
            <Link to="#" className="sidebar-footer-link">
              Help & support
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
