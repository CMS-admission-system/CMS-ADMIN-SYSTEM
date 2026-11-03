import { useState } from 'react';
import { ArrowLeft, Download, Eye, FileText, Printer, X } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import AdmissionPaperView from '../components/AdmissionPaperView';
import ApplicationDocuments from '../components/ApplicationDocuments';
import { downloadApplicationsCsv, downloadElementAsPdf } from '../utils/helpers';

export default function VCDetailPage() {
  const { id } = useParams();
  const { applications } = useAppContext();

  // Find record by either ID or FormNumber
  const application = applications.find((item) => (
    String(item.id) === String(id) || String(item.formNumber) === String(id)
  ));

  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!application) {
    return (
      <main className="page-shell preview-shell">
        <div className="content-panel empty-panel">
          <h2>Application unavailable</h2>
          <p>The student record could not be found or has not been forwarded by the admission office.</p>
          <Link to="/vc/dashboard" className="primary-btn">Return to VC list</Link>
        </div>
      </main>
    );
  }

  const handleSavePdf = async () => {
    const cleanName = String(application.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CMS_Admission_Form_${application.formNumber || application.id}_${cleanName}.pdf`;
    const targetElement = document.querySelector('.admission-paper-sheet');
    if (!targetElement) {
      window.alert('Application form sheet not found.');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      await downloadElementAsPdf(targetElement, filename);
    } catch (err) {
      console.error('Error saving PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const triggerCsv = () => {
    downloadApplicationsCsv([application], `${application.formNumber || application.id}.csv`);
  };

  return (
    <main className="page-shell preview-shell" style={{ padding: '20px 16px' }}>
      <section className="content-panel application-preview" style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
        {/* Top Header */}
        <div className="section-header space-between" style={{ borderBottom: '1.5px solid #e2e8f0', paddingBottom: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <p className="eyebrow accent" style={{ margin: 0 }}>Vice-Chairman Review</p>
              <span className="badge badge-success" style={{ padding: '3px 10px', fontSize: '0.78rem' }}>
                Sent by AO
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#004d38', fontWeight: 800 }}>
              {application.studentName}
            </h2>
          </div>
          <div className="preview-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
            <span style={{ fontWeight: 800, color: '#166534', fontSize: '0.95rem' }}>
              Admin No: #{application.formNumber || application.id}
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="form-actions preview-actions screen-only" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <Link to="/vc/dashboard" className="secondary-btn">
            <ArrowLeft size={16} /> Back to VC List
          </Link>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleSavePdf}
              disabled={isDownloadingPdf}
              style={{ background: '#166534', borderColor: '#14532d' }}
            >
              <Download size={16} /> {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button type="button" className="secondary-btn" onClick={() => window.print()}>
              <Printer size={16} /> Print Application
            </button>
            <button type="button" className="secondary-btn" onClick={triggerCsv}>
              <Download size={16} /> Export Excel/CSV
            </button>
          </div>
        </div>

        {/* 1. Complete Institutional Admission Form Paper View */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
          <AdmissionPaperView
            draft={application}
            adminNumber={application.formNumber || application.id}
            isEditableConsultant={false}
          />
        </div>

        {/* 2. Uploaded Documents and Signatures */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', color: '#004d38', fontWeight: 800 }}>
            Student Uploaded Documents &amp; Certificates
          </h3>
          <ApplicationDocuments
            documents={{
              ...(application.documents || {}),
              ...(application.cashReceipt?.dataUrl ? { cashReceipt: application.cashReceipt } : {}),
            }}
            signature={application.signature}
            studentSignature={application.studentSignature}
            parentSignature={application.parentSignature}
          />
        </div>

        <div className="form-actions preview-actions screen-only" style={{ marginTop: '24px' }}>
          <Link to="/vc/dashboard" className="secondary-btn">
            <ArrowLeft size={16} /> Back to VC List
          </Link>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSavePdf}
            disabled={isDownloadingPdf}
            style={{ background: '#166534', borderColor: '#14532d' }}
          >
            <Download size={16} /> {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
          </button>
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
