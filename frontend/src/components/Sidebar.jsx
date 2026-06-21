import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  History, 
  BookOpen, 
  FileSpreadsheet, 
  Settings as SettingsIcon, 
  LogOut,
  Sprout
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Farmers', path: '/farmers', icon: Users },
    { name: 'New Billing', path: '/new-billing', icon: Receipt },
    { name: 'Bill History', path: '/history', icon: History },
    { name: 'Mill Ledger', path: '/ledger', icon: BookOpen },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Sprout className="brand-icon" size={28} />
        <div>
          <h2>Sai Lakshmi</h2>
          <span className="brand-sub">Paddy Office</span>
        </div>
      </div>

      <div className="sidebar-profile">
        <div className="profile-avatar">
          {user.full_name[0].toUpperCase()}
        </div>
        <div className="profile-info">
          <p className="profile-name">{user.full_name}</p>
          <span className={`role-tag role-${user.role}`}>
            {user.role.toUpperCase()}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} className="nav-icon" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <button onClick={logout} className="sidebar-logout">
        <LogOut size={20} />
        <span>Logout</span>
      </button>

      <style>{`
        .sidebar {
          width: 260px;
          background-color: var(--bg-sidebar);
          border-right: 1px solid var(--border-muted);
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          z-index: 100;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-muted);
          margin-bottom: 1.5rem;
        }

        .brand-icon {
          color: var(--text-gold);
        }

        .sidebar-brand h2 {
          font-size: 1.15rem;
          color: var(--text-white);
        }

        .brand-sub {
          font-size: 0.75rem;
          color: var(--text-gold);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          border: 1px solid rgba(197, 168, 128, 0.05);
        }

        .profile-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-green);
          color: var(--text-white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
          border: 1px solid var(--border-gold);
        }

        .profile-info {
          display: flex;
          flex-direction: column;
        }

        .profile-name {
          font-weight: 600;
          color: var(--text-white);
          font-size: 0.9rem;
        }

        .role-tag {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          margin-top: 0.25rem;
          width: fit-content;
        }

        .role-admin { background-color: rgba(212, 175, 55, 0.15); color: var(--text-gold); }
        .role-staff { background-color: rgba(76, 175, 80, 0.15); color: var(--success); }
        .role-accountant { background-color: rgba(41, 182, 246, 0.15); color: var(--info); }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1rem;
          color: var(--text-muted);
          text-decoration: none;
          border-radius: var(--radius-md);
          font-weight: 500;
          transition: var(--transition);
        }

        .nav-link:hover {
          color: var(--text-gold);
          background-color: rgba(255, 255, 255, 0.02);
        }

        .nav-link.active {
          background-color: rgba(46, 125, 50, 0.15);
          color: var(--text-gold-light);
          border: 1px solid rgba(197, 168, 128, 0.2);
        }

        .nav-icon {
          transition: var(--transition);
        }

        .nav-link.active .nav-icon {
          color: var(--text-gold);
        }

        .sidebar-logout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1rem;
          background: none;
          border: none;
          color: var(--danger);
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-family: var(--font-sans);
          font-weight: 600;
          border-radius: var(--radius-md);
          transition: var(--transition);
          margin-top: auto;
        }

        .sidebar-logout:hover {
          background-color: rgba(239, 83, 80, 0.1);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
