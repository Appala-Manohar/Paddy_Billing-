import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Incorrect username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-brand">
          <Sprout className="brand-logo" size={48} />
          <h1>Sri Sai Lakshmi Office</h1>
          <p>Paddy Billing & Mill Ledger System</p>
        </div>

        {error && (
          <div className="alert-banner alert-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-gold w-100" 
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Seeded Roles: admin (admin123) | staff (staff123) | accountant (accountant123)</p>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: radial-gradient(circle at center, #1b3a24 0%, #0c140e 100%);
          padding: 1rem;
        }

        .login-card {
          background: rgba(18, 33, 21, 0.7);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          width: 100%;
          max-width: 450px;
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(10px);
        }

        .login-brand {
          text-align: center;
          margin-bottom: 2rem;
        }

        .brand-logo {
          color: var(--text-gold);
          margin-bottom: 0.75rem;
        }

        .login-brand h1 {
          font-size: 1.75rem;
          color: var(--text-white);
          margin-bottom: 0.25rem;
        }

        .login-brand p {
          color: var(--text-gold);
          font-size: 0.9rem;
          letter-spacing: 0.02em;
        }

        .w-100 {
          width: 100%;
        }

        .login-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-muted);
          padding-top: 1rem;
        }
      `}</style>
    </div>
  );
};

export default Login;
