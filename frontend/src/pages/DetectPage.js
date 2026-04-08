/**
 * Detect Page — The core feature page
 * ─────────────────────────────────────────────────────────────
 * User uploads a crop image, selects crop type, then the system:
 * 1. Uploads to Cloudinary (via backend)
 * 2. Sends to Claude AI for analysis
 * 3. Redirects to ResultPage with the detection ID
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './DetectPage.css';

const CROPS = [
  'Tomato','Rice','Wheat','Cotton','Maize','Potato','Onion','Sugarcane',
  'Soybean','Groundnut','Chilli','Brinjal','Cauliflower','Cabbage',
  'Mango','Banana','Grapes','Pomegranate','Mustard','Chickpea',
  'Lentil','Turmeric','Ginger','Sunflower','Cucumber','Okra'
];

const GROWTH_STAGES = [
  { value: 'unknown',    label: 'Unknown / Not sure' },
  { value: 'seedling',   label: 'Seedling (0–2 weeks)' },
  { value: 'vegetative', label: 'Vegetative (Growing)' },
  { value: 'flowering',  label: 'Flowering / Budding' },
  { value: 'fruiting',   label: 'Fruiting / Pod formation' },
  { value: 'harvest',    label: 'Near harvest' },
];

const DetectPage = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);      // { file, preview }
  const [formData, setFormData] = useState({
    cropName: '',
    growthStage: 'unknown',
    fieldName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState(''); // 'uploading' | 'analyzing'
  const [errors, setErrors] = useState({});

  useEffect(() => { document.title = 'Detect Disease — AgriAI'; }, []);

  // ── Dropzone ────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0];
      if (err.code === 'file-too-large') toast.error('Image must be under 5MB');
      else if (err.code === 'file-invalid-type') toast.error('Only JPG, PNG, WebP images allowed');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setImage({
        file,
        preview: URL.createObjectURL(file)
      });
      setErrors(prev => ({ ...prev, image: '' }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false
  });

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (image?.preview) URL.revokeObjectURL(image.preview);
    };
  }, [image]);

  const removeImage = (e) => {
    e.stopPropagation();
    if (image?.preview) URL.revokeObjectURL(image.preview);
    setImage(null);
  };

  // ── Form Validation ─────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!image) errs.image = 'Please upload a crop image';
    if (!formData.cropName) errs.cropName = 'Please select a crop';
    return errs;
  };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsSubmitting(true);
    setSubmitStage('uploading');

    try {
      // Build FormData for multipart upload
      const data = new FormData();
      data.append('image', image.file);
      data.append('cropName', formData.cropName);
      data.append('growthStage', formData.growthStage);
      if (formData.fieldName) data.append('fieldName', formData.fieldName);

      setSubmitStage('analyzing');

      // POST to /api/detect — this uploads image AND runs AI analysis
      const response = await api.post('/detect', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const detectionId = response.data.data._id;
      toast.success('Analysis complete! Viewing results...');
      navigate(`/result/${detectionId}`);

    } catch (err) {
      toast.error(err.message || 'Analysis failed. Please try again.');
      setIsSubmitting(false);
      setSubmitStage('');
    }
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="detect-page fade-in">
      <div className="page-header">
        <h1 className="page-title">🔬 Detect Crop Disease</h1>
        <p className="page-subtitle">
          Upload a clear photo of your crop leaf or plant and our AI will diagnose it instantly
        </p>
      </div>

      <div className="detect-layout">

        {/* ── Left: Upload Form ─────────────────────────────── */}
        <div className="detect-form-card card">

          {/* Photo Upload Zone */}
          <div className="form-section">
            <h3 className="section-title">📷 Upload Crop Photo</h3>
            <p className="section-hint">
              Best results: Clear, close-up photo in good lighting. Include affected leaves.
            </p>

            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'dropzone--active' : ''} ${image ? 'dropzone--has-image' : ''} ${errors.image ? 'dropzone--error' : ''}`}
            >
              <input {...getInputProps()} />

              {image ? (
                <div className="image-preview-wrapper">
                  <img src={image.preview} alt="Crop preview" className="image-preview" />
                  <button className="remove-image-btn" onClick={removeImage} type="button">
                    ✕ Remove
                  </button>
                  <div className="image-name">{image.file.name}</div>
                </div>
              ) : (
                <div className="dropzone-content">
                  <div className="dropzone-icon">
                    {isDragActive ? '📂' : '📤'}
                  </div>
                  <p className="dropzone-title">
                    {isDragActive ? 'Drop image here...' : 'Drag & drop or click to browse'}
                  </p>
                  <p className="dropzone-hint">JPG, PNG, WebP · Max 5MB</p>
                </div>
              )}
            </div>
            {errors.image && <span className="form-error">{errors.image}</span>}
          </div>

          <div className="divider" />

          {/* Crop Details */}
          <div className="form-section">
            <h3 className="section-title">🌾 Crop Details</h3>

            <div className="form-group">
              <label className="form-label">Crop Type *</label>
              <select
                className={`form-select ${errors.cropName ? 'form-input--error' : ''}`}
                value={formData.cropName}
                onChange={e => {
                  setFormData(prev => ({ ...prev, cropName: e.target.value }));
                  if (errors.cropName) setErrors(prev => ({ ...prev, cropName: '' }));
                }}
              >
                <option value="">— Select crop —</option>
                {CROPS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.cropName && <span className="form-error">{errors.cropName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Growth Stage</label>
              <select
                className="form-select"
                value={formData.growthStage}
                onChange={e => setFormData(prev => ({ ...prev, growthStage: e.target.value }))}
              >
                {GROWTH_STAGES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Field Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. North Field, Plot 3"
                value={formData.fieldName}
                onChange={e => setFormData(prev => ({ ...prev, fieldName: e.target.value }))}
                maxLength={50}
              />
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" style={{ borderTopColor: '#0d1a0d' }}></span>
                {submitStage === 'uploading' ? 'Uploading image...' : 'AI analyzing...'}
              </>
            ) : (
              '🔬 Analyze with AI'
            )}
          </button>
        </div>

        {/* ── Right: Tips & Info ─────────────────────────────── */}
        <div className="detect-sidebar">

          {/* AI Processing Status */}
          {isSubmitting && (
            <div className="card processing-card fade-in">
              <h3 className="card-title" style={{ marginBottom: 16 }}>⚙️ AI Processing</h3>
              <div className="process-steps">
                <div className={`process-step ${submitStage === 'uploading' ? 'process-step--active' : 'process-step--done'}`}>
                  <div className="step-indicator">
                    {submitStage === 'uploading' ? <span className="btn-spinner" style={{ borderTopColor: 'var(--amber)' }}></span> : '✓'}
                  </div>
                  <div>
                    <p className="step-name">Uploading Image</p>
                    <p className="step-desc">Securely storing to cloud</p>
                  </div>
                </div>
                <div className={`process-step ${submitStage === 'analyzing' ? 'process-step--active' : ''}`}>
                  <div className="step-indicator">
                    {submitStage === 'analyzing' ? <span className="btn-spinner" style={{ borderTopColor: 'var(--green-primary)' }}></span> : '2'}
                  </div>
                  <div>
                    <p className="step-name">Claude AI Analysis</p>
                    <p className="step-desc">Diagnosing disease patterns</p>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-indicator">3</div>
                  <div>
                    <p className="step-name">Generating Report</p>
                    <p className="step-desc">Treatment recommendations</p>
                  </div>
                </div>
              </div>
              <p className="processing-note">
                ⏱ This takes 10–30 seconds. Please don't close the page.
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="card tips-card">
            <h3 className="card-title" style={{ marginBottom: 14 }}>📸 Photo Tips for Best Results</h3>
            <div className="tips-list">
              {[
                { icon: '☀️', tip: 'Shoot in natural daylight, avoid harsh shadows' },
                { icon: '🔍', tip: 'Capture affected leaves up close (30–50 cm away)' },
                { icon: '📐', tip: 'Fill the frame with the plant — minimize background' },
                { icon: '💧', tip: 'Avoid wet or muddy photos — dry conditions are clearer' },
                { icon: '🌿', tip: 'Include both healthy and diseased parts for comparison' },
              ].map((t, i) => (
                <div key={i} className="tip-item">
                  <span className="tip-icon">{t.icon}</span>
                  <span className="tip-text">{t.tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supported crops info */}
          <div className="card supported-card">
            <h3 className="card-title" style={{ marginBottom: 10 }}>🌾 26+ Crops Supported</h3>
            <p className="card-subtitle" style={{ marginBottom: 12 }}>
              Detect 100+ diseases across common Indian crops
            </p>
            <div className="crop-tags">
              {CROPS.slice(0, 10).map(c => (
                <span key={c} className="crop-tag">{c}</span>
              ))}
              <span className="crop-tag crop-tag--more">+{CROPS.length - 10} more</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectPage;