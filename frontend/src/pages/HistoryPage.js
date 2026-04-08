/**
 * History Page — Detection History with Filters
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './HistoryPage.css';

const STATUSES = ['all', 'diseased', 'healthy', 'stressed', 'uncertain'];

const HistoryPage = () => {
  const [detections, setDetections] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', page: 1 });
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: filters.page, limit: 10 });
      if (filters.status !== 'all') params.append('status', filters.status);
      const { data } = await api.get(`/history?${params}`);
      setDetections(data.data.detections);
      setPagination(data.data.pagination);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    document.title = 'Detection History — AgriAI';
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this detection record?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/detect/${id}`);
      toast.success('Detection deleted');
      fetchHistory();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="history-page fade-in">
      <div className="page-header history-header">
        <div>
          <h1 className="page-title">Detection History</h1>
          <p className="page-subtitle">Review all your past crop disease analyses</p>
        </div>
        <Link to="/detect" className="btn btn-primary">+ New Detection</Link>
      </div>

      {/* Status Filter */}
      <div className="status-filters">
        {STATUSES.map(s => (
          <button
            key={s}
            className={`status-filter-btn ${filters.status === s ? 'status-filter-btn--active' : ''} ${s !== 'all' ? `status-filter-btn--${s}` : ''}`}
            onClick={() => setFilter('status', s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="history-loading"><div className="loader-spinner"></div></div>
      ) : detections.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🔬</div>
          <p className="empty-title">No detections found</p>
          <p className="empty-text">
            {filters.status !== 'all'
              ? `No ${filters.status} crops found. Try a different filter.`
              : 'Upload your first crop image to get started.'}
          </p>
          <Link to="/detect" className="btn btn-primary" style={{ marginTop: 12 }}>
            Start Detection
          </Link>
        </div>
      ) : (
        <>
          <div className="history-list">
            {detections.map(d => (
              <div key={d._id} className="history-item card">
                <div className="history-item-image">
                  {d.image?.url ? (
                    <img src={d.image.url} alt={d.crop.name} />
                  ) : (
                    <span>🌿</span>
                  )}
                </div>

                <div className="history-item-main">
                  <div className="history-item-header">
                    <h3 className="history-crop">{d.crop.name}</h3>
                    <span className={`badge badge-${d.analysis.overallStatus}`}>
                      {d.analysis.overallStatus}
                    </span>
                  </div>
                  <p className="history-disease">
                    {d.analysis.primaryDisease || 'No disease detected'}
                  </p>
                  <div className="history-meta">
                    <span>📅 {new Date(d.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}</span>
                    <span>🎯 {d.analysis.overallConfidence}% confidence</span>
                    {d.crop.growthStage !== 'unknown' && (
                      <span>🌱 {d.crop.growthStage}</span>
                    )}
                  </div>
                </div>

                <div className="history-item-actions">
                  <Link to={`/result/${d._id}`} className="btn btn-secondary btn-sm">
                    View Report
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(d._id)}
                    disabled={deletingId === d._id}
                  >
                    {deletingId === d._id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={filters.page === 1}
                onClick={() => setFilter('page', filters.page - 1)}
              >
                ← Prev
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.pages}
                <span className="total-count"> ({pagination.total} total)</span>
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={!pagination.hasMore}
                onClick={() => setFilter('page', filters.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HistoryPage;