import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { KeyRound, ShieldAlert, Database, History, Download, RefreshCw } from 'lucide-react';

const Settings = () => {
  const { apiFetch, user } = useAuth();
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Backup states
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState('');
  const [backupError, setBackupError] = useState('');

  const fetchBackups = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await apiFetch('/api/backup/list');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to change password');
      }

      setPwSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupSuccess('');
    setBackupError('');
    setBackupLoading(true);
    try {
      const res = await apiFetch('/api/backup/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create backup');
      }
      setBackupSuccess(`Backup ${data.filename} created successfully!`);
      fetchBackups();
    } catch (err) {
      setBackupError(err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (id, filename) => {
    if (!window.confirm(`WARNING: Are you sure you want to restore the database to: ${filename}? This will overwrite all current system data.`)) {
      return;
    }
    setBackupSuccess('');
    setBackupError('');
    setBackupLoading(true);
    try {
      const res = await apiFetch(`/api/backup/restore/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to restore backup');
      }
      setBackupSuccess(data.message || 'Database restored successfully!');
      alert('Database restored successfully! The application will refresh.');
      window.location.reload();
    } catch (err) {
      setBackupError(err.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="paddy-banner">
        <div className="paddy-banner-text">
          <h1>System Settings</h1>
          <p>Configure password security, database backups, and data exports</p>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Change Password Form */}
        <div className="card">
          <div className="card-header">
            <KeyRound size={20} className="header-icon" />
            <h3>Update Password</h3>
          </div>
          
          {pwSuccess && <div className="alert-banner alert-success">{pwSuccess}</div>}
          {pwError && <div className="alert-banner alert-danger">{pwError}</div>}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Old Password *</label>
              <input
                type="password"
                className="form-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <button type="submit" className="btn btn-gold" disabled={pwLoading}>
              {pwLoading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Database Backup Controls (Admin Only) */}
        <div className="card">
          <div className="card-header">
            <Database size={20} className="header-icon" />
            <h3>Database & Backups</h3>
          </div>

          {!isAdmin ? (
            <div className="non-admin-warning">
              <ShieldAlert size={28} className="warn-icon" />
              <p>Backup management, full data exports, and snapshots restoration controls are strictly restricted to System Administrators only.</p>
            </div>
          ) : (
            <div className="backup-controls">
              {backupSuccess && <div className="alert-banner alert-success">{backupSuccess}</div>}
              {backupError && <div className="alert-banner alert-danger">{backupError}</div>}

              <div className="backup-actions-row">
                <button 
                  onClick={handleCreateBackup} 
                  className="btn btn-gold"
                  disabled={backupLoading}
                >
                  <RefreshCw size={18} className={backupLoading ? 'spin-icon' : ''} />
                  <span>Snapshot Database Now</span>
                </button>

                <a 
                  href={`${API_URL}/api/backup/export`} 
                  className="btn btn-primary"
                  download
                >
                  <Download size={18} />
                  <span>Download SQLite File</span>
                </a>
              </div>

              {/* Snapshots history list */}
              <div className="snapshots-list-section">
                <div className="list-title">
                  <History size={16} />
                  <span>Available Snapshots</span>
                </div>

                <div className="snapshots-table-wrapper">
                  {backups.length > 0 ? (
                    <table className="mini-table">
                      <thead>
                        <tr>
                          <th>Backup File</th>
                          <th>Size (KB)</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map(b => (
                          <tr key={b.id}>
                            <td className="filename-cell" title={b.filename}>{b.filename}</td>
                            <td>{(b.file_size / 1024).toFixed(1)}</td>
                            <td>
                              <span className={`badge ${b.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                                {b.status.split(':')[0]}
                              </span>
                            </td>
                            <td>
                              {b.status === 'success' && (
                                <button
                                  onClick={() => handleRestoreBackup(b.id, b.filename)}
                                  className="btn btn-secondary btn-restore"
                                  disabled={backupLoading}
                                >
                                  Restore
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-backups-text">No backups recorded on this system.</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      <style>{`
        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-muted);
          padding-bottom: 0.5rem;
        }

        .header-icon {
          color: var(--text-gold);
        }

        .non-admin-warning {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
          background-color: rgba(239, 83, 80, 0.05);
          border: 1px dashed var(--danger);
          border-radius: var(--radius-md);
        }

        .warn-icon {
          color: var(--danger);
          margin-bottom: 1rem;
        }

        .warn-icon + p {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .backup-actions-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .snapshots-list-section {
          border-top: 1px solid var(--border-muted);
          padding-top: 1.25rem;
        }

        .list-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          color: var(--text-gold);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
          font-weight: 600;
        }

        .snapshots-table-wrapper {
          max-height: 250px;
          overflow-y: auto;
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-sm);
        }

        .mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .mini-table th {
          padding: 0.5rem 0.75rem;
          background-color: rgba(255,255,255,0.01);
        }

        .mini-table td {
          padding: 0.5rem 0.75rem;
        }

        .filename-cell {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-restore {
          padding: 0.2rem 0.6rem;
          font-size: 0.75rem;
        }

        .no-backups-text {
          font-size: 0.85rem;
          color: var(--text-muted);
          padding: 1rem;
          text-align: center;
        }

        .spin-icon {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Settings;
