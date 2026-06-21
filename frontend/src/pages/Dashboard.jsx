import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Receipt, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CalendarDays, 
  TrendingUp,
  Sprout
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { apiFetch } = useAuth();
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sumRes, chartRes] = await Promise.all([
          apiFetch('/api/reports/summary'),
          apiFetch('/api/reports/charts')
        ]);
        
        const sumData = await sumRes.json();
        const chartData = await chartRes.json();
        
        setSummary(sumData);
        setCharts(chartData);
      } catch (err) {
        setError('Failed to fetch dashboard data. Make sure backend is running.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-container"><h2>Loading dashboard...</h2></div>;
  }

  if (error) {
    return <div className="error-container"><p>{error}</p></div>;
  }

  // Cards layout configurations
  const cardConfigs = [
    { title: 'Total Farmers', value: summary.total_farmers, icon: Users, color: '#29b6f6' },
    { title: 'Total Bills Issued', value: summary.total_bills, icon: Receipt, color: '#ffca28' },
    { title: 'Total Bags Purchased', value: `${summary.total_bags} Bags`, icon: Package, color: '#66bb6a' },
    { title: 'Today Billing Total', value: `₹${summary.today_billing_total.toLocaleString('en-IN')}`, icon: CalendarDays, color: '#d4af37' },
    { title: 'Total Paid to Farmers', value: `₹${summary.total_amount_paid.toLocaleString('en-IN')}`, icon: ArrowUpRight, color: '#ef5350' },
    { title: 'Total Received from Mill', value: `₹${summary.total_amount_received.toLocaleString('en-IN')}`, icon: ArrowDownRight, color: '#66bb6a' },
    { title: 'Current Office Balance', value: `₹${summary.office_balance.toLocaleString('en-IN')}`, icon: Wallet, color: '#d4af37' },
    { title: 'Monthly Billing Total', value: `₹${summary.monthly_billing_total.toLocaleString('en-IN')}`, icon: TrendingUp, color: '#4caf50' }
  ];

  // Pie Chart Colors
  const COLORS = ['#2e7d32', '#d4af37', '#66bb6a', '#c5a880', '#1b5e20'];

  return (
    <div>
      {/* Paddy Header Banner */}
      <div className="paddy-banner">
        <div className="paddy-banner-text">
          <h1>Sri Sai Lakshmi Office</h1>
          <p>Paddy Billing System & Mill Ledger Management Dashboard</p>
        </div>
        <div className="banner-badge">
          <Sprout size={36} className="pulse-icon" />
          <span>AGRI ENGINE ACTIVE</span>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-4 mb-2">
        {cardConfigs.map((card, idx) => (
          <div className="card stat-card" key={idx}>
            <div className="stat-icon-wrapper" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
              <card.icon size={24} />
            </div>
            <div className="stat-data">
              <h3>{card.value}</h3>
              <p>{card.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-2">
        {/* Monthly Purchases (Bags) */}
        <div className="card chart-card">
          <h4>Monthly Paddy Purchases (Bags)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts.monthly_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#8da390" />
                <YAxis stroke="#8da390" />
                <Tooltip contentStyle={{ backgroundColor: '#122115', border: '1px solid #c5a880' }} />
                <Legend />
                <Line type="monotone" dataKey="bags" name="Bags Purchased" stroke="#66bb6a" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Payments (Outflow to farmers vs Inflow from Mill) */}
        <div className="card chart-card">
          <h4>Monthly Cash Ledger (INR)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.monthly_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#8da390" />
                <YAxis stroke="#8da390" />
                <Tooltip contentStyle={{ backgroundColor: '#122115', border: '1px solid #c5a880' }} />
                <Legend />
                <Bar dataKey="paid" name="Paid to Farmers" fill="#ef5350" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Received from Mill" fill="#66bb6a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Farmer-wise Purchases */}
        <div className="card chart-card">
          <h4>Top Farmers (By Bags Purchased)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.farmer_chart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis type="number" stroke="#8da390" />
                <YAxis dataKey="farmer_name" type="category" stroke="#8da390" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#122115', border: '1px solid #c5a880' }} />
                <Legend />
                <Bar dataKey="bags" name="Bags" fill="#d4af37" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Village-wise Purchases */}
        <div className="card chart-card">
          <h4>Village-wise Purchases Distribution</h4>
          <div className="chart-wrapper flex-center">
            {charts.village_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={charts.village_chart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="bags"
                    nameKey="village"
                    label={({ village, percent }) => `${village} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {charts.village_chart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#122115', border: '1px solid #c5a880' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p>No village purchase data available.</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .loading-container, .error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 70vh;
        }

        .error-container p {
          color: var(--danger);
          font-weight: 600;
          font-size: 1.2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem;
        }

        .stat-icon-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
        }

        .stat-data h3 {
          font-size: 1.45rem;
          margin-bottom: 0.15rem;
          color: var(--text-white);
        }

        .stat-data p {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chart-card {
          padding: 1.5rem;
        }

        .chart-card h4 {
          margin-bottom: 1.25rem;
          font-size: 1.05rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-muted);
          padding-bottom: 0.5rem;
        }

        .chart-wrapper {
          width: 100%;
        }

        .flex-center {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .mb-2 {
          margin-bottom: 1.5rem;
        }

        .pulse-icon {
          animation: pulse 2s infinite alternate;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; color: var(--text-gold); }
          100% { transform: scale(1.15); opacity: 1; color: var(--success); }
        }

        .banner-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.03);
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-muted);
        }

        .banner-badge span {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-gold);
          letter-spacing: 0.08em;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
