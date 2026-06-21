import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { FileText, Printer, Send, Sprout, PlusCircle, Check } from 'lucide-react';

const NewBilling = () => {
  const { apiFetch } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  
  // Form fields
  const [billingMode, setBillingMode] = useState('75KG');
  const [bags, setBags] = useState(0);
  const [extraKgs, setExtraKgs] = useState(0);
  const [inputRate, setInputRate] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [ccDeductionApplied, setCcDeductionApplied] = useState(false);
  const [receiptLang, setReceiptLang] = useState('en');

  // State after bill is saved
  const [savedBill, setSavedBill] = useState(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch farmers for dropdown
  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        const res = await apiFetch('/api/farmers');
        const data = await res.json();
        setFarmers(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFarmers();
  }, []);

  const selectedFarmer = farmers.find(f => f.id === parseInt(selectedFarmerId));

  // Live calculation values
  const calculateLiveValues = () => {
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
      adjustedRate: adjustedRate.toFixed(2),
      costPerKg: costPerKg.toFixed(4),
      bagsAmount: bagsAmount.toFixed(2),
      extraAmount: extraAmount.toFixed(2),
      grossTotal: grossTotal.toFixed(2),
      ccDeduction: ccDeduction.toFixed(2),
      hamali: hamali.toFixed(2),
      netPayable: netPayable.toFixed(2)
    };
  };

  const live = calculateLiveValues();

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!selectedFarmerId) {
      setError('Please select a farmer.');
      setLoading(false);
      return;
    }

    const payload = {
      farmer_id: parseInt(selectedFarmerId),
      billing_mode: billingMode,
      bags: parseInt(bags) || 0,
      extra_kgs: parseFloat(extraKgs) || 0,
      input_rate: parseFloat(inputRate) || 0,
      advance_paid: parseFloat(advancePaid) || 0,
      cc_deduction: ccDeductionApplied,
      language: receiptLang
    };

    try {
      const res = await apiFetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create bill');
      }

      setSavedBill(data);
      setSuccess(`Bill ${data.bill_number} generated successfully!`);
      
      // Fetch WhatsApp link
      const waRes = await apiFetch(`/api/bills/${data.id}/whatsapp`);
      if (waRes.ok) {
        const waData = await waRes.json();
        setWhatsappLink(waData.link);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSavedBill(null);
    setSelectedFarmerId('');
    setBags(0);
    setExtraKgs(0);
    setInputRate(0);
    setAdvancePaid(0);
    setCcDeductionApplied(false);
    setReceiptLang('en');
    setSuccess('');
    setError('');
  };

  return (
    <div>
      <div className="paddy-banner">
        <div className="paddy-banner-text">
          <h1>Paddy Billing Terminal</h1>
          <p>Create purchases bills, calculate deductions, and print receipts</p>
        </div>
        {savedBill && (
          <button onClick={resetForm} className="btn btn-primary">
            <PlusCircle size={18} />
            <span>New Bill</span>
          </button>
        )}
      </div>

      {success && <div className="alert-banner alert-success">{success}</div>}
      {error && <div className="alert-banner alert-danger">{error}</div>}

      {!savedBill ? (
        <div className="grid grid-2">
          {/* Billing Inputs Form */}
          <div className="card">
            <h3 className="section-title">Bill Calculator</h3>
            <form onSubmit={handleGenerateBill}>
              
              <div className="form-group">
                <label className="form-label">Select Farmer *</label>
                <select 
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(e.target.value)}
                  required
                >
                  <option value="">-- Search / Choose Farmer --</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.village}) - {f.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFarmer && (
                <div className="farmer-info-subcard">
                  <div className="info-item">
                    <span>Village:</span>
                    <strong>{selectedFarmer.village}</strong>
                  </div>
                  <div className="info-item">
                    <span>Mobile:</span>
                    <strong>{selectedFarmer.phone}</strong>
                  </div>
                </div>
              )}

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Billing Mode *</label>
                  <select 
                    value={billingMode}
                    onChange={(e) => setBillingMode(e.target.value)}
                  >
                    <option value="75KG">75 KG Mode</option>
                    <option value="100KG">100 KG Mode</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Input Rate (Rs) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={inputRate || ''}
                    onChange={(e) => setInputRate(parseFloat(e.target.value) || 0)}
                    placeholder="Rate per bag/quintal"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Number of Bags *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={bags || ''}
                    onChange={(e) => setBags(parseInt(e.target.value) || 0)}
                    placeholder="No. of bags"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Extra KGs</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={extraKgs || ''}
                    onChange={(e) => setExtraKgs(parseFloat(e.target.value) || 0)}
                    placeholder="Extra KGs weight"
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
                    value={advancePaid || ''}
                    onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                    placeholder="Previous advance"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Receipt Language</label>
                  <select 
                    value={receiptLang}
                    onChange={(e) => setReceiptLang(e.target.value)}
                  >
                    <option value="en">English Only</option>
                    <option value="te">Telugu Only</option>
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
                  <span>Apply CC Deduction (1% of Gross)</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="btn btn-gold w-100" 
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Generate and Save Bill'}
              </button>
            </form>
          </div>

          {/* Live Preview Box */}
          <div className="card preview-card">
            <h3 className="section-title">Live Calculations Preview</h3>
            
            <div className="preview-receipt">
              <div className="receipt-header">
                <h2>SRI SAI LAKSHMI OFFICE</h2>
                <p>Paddy Bill Preview</p>
              </div>

              <div className="receipt-body">
                <div className="receipt-row font-bold">
                  <span>Billing Mode:</span>
                  <span>{billingMode === '75KG' ? '75 KG Mode' : '100 KG Mode'}</span>
                </div>
                <div className="receipt-row">
                  <span>Rate:</span>
                  <span>₹ {inputRate} / {billingMode === '75KG' ? '75KG' : '100KG'}</span>
                </div>
                <div className="receipt-row">
                  <span>Calculated Cost/KG:</span>
                  <span>₹ {live.costPerKg}</span>
                </div>
                {billingMode === '75KG' && (
                  <div className="receipt-row">
                    <span>Adjusted Rate (68KG):</span>
                    <span>₹ {live.adjustedRate}</span>
                  </div>
                )}
                <hr className="receipt-divider" />
                <div className="receipt-row">
                  <span>Bags Amount ({bags} Bags × 68KG Net):</span>
                  <span>₹ {live.bagsAmount}</span>
                </div>
                <div className="receipt-row">
                  <span>Extra KGs Amount ({extraKgs} KGs):</span>
                  <span>₹ {live.extraAmount}</span>
                </div>
                <hr className="receipt-divider" />
                <div className="receipt-row font-bold text-gold">
                  <span>Gross Total Amount:</span>
                  <span>₹ {live.grossTotal}</span>
                </div>
                <div className="receipt-row text-danger">
                  <span>(-) CC Deduction (1%):</span>
                  <span>₹ {live.ccDeduction}</span>
                </div>
                <div className="receipt-row text-danger">
                  <span>(-) Hamali Charges (₹5/Bag):</span>
                  <span>₹ {live.hamali}</span>
                </div>
                <div className="receipt-row text-danger">
                  <span>(-) Advance Paid:</span>
                  <span>₹ {advancePaid}</span>
                </div>
                <hr className="receipt-divider double" />
                <div className="receipt-row net-row">
                  <span>NET PAYABLE TO FARMER:</span>
                  <span>₹ {live.netPayable}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Bill Saved Actions Dashboard */
        <div className="card saved-bill-actions">
          <div className="success-icon-wrapper">
            <Check size={48} />
          </div>
          <h2>Bill Generated Successfully!</h2>
          <p className="bill-num-desc">Bill Number: <strong>{savedBill.bill_number}</strong></p>
          
          <div className="action-buttons-group">
            <a 
              href={`${API_URL}/api/bills/${savedBill.id}/pdf?lang=${receiptLang}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-gold"
            >
              <Printer size={20} />
              <span>Print / Download PDF Receipt</span>
            </a>

            {whatsappLink && (
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-success"
              >
                <Send size={20} />
                <span>Send Bill on WhatsApp</span>
              </a>
            )}
            
            <button onClick={resetForm} className="btn btn-secondary">
              <span>Start Next Bill</span>
            </button>
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

        .farmer-info-subcard {
          display: flex;
          gap: 1.5rem;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-muted);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          margin-bottom: 1.25rem;
        }

        .info-item span {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-right: 0.5rem;
        }

        .checkbox-wrapper {
          margin-top: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .preview-card {
          background-color: #070c08;
          border-color: var(--border-gold);
        }

        .preview-receipt {
          background-color: #0c140e;
          border: 1px dashed var(--border-gold);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          font-family: monospace;
          color: #e0e0e0;
        }

        .receipt-header {
          text-align: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 0.75rem;
        }

        .receipt-header h2 {
          font-size: 1.1rem;
          color: var(--text-white);
        }

        .receipt-header p {
          font-size: 0.75rem;
          color: var(--text-gold);
        }

        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
        }

        .font-bold {
          font-weight: bold;
          color: #fff;
        }

        .receipt-divider {
          border: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 0.75rem 0;
        }

        .receipt-divider.double {
          border-top: 3px double rgba(212, 175, 55, 0.5);
        }

        .net-row {
          font-size: 1.05rem;
          font-weight: bold;
          color: var(--text-gold);
        }

        .text-danger {
          color: #ef5350;
        }

        .text-success {
          color: #66bb6a;
        }

        .w-100 {
          width: 100%;
        }

        .saved-bill-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem;
          text-align: center;
        }

        .success-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(102, 187, 106, 0.15);
          color: var(--success);
          display: flex;
          justify-content: center;
          align-items: center;
          border: 2px solid var(--success);
          margin-bottom: 1.5rem;
        }

        .bill-num-desc {
          font-size: 1.1rem;
          margin-top: 0.5rem;
          margin-bottom: 2rem;
        }

        .action-buttons-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 320px;
        }

        .btn-success {
          background-color: #25d366;
          color: #fff;
          border: 1px solid #1ebe57;
        }
        .btn-success:hover {
          background-color: #128c7e;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
        }
      `}</style>
    </div>
  );
};

export default NewBilling;
