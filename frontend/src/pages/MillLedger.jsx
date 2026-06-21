import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Search, Plus, Edit, Trash2, Download, X } from 'lucide-react';

const MillLedger = () => {
  const { apiFetch, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal form states
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [date, setDate] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLedger = async () => {
    try {
      setLoading(true);
      let url = '/api/ledger';
      const params = [];
      if (search) params.push(`q=${encodeURIComponent(search)}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const res = await apiFetch(url);
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch mill ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLedger();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setTimeout(fetchLedger, 50);
  };

  const openAddModal = () => {
    setCurrentEntry(null);
    // Default to current date-time for datetime-local input (YYYY-MM-DDTHH:MM)
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    
    setDate(localISOTime);
    setAmountReceived('');
    setReferenceNumber('');
    setNotes('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (entry) => {
    setCurrentEntry(entry);
    // Format ISO string to datetime-local format
    const localTime = new Date(entry.date).toISOString().slice(0, 16);
    setDate(localTime);
    setAmountReceived(entry.amount_received);
    setReferenceNumber(entry.reference_number);
    setNotes(entry.notes || '');
    setError('');
    setModalOpen(true);
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      date: new Date(date).toISOString(),
      amount_received: parseFloat(amountReceived),
      reference_number: referenceNumber,
      notes: notes || null
    };

    try {
      let res;
      if (currentEntry) {
        res = await apiFetch(`/api/ledger/${currentEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save ledger entry');
      }

      setSuccess(currentEntry ? 'Ledger entry updated!' : 'Ledger entry added!');
      setModalOpen(false);
      fetchLedger();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ledger entry?')) {
      return;
    }
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch(`/api/ledger/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete ledger entry');
      }
      setSuccess('Ledger entry deleted successfully!');
      fetchLedger();
    } catch (err) {
      setError(err.message);
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'accountant';
  const canDelete = user?.role === 'admin';

  return (
    <div>
      <div className="paddy-banner">
        <div className="paddy-banner-text">
          <h1>Mill Inflow Ledger</h1>
          <p>Track payments received from the rice mill and match UTR transaction references</p>
        </div>
        <div className="banner-actions">
          <a href={`${API_URL}/api/ledger/export/excel`} className="btn btn-primary" download>
            <Download size={18} />
            <span>Export Ledger</span>
          </a>
          {canEdit && (
            <button onClick={openAddModal} className="btn btn-gold">
              <Plus size={18} />
              <span>Add Entry</span>
            </button>
          )}
        </div>
      </div>

      {success && <div className="alert-banner alert-success">{success}</div>}
      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Search & Filter Bar */}
      <div className="card filter-panel mb-2">
        <form onSubmit={handleSearchSubmit} className="filter-form">
          <div className="form-group flex-1">
            <label className="form-label">Search reference / notes</label>
            <div className="search-input-container">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="UTR Number, banks details, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-group date-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group date-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <button type="submit" className="btn btn-gold">
              Apply Filter
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleClearFilters}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Table */}
      {loading ? (
        <div className="loading-container"><h3>Loading mill ledger entries...</h3></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date & Time</th>
                <th>UTR / Reference No</th>
                <th>Amount Received</th>
                <th>Notes / Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>TXN-{entry.id.toString().padStart(5, '0')}</td>
                    <td>{new Date(entry.date).toLocaleString('en-IN')}</td>
                    <td className="bold-text">{entry.reference_number}</td>
                    <td className="text-success bold-text">₹ {entry.amount_received.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>{entry.notes || <span className="text-muted">None</span>}</td>
                    <td>
                      <div className="actions-cell">
                        {canEdit && (
                          <button 
                            onClick={() => openEditModal(entry)}
                            className="btn btn-secondary btn-icon"
                            title="Edit Entry"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="btn btn-danger btn-icon"
                            title="Delete Entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">No ledger entries found. Record a payment received above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Entry Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentEntry ? 'Edit Ledger Entry' : 'Record Mill Payment'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEntry}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Transaction Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Received (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">UTR / Reference Number *</label>
                <input
                  type="text"
                  className="form-input"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Bank UTR or transaction ID reference"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Remarks</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment details, bank accounts, or notes..."
                />
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  {currentEntry ? 'Save Entry' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .banner-actions {
          display: flex;
          gap: 0.75rem;
        }

        .filter-panel {
          padding: 1.25rem;
        }

        .filter-form {
          display: flex;
          align-items: flex-end;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .flex-1 {
          flex: 1;
          min-width: 250px;
        }

        .date-group {
          width: 150px;
        }

        .search-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
        }

        .search-input {
          padding-left: 2.5rem;
        }

        .filter-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .bold-text {
          font-weight: 600;
          color: var(--text-gold-light);
        }

        .text-success {
          color: var(--success);
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 2rem;
          border-top: 1px solid var(--border-muted);
          padding-top: 1rem;
        }

        .text-center {
          text-align: center;
        }

        .mb-2 {
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
};

export default MillLedger;
