import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { forgotPassword, user } = useAuth();
  const navigate = useNavigate();

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

    try {
      const res = await forgotPassword(email);
      setSuccess(
        res.message || 
        'If an account exists with that email address, password reset instructions have been sent. Please check your inbox and spam folder.'
      );
    } catch (err) {
      setError(err.message || 'Unable to process your request. Please try again later.');
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
              <Mail size={24} />
            </div>
            <h2>Password Recovery</h2>
            <p className="form-desc">
              Enter your registered email address below. If an account is found, we'll send a secure, expiring link to reset your password.
            </p>
          </div>

          {error && (
            <div className="alert-banner alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="alert-banner alert-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{success}</div>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Registered Email Address</label>
                <input
                  id="forgot-email"
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

              <button 
                type="submit" 
                className="btn btn-gold w-100" 
                disabled={loading}
                style={{ marginTop: '1rem' }}
              >
                {loading ? 'Sending Recovery Link...' : 'Send Password Reset Link'}
              </button>
            </form>
          ) : (
            <div className="success-action-box">
              <p className="check-spam-note">
                Didn't receive an email? Check your spam/junk folder, or verify that your account was registered with this email address.
              </p>
              <button 
                type="button" 
                className="btn btn-secondary w-100"
                onClick={() => {
                  setSuccess('');
                  setEmail('');
                }}
              >
                Try Another Email
              </button>
            </div>
          )}

          <div className="back-to-login">
            <Link to="/login" className="back-link">
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </Link>
          </div>
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
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0;
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

        .check-spam-note {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 1rem;
          text-align: center;
        }

        .w-100 {
          width: 100%;
        }

        .back-to-login {
          margin-top: 1.5rem;
          text-align: center;
          border-top: 1px solid var(--border-muted);
          padding-top: 1rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-gold);
          font-size: 0.875rem;
          text-decoration: none;
          font-weight: 500;
          transition: var(--transition);
        }

        .back-link:hover {
          color: var(--text-gold-light);
          transform: translateX(-2px);
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

export default ForgotPassword;
