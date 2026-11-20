import { Link, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';

export function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="standalone-layout">
      <TopBar />

      <main className="standalone-main">
        <div className="error-page">
          <div className="error-card">
            <div className="error-code">403 / ACCESS RESTRICTED</div>
            <h1>This space is restricted</h1>
            <p>
              You don&apos;t have access to this organization or project.
              <br />
              Ask your organization admin to invite you.
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
