/**
 * Result Page — Full AI Detection Report
 * ─────────────────────────────────────────────────────────────
 * Displays the complete analysis result including:
 * - Crop image + overall status
 * - Confidence gauge
 * - Diseases found with severity
 * - Treatment recommendations (tabbed: chemical / biological)
 * - Prevention tips
 * - User notes & feedback
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './ResultPage.css';

const SEVERITY_COLORS = {
  none:     { color: 'var(--green-primary)', bg: 'rgba(76,175,80,0.12)' },
  mild:     { color: 'var(--amber)',         bg: 'rgba(255,193,7,0.12)' },
  moderate: { color: '#ff7043',             bg: 'rgba(255,112,67,0.12)' },
  severe:   { color: 'var(--red)',           bg: 'rgba(239,83,80,0.12)' },
  critical: { color: '#b71c1c',             bg: 'rgba(183,28,28,0.12)' },
};

const TREATMENT_TYPE_ICONS = {
  chemical:   { icon: '🧪', label: 'Chemical' },
  biological: { icon: '🌿', label: 'Biological' },
  cultural:   { icon: '🔧', label: 'Cultural' },
  preventive: { icon: '🛡️', label: 'Preventive' },
};

const URGENCY_BADGES = {
  immediate:    { text: 'Urgent',    style: { background: 'rgba(239,83,80,0.15)', color: 'var(--red)' } },
  within_week:  { text: 'This Week', style: { background: 'var(--amber-glow)',    color: 'var(--amber)' } },
  preventive:   { text: 'Preventive', style: { background: 'var(--green-glow)',   color: 'var(--green-primary)' } },
};

const ResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detection, setDetection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchDetection = useCallback(async () => {
    try {
      const { data } = await api.get(`/detect/${id}`);
      setDetection(data.data);
      setNotes(data.data.userNotes || '');
      setFeedback(data.data.feedback?.isHelpful);
    } catch (err) {
      toast.error('Detection not found');
      navigate('/history');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    document.title = 'Detection Result — AgriAI';
    fetchDetection();
  }, [fetchDetection]);

  const saveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await api.patch(`/detect/${id}/notes`, { notes });
      toast.success('Notes saved!');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const submitFeedback = async (isHelpful) => {
    try {
      setFeedback(isHelpful);
      await api.patch(`/detect/${id}/feedback`, { isHelpful });
      toast.success(isHelpful ? '👍 Thanks for the feedback!' : '👎 We\'ll improve!');
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  if (isLoading) {
    return (
      <div className="result-loading">
        <div className="loader-spinner"></div>
        <p>Loading analysis...</p>
      </div>
    );
  }

  if (!detection) return null;

  const { analysis, treatments, preventionTips, crop, image } = detection;
  const isHealthy = analysis.overallStatus === 'healthy';
  const isDiseased = analysis.overallStatus === 'diseased';

  // Filter treatments by tab
  const filteredTreatments = activeTab === 'all'
    ? treatments
    : treatments.filter(t => t.type === activeTab);

  const treatmentCounts = treatments.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="result-page fade-in">
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <div className="breadcrumb">
        <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
        <span className="breadcrumb-sep">›</span>
        <Link to="/history" className="breadcrumb-link">History</Link>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">Detection Result</span>
      </div>

      {/* ── Top Summary Card ───────────────────────────────── */}
      <div className={`result-summary-card card ${isDiseased ? 'result-summary-card--diseased' : isHealthy ? 'result-summary-card--healthy' : ''}`}>
        <div className="summary-image-section">
          <div className="summary-image-wrapper">
            <img src={image.url} alt={crop.name} className="summary-image" />
            <div className={`status-badge-large badge-${analysis.overallStatus}`}>
              {analysis.overallStatus === 'healthy' && '✓ Healthy'}
              {analysis.overallStatus === 'diseased' && '✗ Disease Detected'}
              {analysis.overallStatus === 'stressed' && '⚠ Stressed'}
              {analysis.overallStatus === 'uncertain' && '? Uncertain'}
            </div>
          </div>
        </div>

        <div className="summary-info">
          <div className="summary-meta">
            <span className="summary-crop">🌾 {crop.name}</span>
            {crop.variety && <span className="summary-variety">• {crop.variety}</span>}
            {detection.location?.fieldName && (
              <span className="summary-field">📍 {detection.location.fieldName}</span>
            )}
          </div>

          {isDiseased && analysis.urgentAction && (
            <div className="urgent-alert">
              🚨 Immediate action required! This disease requires urgent treatment.
            </div>
          )}

          <h2 className="summary-disease">
            {analysis.primaryDisease || (isHealthy ? 'No Disease Found' : 'Analysis Complete')}
          </h2>

          <p className="summary-text">{analysis.summary}</p>

          {/* Confidence Meter */}
          <div className="confidence-section">
            <div className="confidence-label">
              <span>AI Confidence</span>
              <span className="confidence-value">{analysis.overallConfidence}%</span>
            </div>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width: `${analysis.overallConfidence}%`,
                  background: analysis.overallConfidence > 80
                    ? 'var(--green-primary)'
                    : analysis.overallConfidence > 50
                    ? 'var(--amber)'
                    : 'var(--red)'
                }}
              />
            </div>
          </div>

          <div className="summary-meta-row">
            <span className="meta-chip">⏱ {Math.round(detection.processingTime / 1000)}s analysis</span>
            <span className="meta-chip">📅 {new Date(detection.createdAt).toLocaleDateString('en-IN')}</span>
            {crop.growthStage !== 'unknown' && (
              <span className="meta-chip">🌱 {crop.growthStage}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body Grid ──────────────────────────────────────── */}
      <div className="result-grid">

        {/* Left Column */}
        <div className="result-main">

          {/* Diseases Found */}
          {analysis.diseases.length > 0 && (
            <div className="card result-section">
              <h3 className="section-title-lg">🦠 Diseases Detected</h3>
              <div className="disease-cards">
                {analysis.diseases.map((disease, i) => {
                  const sev = SEVERITY_COLORS[disease.severity] || SEVERITY_COLORS.mild;
                  return (
                    <div key={i} className="disease-card" style={{ borderColor: sev.color + '40' }}>
                      <div className="disease-card-header">
                        <h4 className="disease-card-name">{disease.name}</h4>
                        <span
                          className="severity-badge"
                          style={{ background: sev.bg, color: sev.color }}
                        >
                          {disease.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="disease-card-meta">
                        <span>🎯 Confidence: {disease.confidence}%</span>
                        {disease.affectedArea && (
                          <span>📍 Affects: {disease.affectedArea}</span>
                        )}
                      </div>
                      {disease.description && (
                        <p className="disease-card-desc">{disease.description}</p>
                      )}
                      <div className="disease-confidence-bar">
                        <div
                          className="disease-confidence-fill"
                          style={{ width: `${disease.confidence}%`, background: sev.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Treatments */}
          {treatments.length > 0 && (
            <div className="card result-section">
              <h3 className="section-title-lg">💊 Treatment Recommendations</h3>

              {/* Tabs */}
              <div className="treatment-tabs">
                <button
                  className={`tab-btn ${activeTab === 'all' ? 'tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All ({treatments.length})
                </button>
                {Object.entries(treatmentCounts).map(([type, count]) => (
                  <button
                    key={type}
                    className={`tab-btn ${activeTab === type ? 'tab-btn--active' : ''}`}
                    onClick={() => setActiveTab(type)}
                  >
                    {TREATMENT_TYPE_ICONS[type]?.icon} {TREATMENT_TYPE_ICONS[type]?.label} ({count})
                  </button>
                ))}
              </div>

              <div className="treatment-list">
                {filteredTreatments.map((treatment, i) => {
                  const typeInfo = TREATMENT_TYPE_ICONS[treatment.type];
                  const urgency = URGENCY_BADGES[treatment.urgency];
                  return (
                    <div key={i} className="treatment-card">
                      <div className="treatment-header">
                        <div className="treatment-type-icon">{typeInfo?.icon}</div>
                        <div className="treatment-title-group">
                          <h4 className="treatment-name">{treatment.name}</h4>
                          <span className="treatment-type-label">{typeInfo?.label}</span>
                        </div>
                        {urgency && (
                          <span className="urgency-badge" style={urgency.style}>
                            {urgency.text}
                          </span>
                        )}
                      </div>
                      <p className="treatment-desc">{treatment.description}</p>
                      {(treatment.dosage || treatment.applicationMethod || treatment.frequency) && (
                        <div className="treatment-details">
                          {treatment.applicationMethod && (
                            <div className="detail-chip">
                              <span className="detail-label">Method:</span>
                              <span>{treatment.applicationMethod}</span>
                            </div>
                          )}
                          {treatment.dosage && (
                            <div className="detail-chip">
                              <span className="detail-label">Dosage:</span>
                              <span>{treatment.dosage}</span>
                            </div>
                          )}
                          {treatment.frequency && (
                            <div className="detail-chip">
                              <span className="detail-label">Frequency:</span>
                              <span>{treatment.frequency}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prevention Tips */}
          {preventionTips.length > 0 && (
            <div className="card result-section">
              <h3 className="section-title-lg">🛡️ Prevention Tips</h3>
              <div className="prevention-list">
                {preventionTips.map((tip, i) => (
                  <div key={i} className="prevention-item">
                    <div className="prevention-bullet">
                      <span>{i + 1}</span>
                    </div>
                    <p className="prevention-text">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="result-sidebar">

          {/* Environmental Factors */}
          {analysis.environmentalFactors?.length > 0 && (
            <div className="card result-section">
              <h3 className="section-title-lg">🌤️ Environmental Factors</h3>
              <div className="env-list">
                {analysis.environmentalFactors.map((f, i) => (
                  <div key={i} className="env-item">
                    <span className="env-dot">◉</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Notes */}
          <div className="card result-section">
            <h3 className="section-title-lg">📝 My Notes</h3>
            <textarea
              className="form-textarea notes-textarea"
              placeholder="Add your observations about this detection..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <div className="notes-footer">
              <span className="notes-count">{notes.length}/500</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={saveNotes}
                disabled={isSavingNotes}
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Feedback */}
          <div className="card result-section feedback-card">
            <h3 className="section-title-lg">Was this helpful?</h3>
            <p className="section-subtitle">Help us improve our AI detection</p>
            <div className="feedback-buttons">
              <button
                className={`feedback-btn ${feedback === true ? 'feedback-btn--selected-yes' : ''}`}
                onClick={() => submitFeedback(true)}
              >
                👍 Yes, accurate
              </button>
              <button
                className={`feedback-btn ${feedback === false ? 'feedback-btn--selected-no' : ''}`}
                onClick={() => submitFeedback(false)}
              >
                👎 Not accurate
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="result-actions">
            <Link to="/detect" className="btn btn-primary w-full">
              🔬 New Detection
            </Link>
            <Link to="/history" className="btn btn-secondary w-full">
              📋 View History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;