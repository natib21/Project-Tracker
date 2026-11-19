import { Link } from 'react-router-dom';

export function Forbidden() {
  return (
    <div className="app-layout">
      <div className="main-content">
        <div className="top-nav">
          <div className="breadcrumb">
            <Link to="/organizations">Organizations</Link>
          </div>
          <div className="user-menu">
            <Link to="/organizations" className="btn-logout">
              Help & support
            </Link>
            <Link to="/login" className="btn-logout">
              Log out
            </Link>
          </div>
        </div>

        <div className="error-page">
          <div className="error-code">403 / ACCESS RESTRICTED</div>
          <h1>This space is restricted</h1>
          <p>
            You don't have access to this organization or project. Ask your organization admin to
            invite you.
          </p>
          <div className="error-actions">
            <Link to="/organizations" className="btn">
              Back to organizations
            </Link>
            <button onClick={() => window.history.back()} className="btn btn-secondary">
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
