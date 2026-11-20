import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { api } from '../lib/api';
import type { OrganizationListItem } from '../types';

interface SidebarProps {
  organizationId: string;
  organizationName: string;
  onOpenHelp: () => void;
}

export function Sidebar({
  organizationId,
  organizationName,
  onOpenHelp,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrganizationListItem[]>([]);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get<OrganizationListItem[]>('/api/organizations')
      .then((data) => {
        if (mounted) setOrgs(data);
      })
      .catch(() => {
        // Ignore if background fetch fails
      });
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isOverviewActive =
    location.pathname === `/organizations/${organizationId}`;
  const isProjectsActive =
    location.pathname.startsWith(`/organizations/${organizationId}/projects`);
  const isMembersActive =
    location.pathname === `/organizations/${organizationId}/members`;

  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-brand">
        <BrandLogo to="/organizations" />
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-title">WORKSPACE</div>

        <div className="workspace-switcher" ref={switcherRef}>
          <button
            type="button"
            className="workspace-switcher-btn"
            onClick={() => setSwitcherOpen((prev) => !prev)}
            aria-expanded={switcherOpen}
            title={organizationName}
          >
            <span className="workspace-switcher-name">{organizationName}</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              {switcherOpen ? '⌃' : '⌄'}
            </span>
          </button>

          {switcherOpen && (
            <div className="workspace-switcher-menu" role="menu">
              {orgs.length === 0 ? (
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {organizationName}
                </div>
              ) : (
                orgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    role="menuitem"
                    className={`workspace-switcher-item ${
                      org.id === organizationId ? 'active' : ''
                    }`}
                    onClick={() => {
                      setSwitcherOpen(false);
                      navigate(`/organizations/${org.id}`);
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {org.name}
                    </span>
                    <span style={{ fontSize: '11px', opacity: 0.75, textTransform: 'capitalize' }}>
                      {org.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <nav className="sidebar-links" aria-label="Organization sections">
          <Link
            to={`/organizations/${organizationId}`}
            className={`sidebar-item ${isOverviewActive ? 'active' : ''}`}
          >
            Overview
          </Link>
          <Link
            to={`/organizations/${organizationId}/projects`}
            className={`sidebar-item ${isProjectsActive ? 'active' : ''}`}
          >
            Projects
          </Link>
          <Link
            to={`/organizations/${organizationId}/members`}
            className={`sidebar-item ${isMembersActive ? 'active' : ''}`}
          >
            Members
          </Link>
        </nav>
      </div>

      <div className="sidebar-footer">
        <Link to="/organizations" className="sidebar-footer-link">
          ← All organizations
        </Link>
        <button
          type="button"
          className="sidebar-footer-link"
          onClick={onOpenHelp}
        >
          Help & support
        </button>
      </div>
    </aside>
  );
}
