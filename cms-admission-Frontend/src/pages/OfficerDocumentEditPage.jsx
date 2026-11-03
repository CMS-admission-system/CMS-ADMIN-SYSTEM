import { useState } from 'react';
import { ArrowLeft, Check, Download, Eye, FileEdit, FileText, Home, Image, LogOut, Save, Trash2, Upload, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const officeDocuments = [
  ['SSLC', 'SSLC Certificate'],
  ['HSC', 'HSC Certificate'],
  ['TC', 'Transfer Certificate (TC)'],
  ['CC', 'Community Certificate'],
  ['NativityCertificate', 'Nativity Certificate'],
  ['IncomeCertificate', 'Income Certificate'],
  ['AadhaarCard', 'Aadhaar Document'],
  ['FirstGraduateCertificate', 'First Graduate Certificate'],
  ['PassportSizePhotographs', 'Student Photo'],
];

export default function OfficerDocumentEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const paramId = searchParams.get('id');

  const { applications, updateApplication, logoutDemoUser, isLiveConnected } = useAppContext();

  // Selected application ID (default to paramId or first available application)
  const [selectedAppId, setSelectedAppId] = useState(() => (
    paramId || applications[0]?.id || ''
  ));
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedApp = applications.find((a) => a.id === selectedAppId) || applications[0] || null;

  // Local draft state for the selected application's documents & checklist
  const [localDocs, setLocalDocs] = useState(() => selectedApp?.documents || {});
  const [localChecklist, setLocalChecklist] = useState(() => selectedApp?.documentChecklist || {});

  // When selected student changes
  const handleSelectStudent = (id) => {
    setSelectedAppId(id);
    const target = applications.find((a) => a.id === id);
    if (target) {
      setLocalDocs(target.documents || {});
      setLocalChecklist(target.documentChecklist || {});
      setSaveSuccessMessage('');
    }
  };

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/officer', { replace: true });
  };

  const handleFileUpload = (docKey, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const docPayload = {
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: String(reader.result || ''),
        uploadedAt: new Date().toISOString(),
      };

      setLocalDocs((prev) => ({
        ...prev,
        [docKey]: docPayload,
      }));
      setSaveSuccessMessage('Document updated locally. Click "Save Changes" to sync.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveDoc = (docKey) => {
    const confirmed = window.confirm(`Remove ${docKey} document?`);
    if (!confirmed) return;

    setLocalDocs((prev) => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
    setSaveSuccessMessage('Document removed locally. Click "Save Changes" to sync.');
  };

  const handleChecklistToggle = (docKey, type, checked) => {
    setLocalChecklist((prev) => ({
      ...prev,
      [docKey]: {
        ...prev[docKey],
        [type]: checked,
      },
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedApp) return;
    setIsSaving(true);
    setSaveSuccessMessage('');

    try {
      const updatedApp = {
        ...selectedApp,
        documents: localDocs,
        documentChecklist: localChecklist,
        updatedAt: new Date().toISOString(),
      };
      await updateApplication(
        selectedApp.id,
        updatedApp,
        'Documents and checklist updated by Admission Officer',
        'Admission Officer'
      );
      setSaveSuccessMessage('All document changes and checklist updates saved successfully!');
      setTimeout(() => setSaveSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Save error:', err);
      alert('Unable to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter: Display uploaded documents ONLY
  const uploadedDocumentList = Object.entries(localDocs || {})
    .filter(([, file]) => file?.dataUrl)
    .map(([key, file]) => {
      const match = officeDocuments.find(([k]) => k === key);
      return {
        key,
        label: match ? match[1] : key.replace(/([A-Z])/g, ' $1').trim(),
        file,
      };
    });

  return (
    <main className="page-shell admin-shell officer-shell">
      {/* Top Header - Green Box (Vertical Layout) */}
      <aside className="admin-sidebar officer-top-header">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent" style={{ margin: 0 }}>Officer Portal</p>
            <strong style={{ fontSize: '1.1rem' }}>Admission Office — Document Settings</strong>
          </div>
        </div>

        <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <nav className="admin-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/officer/dashboard" className="nav-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Home size={15} /> Home
            </Link>
            <Link to="/officer/documents" className="nav-item active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FileEdit size={15} /> Edit
            </Link>
            <button
              type="button"
              className="nav-item button-link"
              onClick={handleLogout}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={15} /> Logout
            </button>
          </nav>
        </div>
      </aside>

      <section className="admin-content" style={{ width: '100%' }}>
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Document Management &amp; Settings</p>
            <h2>Student Document Editor &amp; Verification Checklist</h2>
          </div>
          <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" className="secondary-btn compact" onClick={() => navigate('/officer/dashboard')}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <button type="button" className="primary-btn compact" onClick={handleSaveAll} disabled={isSaving}>
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        {saveSuccessMessage ? (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: 600 }}>
            ✓ {saveSuccessMessage}
          </div>
        ) : null}

        {/* Student Selector */}
        <div className="content-panel dashboard-filters" style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(3px)' }}>
          <div className="field-group full-width" style={{ margin: 0 }}>
            <label htmlFor="studentSelect" style={{ fontWeight: 700, color: '#1e293b' }}>Select Student Record to Edit Documents:</label>
            <select
              id="studentSelect"
              value={selectedAppId}
              onChange={(e) => handleSelectStudent(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  #{app.formNumber || app.id} — {app.studentName || 'Student'} ({app.coursePreference?.firstPreference || 'Course'}) — Status: [{app.status}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedApp ? (
          <>
            {/* 1. UPLOADED DOCUMENTS ONLY SECTION (Requirement 3) */}
            <div className="content-panel table-card" style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(3px)' }}>
              <div className="section-header space-between">
                <div>
                  <h3 style={{ margin: 0, color: '#004d38' }}>Uploaded Documents ({uploadedDocumentList.length})</h3>
                  <small style={{ color: '#64748b' }}>Displaying uploaded documents only for {selectedApp.studentName}</small>
                </div>
              </div>

              {uploadedDocumentList.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  {uploadedDocumentList.map(({ key, label, file }) => (
                    <div
                      key={key}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{label}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                            Uploaded
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 10px', wordBreak: 'break-all' }}>
                          {file.name}
                        </p>
                        <div style={{ height: '140px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {file.mimeType?.includes('pdf') ? (
                            <div style={{ textAlign: 'center', color: '#475569' }}>
                              <FileText size={36} color="#006747" style={{ margin: '0 auto 6px', display: 'block' }} />
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>PDF Document</span>
                            </div>
                          ) : (
                            <img src={file.dataUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          type="button"
                          className="secondary-btn compact"
                          onClick={() => setSelectedFilePreview({ title: label, file })}
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          <Eye size={14} /> View
                        </button>
                        <label className="secondary-btn compact" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', margin: 0 }}>
                          <Upload size={14} /> Replace
                          <input type="file" style={{ display: 'none' }} accept="image/*,application/pdf" onChange={(e) => handleFileUpload(key, e)} />
                        </label>
                        <button
                          type="button"
                          className="secondary-btn compact"
                          onClick={() => handleRemoveDoc(key)}
                          title="Remove document"
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b' }}>
                  <FileText size={40} style={{ margin: '0 auto 10px', color: '#cbd5e1', display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No documents uploaded by this student yet.</p>
                  <small>Use the checklist below to upload or verify certificates.</small>
                </div>
              )}
            </div>

            {/* 2. RETAINED DOCUMENT CHECKLIST TABLE (Requirement 3) */}
            <div className="content-panel table-card" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(3px)' }}>
              <div className="section-header space-between">
                <div>
                  <h3 style={{ margin: 0, color: '#004d38' }}>Office Verification Checklist</h3>
                  <small style={{ color: '#64748b' }}>Verify physical certificates received (Original &amp; Xerox) and upload documents</small>
                </div>
                <button type="button" className="primary-btn compact" onClick={handleSaveAll} disabled={isSaving}>
                  <Save size={14} /> Save Checklist
                </button>
              </div>

              <div className="table-scroll" style={{ marginTop: '14px' }}>
                <table className="checklist-table data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Document</th>
                      <th style={{ width: '18%' }}>Student Upload Status</th>
                      <th style={{ width: '18%', textAlign: 'center' }}>Original Received</th>
                      <th style={{ width: '18%', textAlign: 'center' }}>Xerox Received</th>
                      <th style={{ width: '16%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officeDocuments.map(([key, label]) => {
                      const isUploaded = Boolean(localDocs?.[key]?.dataUrl);
                      return (
                        <tr key={key}>
                          <td><strong>{label}</strong></td>
                          <td>
                            <span className={`badge ${isUploaded ? 'badge-success' : ''}`} style={!isUploaded ? { background: '#f1f5f9', color: '#64748b' } : {}}>
                              {isUploaded ? '✓ Uploaded' : 'Not uploaded'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="office-document-checkbox"
                              checked={Boolean(localChecklist?.[key]?.original)}
                              onChange={(e) => handleChecklistToggle(key, 'original', e.target.checked)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="office-document-checkbox"
                              checked={Boolean(localChecklist?.[key]?.xerox)}
                              onChange={(e) => handleChecklistToggle(key, 'xerox', e.target.checked)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <label className="secondary-btn compact" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', padding: '4px 8px', fontSize: '0.78rem' }}>
                              <Upload size={13} /> {isUploaded ? 'Replace' : 'Upload'}
                              <input type="file" style={{ display: 'none' }} accept="image/*,application/pdf" onChange={(e) => handleFileUpload(key, e)} />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="content-panel empty-panel">
            <h3>No applications available</h3>
            <p>Once students register, their records and uploaded documents will appear here for verification.</p>
          </div>
        )}
      </section>

      {/* Document View Preview Modal */}
      {selectedFilePreview ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedFilePreview(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div>
                <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{selectedFilePreview.title}</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{selectedFilePreview.file.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFilePreview(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} color="#334155" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
              {selectedFilePreview.file.mimeType === 'application/pdf' ? (
                <iframe
                  src={selectedFilePreview.file.dataUrl}
                  title={selectedFilePreview.title}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '6px' }}
                />
              ) : (
                <img
                  src={selectedFilePreview.file.dataUrl}
                  alt={selectedFilePreview.title}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '6px' }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
