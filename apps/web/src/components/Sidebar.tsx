import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  organizationId: string;
  organizationName: string;
}

export function Sidebar({ organizationId, organizationName }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === 'overview') {
      return location.pathname === `/organizations/${organizationId}`;
    }
    if (path === 'projects') {
      return location.pathname.includes(`/organizations/${organizationId}/projects`);
    }
    return false;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <img 
          src="https://dapsanalytics.com/assets/images/daps-logo-nav.svg" 
          alt="DAPS" 
          style={{ height: '32px', width: 'auto' }}
        />
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-title">WORKSPACE</div>
        <div style={{ padding: '0 20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {organizationName}
          </div>
        </div>

        <Link
          to={`/organizations/${organizationId}`}
          className={`sidebar-item ${isActive('overview') ? 'active' : ''}`}
        >
          Overview
        </Link>
        <div className="sidebar-item" style={{ color: 'var(--color-text-tertiary)', cursor: 'default' }}>
          Projects
        </div>
        <div className="sidebar-item" style={{ color: 'var(--color-text-tertiary)', cursor: 'default' }}>
          Members
        </div>
      </div>

      <div className="sidebar-footer">
        <Link to="/organizations" className="sidebar-footer-link">
          ← All organizations
        </Link>
      </div>
    </div>
  );
}
