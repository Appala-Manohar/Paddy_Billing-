import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, Eye, EyeOff } from 'lucide-react';

const Login = ({ initialMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, user } = useAuth();

  const isRegisterPath = initialMode === 'register' || location.pathname === '/register';
  const [isSignUp, setIsSignUp] = useState(isRegisterPath);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('staff');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isSignUp) {
      // Validate fields
      if (!username.trim() || username.trim().length < 3) {
        setError('Username must be at least 3 characters long.');
        setLoading(false);
        return;
      }

      if (!email.trim() || !email.includes('@') || !email.includes('.')) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify and try again.');
        setLoading(false);
        return;
      }

      try {
        await register(username.trim(), email.trim(), password, fullName.trim(), role);
        setSuccess('Account created successfully! Logging you in...');
        
        // Auto-login after successful registration
        setTimeout(async () => {
          try {
            await login(username.trim(), password);
            navigate('/dashboard');
          } catch {
            setError('Account created, but automatic sign-in failed. Please sign in manually.');
            setIsSignUp(false);
          }
        }, 1500);

      } catch (err) {
        setError(err.message || 'Registration failed. Please check your information and try again.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await login(username.trim(), password);
        navigate('/dashboard');
      } catch (err) {
        setError(err.message || 'Incorrect username/email or password');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-image-side">
        <div className="image-overlay">
          <div className="overlay-content">
            <div className="logo-container">
              <Sprout className="logo-icon" size={54} />
              <h1>Sri Sai Lakshmi</h1>
            </div>
            <p className="subtitle">Paddy Billing & Mill Ledger System</p>
            <div className="quote-box">
              <p className="quote">"Sowing data, reaping clarity. The digital backbone for modern grain mills."</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <div className="login-brand-mobile">
            <Sprout className="brand-logo" size={40} />
            <h1>Sri Sai Lakshmi Office</h1>
            <p>Paddy Billing & Mill Ledger System</p>
          </div>

          <div className="toggle-container">
            <button
              type="button"
              className={`toggle-tab ${!isSignUp ? 'active' : ''}`}
              onClick={() => {
                setIsSignUp(false);
                setError('');
                setSuccess('');
              }}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`toggle-tab ${isSignUp ? 'active' : ''}`}
              onClick={() => {
                setIsSignUp(true);
                setError('');
                setSuccess('');
              }}
              disabled={loading}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="alert-banner alert-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="alert-banner alert-success">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-group">
                <label className="form-label" htmlFor="register-fullname">Full Name *</label>
                <input
                  id="register-fullname"
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="login-username">
                {isSignUp ? 'Username *' : 'Username or Email *'}
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isSignUp ? 'Choose a unique username' : 'Enter username or email'}
                required
                disabled={loading}
                autoComplete={isSignUp ? 'username' : 'username email'}
              />
            </div>

            {isSignUp && (
              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email Address *</label>
                <input
                  id="register-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            )}

            {isSignUp && (
              <div className="form-group">
                <label className="form-label" htmlFor="register-role">System Role *</label>
                <select
                  id="register-role"
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  disabled={loading}
                  style={{ background: '#122115', color: '#fff' }}
                >
                  <option value="staff">Office Staff</option>
                  <option value="accountant">Mill Accountant</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="login-password">Password *</label>
                {!isSignUp && (
                  <Link to="/forgot-password" className="forgot-password-link">
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Minimum 6 characters' : 'Enter your password'}
                  required
                  minLength={isSignUp ? 6 : 1}
                  disabled={loading}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="form-group">
                <label className="form-label" htmlFor="register-confirm">Confirm Password *</label>
                <input
                  id="register-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-gold w-100" 
              disabled={loading}
              style={{ marginTop: '1.25rem' }}
            >
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Logging in...') 
                : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="switch-mode-box">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                    setSuccess('');
                  }}
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                    setSuccess('');
                  }}
                >
                  Create Account
                </button>
              </p>
            )}
          </div>

          {!isSignUp && (
            <div className="login-footer">
              <p>Default Seeded Accounts: admin (admin123) | staff (staff123) | accountant (accountant123)</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .login-wrapper {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-main);
          width: 100%;
        }

        .login-image-side {
          flex: 1.2;
          background: url('/paddy_farmer.png') no-repeat center center;
          background-size: cover;
          display: flex;
          position: relative;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(12, 20, 14, 0.9) 0%, rgba(18, 33, 21, 0.5) 100%);
          backdrop-filter: blur(1px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .overlay-content {
          max-width: 480px;
          color: var(--text-white);
          text-align: left;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .logo-icon {
          color: var(--text-gold);
          filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.4));
        }

        .overlay-content h1 {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--text-white);
          line-height: 1.2;
          margin: 0;
        }

        .subtitle {
          font-size: 1rem;
          color: var(--text-gold);
          margin-top: 0.25rem;
          margin-bottom: 2rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .quote-box {
          border-left: 3px solid var(--text-gold);
          padding-left: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
          padding-right: 1rem;
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          backdrop-filter: blur(5px);
        }

        .quote {
          font-style: italic;
          font-size: 0.95rem;
          color: var(--text-gold-light);
          line-height: 1.5;
        }

        .login-form-side {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          background: radial-gradient(circle at center, #1b3a24 0%, #0c140e 100%);
          padding: 2rem;
        }

        .login-card {
          background: rgba(18, 33, 21, 0.75);
          border: 1px solid var(--border-gold);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          width: 100%;
          max-width: 440px;
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(10px);
          transition: var(--transition);
        }

        .login-brand-mobile {
          display: none;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .brand-logo {
          color: var(--text-gold);
          margin-bottom: 0.5rem;
        }

        .login-brand-mobile h1 {
          font-size: 1.5rem;
          color: var(--text-white);
          margin-bottom: 0.25rem;
        }

        .login-brand-mobile p {
          color: var(--text-gold);
          font-size: 0.85rem;
        }

        .toggle-container {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 30px;
          padding: 4px;
          margin-bottom: 1.75rem;
          border: 1px solid var(--border-muted);
        }

        .toggle-tab {
          flex: 1;
          padding: 0.6rem;
          border: none;
          background: transparent;
          border-radius: 25px;
          color: var(--text-muted);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }

        .toggle-tab:hover {
          color: var(--text-gold-light);
        }

        .toggle-tab.active {
          color: #0c140e;
          background: linear-gradient(135deg, var(--text-gold) 0%, #b8860b 100%);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.25);
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .label-row .form-label {
          margin-bottom: 0;
        }

        .forgot-password-link {
          font-size: 0.8rem;
          color: var(--text-gold);
          text-decoration: none;
          font-weight: 500;
          transition: var(--transition);
        }

        .forgot-password-link:hover {
          color: var(--text-gold-light);
          text-decoration: underline;
        }

        .password-input-wrapper {
          position: relative;
        }

        .password-input-wrapper input {
          padding-right: 2.75rem;
        }

        .password-toggle-btn {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: var(--transition);
        }

        .password-toggle-btn:hover {
          color: var(--text-gold);
        }

        .alert-banner {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .alert-danger {
          background-color: rgba(239, 83, 80, 0.15);
          border: 1px solid var(--danger);
          color: #ff8a80;
        }

        .alert-success {
          background-color: rgba(102, 187, 106, 0.15);
          border: 1px solid var(--success);
          color: #b9f6ca;
        }

        .w-100 {
          width: 100%;
        }

        .switch-mode-box {
          margin-top: 1.25rem;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .link-button {
          background: none;
          border: none;
          color: var(--text-gold);
          font-family: inherit;
          font-size: inherit;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          transition: var(--transition);
        }

        .link-button:hover {
          color: var(--text-gold-light);
        }

        .login-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-muted);
          padding-top: 0.75rem;
        }

        @media (max-width: 900px) {
          .login-image-side {
            display: none;
          }
          
          .login-brand-mobile {
            display: block;
          }

          .login-form-side {
            flex: 1;
            padding: 1.5rem;
          }

          .login-card {
            padding: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
