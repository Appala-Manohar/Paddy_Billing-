import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { verifyResetToken, resetPassword, user } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [associatedEmail, setAssociatedEmail] = useState('');
  const [associatedUsername, setAssociatedUsername] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Verify token on mount
  useEffect(() => {
    let isMounted = true;

    const checkToken = async () => {
      if (!token) {
        setVerifying(false);
        setError('No password reset token was provided in the link. Please request a new reset link.');
        return;
      }

      try {
        const res = await verifyResetToken(token);
        if (isMounted) {
          setTokenValid(true);
          setAssociatedEmail(res.email || '');
          setAssociatedUsername(res.username || '');
        }
      } catch (err) {
        if (isMounted) {
          setTokenValid(false);
          setError(err.message || 'This password reset link is invalid or has expired.');
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    };

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token, verifyResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
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

          <div className="form-header">
            <div className="icon-badge">
              <KeyRound size={24} />
            </div>
            <h2>Set New Password</h2>
            {associatedUsername && (
              <p className="form-desc">
                Resetting password for account: <strong>{associatedUsername}</strong>
                {associatedEmail ? ` (${associatedEmail})` : ''}
              </p>
            )}
          </div>

          {verifying ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Verifying your security token...</p>
            </div>
          ) : !tokenValid && !success ? (
            <div className="invalid-token-box">
              <div className="alert-banner alert-danger">
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{error || 'This password reset link is invalid or has expired.'}</div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link to="/forgot-password" className="btn btn-gold w-100 text-center">
                  Request New Reset Link
                </Link>
                <Link to="/login" className="btn btn-secondary w-100 text-center">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="success-box">
              <div className="alert-banner alert-success">
                <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Password Reset Successful!</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                    Your account password has been updated securely. Redirecting to login in 3 seconds...
                  </p>
                </div>
              </div>
              <Link to="/login" className="btn btn-gold w-100 text-center" style={{ marginTop: '1.25rem' }}>
                Log In Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert-banner alert-danger">
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{error}</div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password *</label>
                <div className="password-input-wrapper">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                    disabled={loading}
                    autoComplete="new-password"
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

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Confirm New Password *</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-gold w-100" 
                disabled={loading}
                style={{ marginTop: '1rem' }}
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>

              <div className="back-to-login">
                <Link to="/login" className="back-link">
                  Cancel & Back to Sign In
                </Link>
              </div>
            </form>
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

        .form-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.12);
          color: var(--text-gold);
          border: 1px solid rgba(212, 175, 55, 0.3);
          margin-bottom: 0.75rem;
        }

        .form-header h2 {
          color: var(--text-white);
          font-size: 1.5rem;
          margin: 0 0 0.5rem;
        }

        .form-desc {
          color: var(--text-muted);
          font-size: 0.85rem;
          line-height: 1.5;
          margin: 0;
        }

        .loading-state {
          text-align: center;
          padding: 2rem 0;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(212, 175, 55, 0.2);
          border-top-color: var(--text-gold);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.25rem;
          font-size: 0.875rem;
          line-height: 1.45;
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

        .text-center {
          text-align: center;
          display: block;
          text-decoration: none;
        }

        .back-to-login {
          margin-top: 1.5rem;
          text-align: center;
          border-top: 1px solid var(--border-muted);
          padding-top: 1rem;
        }

        .back-link {
          color: var(--text-muted);
          font-size: 0.85rem;
          text-decoration: none;
          transition: var(--transition);
        }

        .back-link:hover {
          color: var(--text-gold);
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

export default ResetPassword;
