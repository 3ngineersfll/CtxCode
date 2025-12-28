import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">💧 Water Game</div>
      <div className="navbar-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>
          Leaderboard
        </Link>
        <Link to="/challenges" className={location.pathname === '/challenges' ? 'active' : ''}>
          Challenges
        </Link>
        <Link to="/achievements" className={location.pathname === '/achievements' ? 'active' : ''}>
          Achievements
        </Link>
        <Link to="/rewards" className={location.pathname === '/rewards' ? 'active' : ''}>
          Rewards
        </Link>
        <div style={{ marginLeft: '16px', paddingLeft: '16px', borderLeft: '2px solid #e0e0e0' }}>
          <span style={{ marginRight: '16px', fontWeight: 600 }}>
            {user?.display_name || user?.username} | ⭐ {user?.total_points || 0} pts | Lv {user?.level || 1}
          </span>
          <button onClick={onLogout} className="btn btn-secondary" style={{ padding: '6px 16px' }}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
