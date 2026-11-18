import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

interface NavigationProps {
  user: { firstName: string; lastName: string; email: string };
}

export function Navigation({ user }: NavigationProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <h1>Project Tracker</h1>
        <div className="navbar-right">
          <Link to="/organizations" className="link">
            Organizations
          </Link>
          <span className="user-info">
            {user.firstName} {user.lastName}
          </span>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
