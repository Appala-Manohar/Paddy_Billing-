import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Search, Printer, Send, Edit, Trash2, Download, X, Calendar } from 'lucide-react';

const BillHistory = () => {
  const { apiFetch, user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Edit Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [billingMode, setBillingMode] = useState('75KG');
  const [bags, setBags] = useState(0);
  const [extraKgs, setExtraKgs] = useState(0);
  const [inputRate, setInputRate] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [ccDeductionApplied, setCcDeductionApplied] = useState(false);
  const [receiptLang, setReceiptLang] = useState('en');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBills = async () => {
    try {
      setLoading(true);
      let url = '/api/bills';
      const params = [];
      if (search) params.push(`q=${encodeURIComponent(search)}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const res = await apiFetch(url);
      const data = await res.json();
      setBills(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch bills history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    // The useEffect will trigger fetch on state changes, but we call it to ensure sync
    setTimeout(fetchBills, 50);
  };

  const handleOpenEdit = (bill) => {
    setEditingBill(bill);
    setBillingMode(bill.billing_mode);
    setBags(bill.bags);
    setExtraKgs(bill.extra_kgs);
    setInputRate(bill.input_rate);
    setAdvancePaid(bill.advance_paid);
    setCcDeductionApplied(bill.cc_deduction > 0);
    setReceiptLang(bill.language);
    setError('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      billing_mode: billingMode,
      bags: parseInt(bags) || 0,
      extra_kgs: parseFloat(extraKgs) || 0,
      input_rate: parseFloat(inputRate) || 0,
      advance_paid: parseFloat(advancePaid) || 0,
      cc_deduction: ccDeductionApplied,
      language: receiptLang
    };

    try {
      const res = await apiFetch(`/api/bills/${editingBill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update bill');
      }

      setSuccess('Bill updated successfully!');
      setEditModalOpen(false);
      fetchBills();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBill = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this bill? This action cannot be undone.')) {
      return;
    }
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch(`/api/bills/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete bill');
      }
      setSuccess('Bill deleted successfully!');
      fetchBills();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWhatsAppShare = async (id) => {
    try {
      const res = await apiFetch(`/api/bills/${id}/whatsapp`);
      const data = await res.json();
      if (res.ok && data.link) {
        window.open(data.link, '_blank');
      } else {
        alert('Could not generate WhatsApp share link.');
      }
    } catch (err) {
      console.error(err);
      alert('Error sharing via WhatsApp.');
    }
  };

  // CSV Exporter (Excel compatible)
  const handleExportCSV = () => {
    if (bills.length === 0) {
      alert('No data available to export.');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM for Excel to render Telugu/Unicode correctly
    csv += 'Bill Number,Date,Farmer Name,Village,Mobile,Mode,Bags,Extra KGs,Gross Total (Rs),Deductions (Rs),Advance (Rs),Net Payable (Rs)\n';
    
    bills.forEach(b => {
      const dateStr = new Date(b.date_time).toLocaleDateString('en-IN');
      const deductions = (b.cc_deduction + b.hamali).toFixed(2);
      csv += `"${b.bill_number}","${dateStr}","${b.farmer.name}","${b.farmer.village}","${b.farmer.phone}","${b.billing_mode}",${b.bags},${b.extra_kgs},${b.gross_total.toFixed(2)},${deductions},${b.advance_paid.toFixed(2)},${b.net_payable.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `paddy_bill_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const liveCalculation = () => {
    const b = Math.max(0, parseInt(bags) || 0);
    const ex = Math.max(0, parseFloat(extraKgs) || 0);
    const r = Math.max(0, parseFloat(inputRate) || 0);
    const adv = Math.max(0, parseFloat(advancePaid) || 0);

    let adjustedRate = 0;
    let costPerKg = 0;
    let bagsAmount = 0;
    let extraAmount = 0;

    if (billingMode === '75KG') {
      adjustedRate = r * 68 / 75;
      costPerKg = r / 75;
      bagsAmount = adjustedRate * b;
      extraAmount = costPerKg * ex;
    } else { // 100KG
      adjustedRate = r;
      costPerKg = r / 100;
      bagsAmount = b * 68 * costPerKg;
      extraAmount = ex * costPerKg;
    }

    const grossTotal = bagsAmount + extraAmount;
    const ccDeduction = ccDeductionApplied ? grossTotal * 0.01 : 0;
    const hamali = b * 5.0;
    const netPayable = grossTotal - ccDeduction - hamali - adv;

    return {
      grossTotal: grossTotal.toFixed(2),
      ccDeduction: ccDeduction.toFixed(2),
      hamali: hamali.toFixed(2),
      netPayable: netPayable.toFixed(2)
    };
  };

  const live = liveCalculation();

  const canEdit = user?.role === 'admin' || user?.role === 'staff';
  const canDelete = user?.role === 'admin';

  return (
    <div>
      <div className="paddy-banner">
        <div className="paddy-banner-text">
          <h1>Paddy Bill History</h1>
          <p>Query, print, edit, or share previous agricultural acquisitions bills</p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-primary">
          <Download size={18} />
          <span>Export to Excel</span>
        </button>
      </div>

      {success && <div className="alert-banner alert-success">{success}</div>}
      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Advanced Filter Panel */}
      <div className="card filter-panel mb-2">
        <form onSubmit={handleSearchSubmit} className="filter-form">
          <div className="form-group flex-1">
            <label className="form-label">Search Query</label>
            <div className="search-input-container">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Bill number, farmer name, mobile or village..."
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

      {/* Bills Table */}
      {loading ? (
        <div className="loading-container"><h3>Loading bills directory...</h3></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th>Farmer Name</th>
                <th>Village</th>
                <th>Bags</th>
                <th>Gross Total</th>
                <th>Deductions</th>
                <th>Advance</th>
                <th>Net Payable</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length > 0 ? (
                bills.map((bill) => {
                  const deductions = bill.cc_deduction + bill.hamali;
                  return (
                    <tr key={bill.id}>
                      <td className="bold-text">{bill.bill_number}</td>
                      <td>{new Date(bill.date_time).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div className="farmer-cell">
                          <strong>{bill.farmer.name}</strong>
                          <span className="small-text">{bill.farmer.phone}</span>
                        </div>
                      </td>
                      <td>{bill.farmer.village}</td>
                      <td>{bill.bags} ({bill.billing_mode})</td>
                      <td>₹ {bill.gross_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="text-danger">₹ -{deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="text-danger">₹ -{bill.advance_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="net-payable-column">₹ {bill.net_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <div className="actions-cell">
                          <a 
                            href={`${API_URL}/api/bills/${bill.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-icon"
                            title="Print / View PDF"
                          >
                            <Printer size={16} />
                          </a>
                          <button 
                            onClick={() => handleWhatsAppShare(bill.id)}
                            className="btn btn-success btn-icon"
                            title="Resend WhatsApp"
                          >
                            <Send size={16} />
                          </button>
                          {canEdit && (
                            <button 
                              onClick={() => handleOpenEdit(bill)}
                              className="btn btn-secondary btn-icon"
                              title="Edit Bill"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => handleDeleteBill(bill.id)}
                              className="btn btn-danger btn-icon"
                              title="Delete Bill"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="text-center">No paddy bills found. Clear filters or add a new bill.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content edit-bill-modal">
            <div className="modal-header">
              <h2>Edit Bill Details ({editingBill.bill_number})</h2>
              <button className="modal-close" onClick={() => setEditModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Billing Mode</label>
                  <select 
                    value={billingMode}
                    onChange={(e) => setBillingMode(e.target.value)}
                  >
                    <option value="75KG">75 KG Mode</option>
                    <option value="100KG">100 KG Mode</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Input Rate (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={inputRate}
                    onChange={(e) => setInputRate(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Bags Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={bags}
                    onChange={(e) => setBags(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Extra KGs</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={extraKgs}
                    onChange={(e) => setExtraKgs(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Advance Paid (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bill Language</label>
                  <select 
                    value={receiptLang}
                    onChange={(e) => setReceiptLang(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="te">Telugu</option>
                    <option value="both">English + Telugu</option>
                  </select>
                </div>
              </div>

              <div className="form-group checkbox-wrapper">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={ccDeductionApplied}
                    onChange={(e) => setCcDeductionApplied(e.target.checked)}
                  />
                  <span>Apply CC Deduction (1%)</span>
                </label>
              </div>

              {/* Edit Calculations Preview */}
              <div className="edit-calc-preview">
                <div className="preview-row"><span>Gross Total:</span><strong>₹ {live.grossTotal}</strong></div>
                <div className="preview-row"><span>CC (1%):</span><strong>₹ {live.ccDeduction}</strong></div>
                <div className="preview-row"><span>Hamali (₹5/Bag):</span><strong>₹ {live.hamali}</strong></div>
                <div className="preview-row"><span>Advance Paid:</span><strong>₹ {advancePaid}</strong></div>
                <div className="preview-row net-payable-row"><span>Net Payable:</span><strong>₹ {live.netPayable}</strong></div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
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

        .farmer-cell {
          display: flex;
          flex-direction: column;
        }

        .net-payable-column {
          font-weight: 700;
          color: var(--text-gold);
        }

        .edit-bill-modal {
          max-width: 500px;
        }

        .edit-calc-preview {
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-top: 1.25rem;
        }

        .preview-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }

        .net-payable-row {
          border-top: 1px dashed var(--border-gold);
          padding-top: 0.4rem;
          margin-top: 0.4rem;
          font-size: 1rem;
          color: var(--text-gold);
        }

        .actions-cell {
          display: flex;
          gap: 0.4rem;
        }

        .btn-success {
          background-color: #25d366;
          color: #fff;
          border: 1px solid #1ebe57;
        }

        .btn-success:hover {
          background-color: #128c7e;
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

export default BillHistory;
