import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';

const Farmers = () => {
  const { apiFetch, user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentFarmer, setCurrentFarmer] = useState(null); // null for Add, populated for Edit
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  const fetchFarmers = async (query = '') => {
    try {
      setLoading(true);
      const url = query ? `/api/farmers?q=${encodeURIComponent(query)}` : '/api/farmers';
      const res = await apiFetch(url);
      const data = await res.json();
      setFarmers(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch farmers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    fetchFarmers(e.target.value);
  };

  const openAddModal = () => {
    setCurrentFarmer(null);
    setName('');
    setPhone('');
    setVillage('');
    setAddress('');
    setBankName('');
    setBankAccount('');
    setBankIfsc('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (farmer) => {
    setCurrentFarmer(farmer);
    setName(farmer.name);
    setPhone(farmer.phone);
    setVillage(farmer.village);
    setAddress(farmer.address);
    setBankName(farmer.bank_name || '');
    setBankAccount(farmer.bank_account || '');
    setBankIfsc(farmer.bank_ifsc || '');
    setError('');
    setModalOpen(true);
  };

  const handleSaveFarmer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Phone validation
    if (!/^\d{10}$/.test(phone)) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }

    const payload = {
      name,
      phone,
      village,
      address,
      bank_name: bankName || null,
      bank_account: bankAccount || null,
      bank_ifsc: bankIfsc || null
    };

    try {
      let res;
      if (currentFarmer) {
        // Edit Farmer
        res = await apiFetch(`/api/farmers/${currentFarmer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Add Farmer
        res = await apiFetch('/api/farmers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save farmer details');
      }

      setSuccessMsg(currentFarmer ? 'Farmer updated successfully!' : 'Farmer added successfully!');
      setModalOpen(false);
      fetchFarmers(search);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteFarmer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this farmer? This will also delete all bills associated with this farmer.')) {
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`/api/farmers/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete farmer');
      }
      setSuccessMsg('Farmer deleted successfully!');
      fetchFarmers(search);
    } catch (err) {
      setError(err.message);
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'staff';
  const canDelete = user?.role === 'admin';

  return (
    <div>
      <div className="paddy-banner">
        <div className="paddy-banner-text">
          <h1>Farmer Directory</h1>
          <p>Register and manage farmer profiles for crop acquisitions</p>
        </div>
        {canEdit && (
          <button onClick={openAddModal} className="btn btn-gold">
            <Plus size={18} />
            <span>Add Farmer</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="alert-banner alert-success">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert-banner alert-danger">
          {error}
        </div>
      )}

      {/* Search Filter bar */}
      <div className="search-bar card mb-2">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by farmer name, mobile number, or village..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Farmers Table */}
      {loading ? (
        <div className="loading-container"><h3>Loading farmers list...</h3></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Farmer Name</th>
                <th>Mobile Number</th>
                <th>Village</th>
                <th>Address</th>
                <th>Bank Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {farmers.length > 0 ? (
                farmers.map((farmer) => (
                  <tr key={farmer.id}>
                    <td>F-{farmer.id.toString().padStart(4, '0')}</td>
                    <td className="bold-text">{farmer.name}</td>
                    <td>{farmer.phone}</td>
                    <td>{farmer.village}</td>
                    <td>{farmer.address}</td>
                    <td>
                      {farmer.bank_name ? (
                        <div className="bank-details-cell">
                          <p>{farmer.bank_name}</p>
                          <span className="small-text">A/C: {farmer.bank_account}</span>
                        </div>
                      ) : (
                        <span className="text-muted">Not Provided</span>
                      )}
                    </td>
                    <td>
                      <div className="actions-cell">
                        {canEdit && (
                          <button 
                            onClick={() => openEditModal(farmer)}
                            className="btn btn-secondary btn-icon"
                            title="Edit Farmer"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDeleteFarmer(farmer.id)}
                            className="btn btn-danger btn-icon"
                            title="Delete Farmer"
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
                  <td colSpan="7" className="text-center">No farmers found. Try adding a new farmer.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Farmer Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{currentFarmer ? 'Edit Farmer Profile' : 'Register New Farmer'}</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveFarmer}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Farmer Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Village *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="Village name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full postal address"
                    required
                  />
                </div>
              </div>

              <div className="form-section-divider">
                <span>Bank Details (Optional)</span>
              </div>

              <div className="grid grid-3">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="SBI, HDFC, etc."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Account number"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value)}
                    placeholder="IFSC code"
                  />
                </div>
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
                  {currentFarmer ? 'Update Farmer' : 'Register Farmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .search-bar {
          padding: 1rem;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          color: var(--text-muted);
        }

        .search-input-wrapper .form-input {
          padding-left: 2.75rem;
        }

        .bold-text {
          font-weight: 600;
          color: var(--text-gold-light);
        }

        .bank-details-cell p {
          color: var(--text-white);
          font-weight: 500;
          font-size: 0.85rem;
        }

        .small-text {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .actions-cell {
          display: flex;
          gap: 0.5rem;
        }

        .form-section-divider {
          display: flex;
          align-items: center;
          margin: 1.5rem 0 1rem 0;
        }

        .form-section-divider::after, .form-section-divider::before {
          content: '';
          flex: 1;
          height: 1px;
          background-color: var(--border-muted);
        }

        .form-section-divider span {
          padding: 0 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-gold);
          text-transform: uppercase;
          letter-spacing: 0.05em;
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

export default Farmers;
