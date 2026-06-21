import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { FileText, Download, Calendar, Search } from 'lucide-react';

const Reports = () => {
  const { apiFetch } = useAuth();
  const [reportType, setReportType] = useState('daily');
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Unique villages for dropdown
  const [villages, setVillages] = useState([]);

  // Report results
  const [summary, setSummary] = useState(null);
  const [bills, setBills] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch farmers and villages
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const res = await apiFetch('/api/farmers');
        if (res.ok) {
          const data = await res.json();
          setFarmers(data);
          // Extract unique villages
          const uniqueVillages = [...new Set(data.map(f => f.village))].filter(Boolean);
          setVillages(uniqueVillages);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadFiltersData();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setError('');
    setSummary(null);
    setBills([]);
    setLedger([]);
    setLoading(true);

    if (reportType === 'farmer' && !selectedFarmerId) {
      setError('Please select a farmer for the farmer report.');
      setLoading(false);
      return;
    }

    if (reportType === 'village' && !selectedVillage) {
      setError('Please select a village for the village report.');
      setLoading(false);
      return;
    }

    // Build URL query parameters
    const params = [`report_type=${reportType}`];
    if (selectedFarmerId) params.push(`farmer_id=${selectedFarmerId}`);
    if (selectedVillage) params.push(`village=${encodeURIComponent(selectedVillage)}`);
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);

    try {
      const res = await apiFetch(`/api/reports/generate?${params.join('&')}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to generate report');
      }

      const data = await res.json();
      setSummary(data.summary);
      setBills(data.bills);
      setLedger(data.ledger);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get download link for Excel
  const getExcelDownloadLink = () => {
    const params = [`report_type=${reportType}`, 'export=true'];
    if (selectedFarmerId) params.push(`farmer_id=${selectedFarmerId}`);
    if (selectedVillage) params.push(`village=${encodeURIComponent(selectedVillage)}`);
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    
    return `${API_URL}/api/reports/generate?${params.join('&')}`;
  };

  return (
    <div>
      <div className="paddy-banner">
        <div className="paddy-banner-text">
          <h1>Report Generator</h1>
          <p>Generate detailed audit reports, aggregates, and export spreadsheets</p>
        </div>
        {summary && (
          <a href={getExcelDownloadLink()} className="btn btn-gold" download>
            <Download size={18} />
            <span>Export Report to Excel</span>
          </a>
        )}
      </div>

      {error && <div className="alert-banner alert-danger">{error}</div>}

      {/* Filter Control Box */}
      <div className="card mb-2">
        <h3 className="section-title">Report Specifications</h3>
        <form onSubmit={handleGenerateReport} className="report-form">
          <div className="grid grid-4">
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select 
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  // Reset specifics on type change
                  setSelectedFarmerId('');
                  setSelectedVillage('');
                }}
              >
                <option value="daily">Daily Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="yearly">Yearly Report</option>
                <option value="farmer">Farmer-wise Report</option>
                <option value="village">Village-wise Report</option>
              </select>
            </div>

            {reportType === 'farmer' && (
              <div className="form-group">
                <label className="form-label">Farmer Selection *</label>
                <select 
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Farmer --</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'village' && (
              <div className="form-group">
                <label className="form-label">Village Selection *</label>
                <select 
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  required
                >
                  <option value="">-- Choose Village --</option>
                  {villages.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-gold" disabled={loading}>
            {loading ? 'Compiling Report...' : 'Generate Report'}
          </button>
        </form>
      </div>

      {/* Report Summary Cards */}
      {summary && (
        <div className="report-results">
          
          <div className="grid grid-3 mb-2">
            <div className="card report-stat">
              <p>Total Bags Acquired</p>
              <h2>{summary.total_bags} Bags</h2>
            </div>
            
            <div className="card report-stat">
              <p>Gross Amount (Farmers Cost)</p>
              <h2>₹ {summary.total_gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
            </div>

            <div className="card report-stat">
              <p>Total Deductions (CC + Hamali)</p>
              <h2 className="text-danger">₹ {summary.total_deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
            </div>

            <div className="card report-stat">
              <p>Net Amount Paid to Farmers</p>
              <h2>₹ {summary.total_net_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
            </div>

            <div className="card report-stat">
              <p>Total Mill Received Payments</p>
              <h2 className="text-success">₹ {summary.total_mill_received.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
            </div>

            <div className="card report-stat">
              <p>Current Office Balance</p>
              <h2 className={summary.office_balance >= 0 ? 'text-success' : 'text-danger'}>
                ₹ {summary.office_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          {/* Details Tables */}
          <div className="grid grid-1">
            <div className="card">
              <h3 className="section-title">Paddy Purchase Ledger Details</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Bill No</th>
                      <th>Date</th>
                      <th>Farmer</th>
                      <th>Village</th>
                      <th>Bags</th>
                      <th>Gross Total</th>
                      <th>Deductions</th>
                      <th>Net Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.length > 0 ? (
                      bills.map((b, idx) => (
                        <tr key={idx}>
                          <td className="bold-text">{b.bill_number}</td>
                          <td>{new Date(b.date).toLocaleDateString('en-IN')}</td>
                          <td>{b.farmer_name}</td>
                          <td>{b.village}</td>
                          <td>{b.bags}</td>
                          <td>₹ {b.gross_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="text-danger">₹ {b.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="bold-text">₹ {b.net_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">No purchases recorded in this report criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {reportType !== 'farmer' && reportType !== 'village' && (
              <div className="card">
                <h3 className="section-title">Mill Inflow Payments Details</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>UTR Reference</th>
                        <th>Amount Received</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.length > 0 ? (
                        ledger.map((l, idx) => (
                          <tr key={idx}>
                            <td>{new Date(l.date).toLocaleString('en-IN')}</td>
                            <td className="bold-text">{l.reference}</td>
                            <td className="text-success bold-text">₹ {l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td>{l.notes || <span className="text-muted">None</span>}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center">No mill payments recorded in this report criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      <style>{`
        .section-title {
          font-size: 1.15rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-muted);
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .report-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .report-stat {
          padding: 1.25rem;
        }

        .report-stat p {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .report-stat h2 {
          font-size: 1.45rem;
          color: var(--text-white);
        }

        .bold-text {
          font-weight: 600;
        }

        .text-success { color: var(--success); }
        .text-danger { color: var(--danger); }
        
        .mb-2 {
          margin-bottom: 1.5rem;
        }
        
        .text-center {
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default Reports;
