import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCheck,
  Download,
  Eye,
  FileEdit,
  FileText,
  Home,
  LogOut,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import AdmissionPaperView from '../components/AdmissionPaperView';
import { formatDate, downloadElementAsPdf } from '../utils/helpers';

const officeDocuments = [
  ['SSLC', 'SSLC Certificate'],
  ['HSC', 'HSC Certificate'],
  ['TC', 'Transfer Certificate (TC)'],
  ['CommunityCertificate', 'Community Certificate'],
  ['NativityCertificate', 'Nativity Certificate'],
  ['IncomeCertificate', 'Income Certificate'],
  ['AadhaarCard', 'Aadhaar Document'],
  ['FirstGraduateCertificate', 'First Graduate Certificate'],
  ['PassportSizePhotographs', 'Student Photo'],
];

export default function OfficerApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    applications,
    updateApplication,
    forwardApplicationToVC,
    deleteApplication,
    logoutDemoUser,
    correctionHistory,
  } = useAppContext();

  const application = useMemo(() => applications.find((item) => (
    String(item.id) === String(id) || String(item.formNumber) === String(id)
  )), [applications, id]);

  const [draftApplication, setDraftApplication] = useState(() => application || {});
  const [note, setNote] = useState('');
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const cleanName = String(draftApplication.studentName || application.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CMS_Admission_Form_${draftApplication.formNumber || draftApplication.id || application.id}_${cleanName}.pdf`;
    const targetElement = document.querySelector('.admission-paper-sheet, .cms-paper-form');
    if (!targetElement) {
      window.alert('Unable to find document sheet for PDF export.');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      await downloadElementAsPdf(targetElement, filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Synchronize draft when application updates
  useEffect(() => {
    if (application) {
      setDraftApplication((prev) => ({
        ...application,
        ...prev,
        documents: prev.documents || application.documents || {},
        documentChecklist: prev.documentChecklist || application.documentChecklist || {},
        status: application.status,
        paymentStatus: application.paymentStatus,
        version: application.version,
        confirmedAt: application.confirmedAt,
        forwardedAt: application.forwardedAt,
      }));
    }
  }, [application]);

  if (!application) {
    return (
      <main className="page-shell preview-shell">
        <div className="content-panel empty-panel">
          <h2>Application not found</h2>
          <p>The requested student record could not be located in central records.</p>
          <button type="button" className="primary-btn" onClick={() => navigate('/officer/dashboard')}>
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  const history = correctionHistory.filter((entry) => entry.applicationId === id);

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/officer', { replace: true });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccessMsg('');
    try {
      const res = await updateApplication(id, draftApplication, note, 'Admission Officer');
      setNote('');
      if (!res?.conflict) {
        setSaveSuccessMsg('All application details, document changes, and checklist updates saved successfully!');
        setTimeout(() => setSaveSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error saving application:', err);
      alert('Unable to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = () => {
    if (application.status !== 'Enquiring') return;
    updateApplication(id, draftApplication, note, 'Admission Officer');
    navigate(`/payment?id=${encodeURIComponent(id)}&from=admin`);
  };

  const handleForwardToVC = () => {
    if (application.status !== 'Confirmed') return;
    const confirmed = window.confirm(`Forward application #${application.formNumber || application.id} (${application.studentName}) to Vice-Chairman?`);
    if (!confirmed) return;
    updateApplication(id, draftApplication, note, 'Admission Officer');
    forwardApplicationToVC(id, 'Admission Officer');
    navigate('/officer/dashboard', { replace: true });
  };

  const handleFileUpload = (docKey, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataUrl: String(reader.result || ''),
        uploadedAt: new Date().toISOString(),
      };

      setDraftApplication((prev) => ({
        ...prev,
        documents: {
          ...(prev.documents || {}),
          [docKey]: fileData,
          ...(docKey === 'CommunityCertificate' ? { CC: fileData } : {}),
        },
      }));
      setSaveSuccessMsg(`Uploaded ${docKey}. Click "Save Changes" to save.`);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRemoveDoc = (docKey) => {
    const confirmed = window.confirm(`Remove ${docKey} document?`);
    if (!confirmed) return;

    setDraftApplication((prev) => {
      const nextDocs = { ...(prev.documents || {}) };
      delete nextDocs[docKey];
      if (docKey === 'CommunityCertificate') delete nextDocs.CC;
      return {
        ...prev,
        documents: nextDocs,
      };
    });
    setSaveSuccessMsg(`Removed ${docKey}. Click "Save Changes" to save.`);
  };

  const updateDocumentCheck = (documentKey, type, checked) => {
    setDraftApplication((previous) => ({
      ...previous,
      documentChecklist: {
        ...previous.documentChecklist,
        [documentKey]: {
          ...previous.documentChecklist?.[documentKey],
          [type]: checked,
        },
      },
    }));
  };

  // Uploaded documents list
  const uploadedDocumentList = Object.entries(draftApplication.documents || {})
    .filter(([, file]) => file?.dataUrl)
    .map(([key, file]) => {
      const match = officeDocuments.find(([k]) => k === key);
      return {
        key,
        label: match ? match[1] : key.replace(/([A-Z])/g, ' $1').trim(),
        file,
      };
    });

  const actionLabel = application.status === 'Enquiring'
    ? 'Confirm Application'
    : application.status === 'Confirmed'
      ? 'Send to VC'
      : 'Already Sent to VC';

  return (
    <main className="page-shell admin-shell officer-shell">
      {/* 1. Admin Green Navigation Box */}
      <aside className="admin-sidebar officer-top-header">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent" style={{ margin: 0 }}>Officer Portal</p>
            <strong style={{ fontSize: '1.1rem' }}>{application.studentName}</strong>
          </div>
        </div>

        {/* RIGHT SIDE: Home, Logout */}
        <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <nav className="admin-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/officer/dashboard" className="nav-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Home size={15} /> Home
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
        {/* Action Header Bar */}
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Complete Application Preview &amp; Review</p>
            <h2>Admin No: #{application.formNumber || application.id}</h2>
          </div>
          <div className="toolbar" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="secondary-btn compact"
              onClick={() => navigate('/officer/dashboard')}
            >
              <ArrowLeft size={16} /> Back to Home
            </button>
            <button
              type="button"
              className="primary-btn compact"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Download Complete Student Application Form PDF"
            >
              <Download size={16} /> {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button
              type="button"
              className="secondary-btn compact"
              onClick={() => {
                const confirmed = window.confirm(`Are you sure you want to delete application "${application.id}" (${application.studentName})? This action cannot be undone.`);
                if (confirmed) {
                  deleteApplication(application.id);
                  navigate('/officer/dashboard', { replace: true });
                }
              }}
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            >
              <Trash2 size={16} /> Delete
            </button>
            <button
              type="button"
              className="primary-btn compact"
              onClick={handleSave}
              disabled={isSaving}
              style={{ background: '#166534', borderColor: '#14532d' }}
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            {application.status === 'Enquiring' ? (
              <button
                type="button"
                className="primary-btn compact"
                onClick={handleConfirm}
                style={{ background: '#0284c7', borderColor: '#0369a1' }}
              >
                <CheckCheck size={16} /> Confirm Application
              </button>
            ) : application.status === 'Confirmed' ? (
              <button
                type="button"
                className="primary-btn compact"
                onClick={handleForwardToVC}
                style={{ background: '#0284c7', borderColor: '#0369a1' }}
              >
                <CheckCheck size={16} /> Send to VC
              </button>
            ) : (
              <span className="badge badge-success" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                ✓ Sent to VC
              </span>
            )}
          </div>
        </header>

        {saveSuccessMsg ? (
          <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', color: '#166534', padding: '12px 18px', borderRadius: '12px', fontWeight: 700 }}>
            ✓ {saveSuccessMsg}
          </div>
        ) : null}

        {/* =========================================================================
            1. COMPLETE STUDENT PREVIEW PAGE (Institutional Paper View)
           ========================================================================= */}
        <div className="content-panel" style={{ background: '#ffffff', borderRadius: '20px', padding: '16px 12px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 12px', borderBottom: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#004d38', fontWeight: 800 }}>
              Institutional Student Admission Form Preview
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Status: <strong style={{ color: '#166534' }}>{application.status}</strong>
            </span>
          </div>

          <AdmissionPaperView
            draft={draftApplication}
            adminNumber={draftApplication.formNumber || draftApplication.id}
            isEditableConsultant={true}
            onConsultantChange={(val) => setDraftApplication((prev) => ({ ...prev, consultantName: val }))}
            onOrganizationChange={(val) => setDraftApplication((prev) => ({ ...prev, organizationName: val }))}
          />
        </div>

        {/* =========================================================================
            2. UNDER PREVIEW: DISPLAY DOCUMENT VERIFICATION
           ========================================================================= */}
        <div className="content-panel form-panel" style={{ marginTop: '0', marginBottom: '24px' }}>
          <div className="section-header space-between" style={{ borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px' }}>
            <div>
              <p className="eyebrow accent" style={{ margin: 0 }}>Verification &amp; Checklist</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.35rem', color: '#004d38', fontWeight: 800 }}>
                Document Verification &amp; Office Checklist
              </h2>
            </div>
            <button type="button" className="primary-btn compact" onClick={handleSave} disabled={isSaving}>
              <Save size={14} /> Save Verification
            </button>
          </div>

          {/* Uploaded Documents Grid */}
          <div style={{ marginTop: '18px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginBottom: '8px' }}>
              Uploaded Certificates &amp; Documents ({uploadedDocumentList.length})
            </h3>
            <p className="field-help" style={{ marginBottom: '14px' }}>
              Click View to inspect the certificate in full preview, or Replace/Upload as needed.
            </p>

            {uploadedDocumentList.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                {uploadedDocumentList.map(({ key, label, file }) => (
                  <div
                    key={key}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{label}</strong>
                        <span style={{ fontSize: '0.7rem', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                          ✓ Uploaded
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px', wordBreak: 'break-all' }}>
                        {file.name}
                      </p>
                      <div style={{ height: '120px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {file.mimeType?.includes('pdf') ? (
                          <div style={{ textAlign: 'center', color: '#475569' }}>
                            <FileText size={32} color="#006747" style={{ margin: '0 auto 4px', display: 'block' }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>PDF Document</span>
                          </div>
                        ) : (
                          <img src={file.dataUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={() => setSelectedFilePreview({ title: label, file })}
                        style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}
                      >
                        <Eye size={13} /> View
                      </button>
                      <label className="secondary-btn compact" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', margin: 0, fontSize: '0.78rem' }}>
                        <Upload size={13} /> Replace
                        <input type="file" style={{ display: 'none' }} accept="image/*,application/pdf" onChange={(e) => handleFileUpload(key, e)} />
                      </label>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={() => handleRemoveDoc(key)}
                        title="Remove document"
                        style={{ color: '#ef4444', padding: '4px 6px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No documents uploaded by this student yet.</p>
            )}
          </div>

          {/* Office Verification Checklist Table */}
          <section className="certificate-status-wrap" style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginBottom: '6px' }}>
              Office Verification Checklist
            </h3>
            <p className="field-help">
              Tick Original or Xerox after physical verification of the certificate.
            </p>
            <div className="table-scroll">
              <table className="data-table certificate-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Student Upload</th>
                    <th style={{ textAlign: 'center' }}>Original Received</th>
                    <th style={{ textAlign: 'center' }}>Xerox Received</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {officeDocuments.map(([key, label]) => {
                    const isUploaded = Boolean(draftApplication.documents?.[key]?.dataUrl);
                    return (
                      <tr key={key}>
                        <td><strong>{label}</strong></td>
                        <td>
                          <span className={`badge ${isUploaded ? 'badge-success' : ''}`} style={!isUploaded ? { background: '#f1f5f9', color: '#64748b' } : {}}>
                            {isUploaded ? '✓ Uploaded' : 'Not uploaded'}
                          </span>
                        </td>
                        {['original', 'xerox'].map((type) => (
                          <td key={type} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="office-document-checkbox"
                              aria-label={`${label} ${type} received`}
                              checked={Boolean(draftApplication.documentChecklist?.[key]?.[type])}
                              onChange={(event) => updateDocumentCheck(key, type, event.target.checked)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                        ))}
                        <td style={{ textAlign: 'center' }}>
                          <label className="secondary-btn compact" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', padding: '3px 8px', fontSize: '0.76rem' }}>
                            <Upload size={12} /> {isUploaded ? 'Replace' : 'Upload'}
                            <input type="file" style={{ display: 'none' }} accept="image/*,application/pdf" onChange={(e) => handleFileUpload(key, e)} />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Authorized Staff Corrections Form */}
          <div style={{ marginTop: '28px', borderTop: '1.5px solid #e2e8f0', paddingTop: '18px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800, marginBottom: '6px' }}>
              Authorized Staff Corrections
            </h3>
            <p className="field-help" style={{ marginBottom: '14px' }}>
              Admission officers can correct student data if required.
            </p>
            <div className="preview-grid two-column">
              <div className="field-group">
                <label>Student Name</label>
                <input
                  value={draftApplication.studentName || ''}
                  onChange={(event) => setDraftApplication((prev) => ({ ...prev, studentName: event.target.value }))}
                />
              </div>
              <div className="field-group">
                <label>Email ID</label>
                <input
                  value={draftApplication.email || ''}
                  onChange={(event) => setDraftApplication((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="field-group">
                <label>EMIS ID</label>
                <input
                  value={draftApplication.emisId || ''}
                  onChange={(event) => setDraftApplication((prev) => ({ ...prev, emisId: event.target.value }))}
                />
              </div>
              <div className="field-group">
                <label>Student Mobile</label>
                <input
                  value={draftApplication.studentMobile || ''}
                  onChange={(event) => setDraftApplication((prev) => ({ ...prev, studentMobile: event.target.value }))}
                />
              </div>
              <div className="field-group">
                <label>Selected Course</label>
                <input
                  value={draftApplication.coursePreference?.firstPreference || ''}
                  onChange={(event) => setDraftApplication((prev) => ({
                    ...prev,
                    coursePreference: { ...prev.coursePreference, firstPreference: event.target.value }
                  }))}
                />
              </div>
              <div className="field-group">
                <label>Admission Category</label>
                <input
                  value={draftApplication.admissionCategory || ''}
                  onChange={(event) => setDraftApplication((prev) => ({ ...prev, admissionCategory: event.target.value }))}
                />
              </div>
              <div className="field-group full-width">
                <label>Communication Address</label>
                <textarea
                  value={draftApplication.communicationAddress || ''}
                  onChange={(event) => setDraftApplication((prev) => ({ ...prev, communicationAddress: event.target.value }))}
                  rows="2"
                />
              </div>
              <div className="field-group full-width">
                <label>Officer Correction Notes</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows="3"
                  placeholder="Add officer verification remarks or audit notes..."
                />
              </div>
            </div>
          </div>

          {/* History */}
          <div className="detail-history" style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>Audit &amp; Change History</h3>
            {history.length ? history.map((entry) => (
              <div className="history-item" key={entry.id}>
                <strong>{entry.actor}</strong>
                <span>{formatDate(entry.createdAt)}</span>
                <p>{entry.note}</p>
              </div>
            )) : <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No prior correction history logged for this record.</p>}
          </div>

          <div className="form-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="secondary-btn" onClick={() => navigate('/officer/dashboard')}>
              <ArrowLeft size={16} /> Back to Home
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={16} /> {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button type="button" className="primary-btn" onClick={handleSave} disabled={isSaving} style={{ background: '#166534', borderColor: '#14532d' }}>
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
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
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} color="#334155" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
              {selectedFilePreview.file.mimeType?.includes('pdf') ? (
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
