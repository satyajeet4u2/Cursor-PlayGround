import { NavLink, Outlet } from 'react-router-dom';
import { UserRole } from '@ops-cases/shared';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const isManager = user?.role === UserRole.Manager;

  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="logo">
          Ops Cases
        </NavLink>
        <nav className="nav">
          {isManager && (
            <>
              <NavLink to="/overview" className={({ isActive }) => (isActive ? 'active' : '')}>
                Overview
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
                Reports
              </NavLink>
            </>
          )}
          <NavLink to="/cases" className={({ isActive }) => (isActive ? 'active' : '')}>
            Cases
          </NavLink>
        </nav>
        <div className="header-right">
          <span className="user-pill">
            {user?.name ?? user?.email}
            <span className="role">{user?.role}</span>
          </span>
          <button type="button" className="btn secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="main main-wide">
        <Outlet />
      </main>
    </div>
  );
}
