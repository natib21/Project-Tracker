import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>404 - Not Found</h1>
      <p>The resource you are looking for does not exist.</p>
      <Link to="/organizations" className="link">
        Go to Organizations
      </Link>
    </div>
  );
}
