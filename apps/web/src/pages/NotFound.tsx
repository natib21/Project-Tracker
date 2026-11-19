import { Link } from 'react-router-dom';

export function NotFound() {
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
          <div className="error-code">404 / PAGE NOT FOUND</div>
          <h1>We couldn't find that page</h1>
          <p>
            The link may have changed, or the project was removed. Your other workspaces are right
            where you left them.
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
