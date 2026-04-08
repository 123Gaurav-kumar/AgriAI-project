/**
 * Dashboard Page
 * ─────────────────────────────────────────────────────────────
 * Main overview with:
 * - Stats cards (total scans, diseases found, healthy crops)
 * - Recent detections list
 * - Disease trend chart
 * - Quick action to start new detection
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>
    {status === 'healthy' && '✓ '}
    {status === 'diseased' && '✗ '}
    {status === 'stressed' && '⚠ '}
    {status === 'uncertain' && '? '}
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        api.get('/history/stats'),
        api.get('/history/recent')
      ]);
      setStats(statsRes.data.data);
      setRecentDetections(recentRes.data.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Dashboard — AgriAI';
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Chart Data ──────────────────────────────────────────────
  const chartData = stats?.monthlyTrend
    ? {
        labels: stats.monthlyTrend.map(m => {
          const [year, month] = m.label.split('-');
          return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
        }),
        datasets: [{
          label: 'Detections',
          data: stats.monthlyTrend.map(m => m.count),
          backgroundColor: 'rgba(76, 175, 80, 0.5)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 2,
          borderRadius: 6,
        }]
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1c2e1c',
        borderColor: '#2a3d2a',
        borderWidth: 1,
        titleColor: '#e8f5e9',
        bodyColor: '#a5c8a5',
        callbacks: {
          label: ctx => ` ${ctx.parsed.y} detection${ctx.parsed.y !== 1 ? 's' : ''}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(42,61,42,0.5)' },
        ticks: { color: '#6a8f6a', font: { size: 12 } }
      },
      y: {
        grid: { color: 'rgba(42,61,42,0.5)' },
        ticks: { color: '#6a8f6a', stepSize: 1 },
        beginAtZero: true
      }
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loader-spinner"></div>
      </div>
    );
  }

  const overview = stats?.overview || {};
  const diseaseRate = overview.diseaseRate || 0;

  return (
    <div className="dashboard fade-in">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">
            Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">
            Here's an overview of your crop health monitoring
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/detect')}>
          + New Detection
        </button>
      </div>

      {/* ── Stats Grid ───────────────────────────────────────── */}
      <div className="grid-4 stagger" style={{ marginBottom: 24 }}>
        <div className="stat-card fade-in">
          <div className="stat-icon" style={{ color: '#42a5f5' }}>📊</div>
          <div className="stat-number">{overview.total || 0}</div>
          <div className="stat-label">Total Scans</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon" style={{ color: 'var(--green-primary)' }}>✅</div>
          <div className="stat-number" style={{ color: 'var(--green-primary)' }}>{overview.healthy || 0}</div>
          <div className="stat-label">Healthy Crops</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon" style={{ color: 'var(--red)' }}>🦠</div>
          <div className="stat-number" style={{ color: 'var(--red)' }}>{overview.diseased || 0}</div>
          <div className="stat-label">Diseases Found</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon" style={{ color: 'var(--amber)' }}>📈</div>
          <div className="stat-number" style={{ color: diseaseRate > 50 ? 'var(--red)' : 'var(--amber)' }}>
            {diseaseRate}%
          </div>
          <div className="stat-label">Disease Rate</div>
        </div>
      </div>

      {/* ── Main Content Grid ─────────────────────────────────── */}
      <div className="dashboard-grid">

        {/* Monthly Trend Chart */}
        <div className="card dashboard-chart-card fade-in">
          <div className="card-header">
            <h3 className="card-title">Monthly Detection Trend</h3>
            <span className="card-subtitle">Last 6 months</span>
          </div>
          <div className="chart-container">
            {chartData && chartData.labels.length > 0 ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📈</div>
                <p className="empty-title">No data yet</p>
                <p className="empty-text">Start scanning crops to see trends</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="dashboard-sidebar">

          {/* Recent Detections */}
          <div className="card fade-in">
            <div className="card-header">
              <h3 className="card-title">Recent Detections</h3>
              <Link to="/history" className="card-link">View all →</Link>
            </div>

            {recentDetections.length > 0 ? (
              <div className="recent-list">
                {recentDetections.map(d => (
                  <Link
                    key={d._id}
                    to={`/result/${d._id}`}
                    className="recent-item"
                  >
                    <div className="recent-image">
                      {d.image?.url ? (
                        <img src={d.image.url} alt={d.crop.name} />
                      ) : (
                        <span>🌿</span>
                      )}
                    </div>
                    <div className="recent-info">
                      <p className="recent-crop">{d.crop.name}</p>
                      <p className="recent-disease">
                        {d.analysis.primaryDisease || 'No disease found'}
                      </p>
                    </div>
                    <StatusBadge status={d.analysis.overallStatus} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-icon">🔬</div>
                <p className="empty-title">No detections yet</p>
                <Link to="/detect" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                  Scan First Crop
                </Link>
              </div>
            )}
          </div>

          {/* Top Diseases */}
          {stats?.topDiseases?.length > 0 && (
            <div className="card fade-in">
              <div className="card-header">
                <h3 className="card-title">Top Diseases Detected</h3>
              </div>
              <div className="disease-list">
                {stats.topDiseases.slice(0, 5).map((d, i) => (
                  <div key={d.name} className="disease-item">
                    <span className="disease-rank">{i + 1}</span>
                    <span className="disease-name">{d.name}</span>
                    <span className="disease-count">{d.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action */}
          <div className="card detect-cta-card fade-in">
            <div className="cta-icon">🔬</div>
            <h3 className="cta-title">Detect Now</h3>
            <p className="cta-text">Upload a crop photo and get AI diagnosis in seconds</p>
            <Link to="/detect" className="btn btn-primary w-full">
              Start Detection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default DashboardPage;