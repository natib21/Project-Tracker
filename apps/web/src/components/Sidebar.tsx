import { Link, useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  organizationId: string;
  organizationName: string;
}

export function Sidebar({ organizationId, organizationName }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === 'overview') {
      return location.pathname === `/organizations/${organizationId}` && !location.hash;
    }
    if (path === 'projects') {
      return location.hash === '#projects';
    }
    if (path === 'members') {
      return location.hash === '#members';
    }
    return false;
  };

  const scrollToSection = (sectionId: string) => {
    navigate(`/organizations/${organizationId}#${sectionId}`);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
        <a
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('projects');
          }}
          className={`sidebar-item ${isActive('projects') ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          Projects
        </a>
        <a
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('members');
          }}
          className={`sidebar-item ${isActive('members') ? 'active' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          Members
        </a>
      </div>

      <div className="sidebar-footer">
        <Link to="/organizations" className="sidebar-footer-link">
          ← All organizations
        </Link>
      </div>
    </div>
  );
}
