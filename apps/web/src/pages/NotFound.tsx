import { Link, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="standalone-layout">
      <TopBar />

      <main className="standalone-main">
        <div className="error-page">
          <div className="error-card">
            <div className="error-code">404 / PAGE NOT FOUND</div>
            <h1>We couldn&apos;t find that page</h1>
            <p>
              The link may have changed, or the project was removed.
              <br />
              Your other workspaces are right where you left them.
            </p>
            <div className="error-actions">
              <Link to="/organizations" className="btn btn-small">
                Back to organizations
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary btn-small"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
