import { Link } from 'react-router-dom';

export function Forbidden() {
  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>403 - Forbidden</h1>
      <p>You do not have permission to access this resource.</p>
      <Link to="/organizations" className="link">
        Go to Organizations
      </Link>
    </div>
  );
}
