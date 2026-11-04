import { useState } from 'react';
import { CheckCircle2, Download, Printer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import AdmissionPaperView from '../components/AdmissionPaperView';
import { downloadElementAsPdf } from '../utils/helpers';

export default function ApplicationSuccessPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { lastSubmitted, applications } = useAppContext();
  const applicationId = params.get('id') || lastSubmitted?.id || 'CMS-UNKNOWN';
  
  const targetApp = lastSubmitted || applications.find((a) => String(a.id) === String(applicationId)) || {};
  const studentName = targetApp.studentName || lastSubmitted?.studentName || 'Student';
  const studentEmail = targetApp.email || lastSubmitted?.email || '';

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleSavePdf = async () => {
    const cleanName = String(studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CMS_Admission_Form_${applicationId}_${cleanName}.pdf`;
    const targetElement = document.querySelector('.admission-paper-sheet, .cms-paper-form');
    if (!targetElement) {
      window.alert('Application form document not found.');
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

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanName = String(studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `CMS_Admission_Form_${applicationId}_${cleanName}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  return (
    <main className="page-shell success-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="success-card screen-only">
        <div className="success-icon"><CheckCircle2 size={54} /></div>
        <p className="eyebrow accent">Application Submitted</p>
        <h2>Thank you, {studentName}.</h2>
        <p className="success-detail" style={{ color: '#2563eb', textShadow: 'none' }}>Your admission application has been received successfully.</p>

        <div className="success-meta">
          <div className="meta-block">
            <span>Application ID</span>
            <strong>{applicationId}</strong>
          </div>
          <div className="meta-block">
            <span>Status</span>
            <strong>
              {targetApp.status || lastSubmitted?.status || 'Enquiring'}
              {targetApp.paymentStatus === 'Unpaid' ? ' — Admission fee unpaid' : ''}
              {targetApp.paymentStatus === 'Paid' ? ' — Admission fee paid' : ''}
            </strong>
          </div>
        </div>

        {studentEmail ? (
          <p style={{ margin: '14px 0 0', fontSize: '0.88rem', color: '#166534', background: '#dcfce7', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}>
            ✉ A copy of your admission application has been sent to <strong>{studentEmail}</strong> from cmsadsystem@gmail.com.
          </p>
        ) : null}

        <div className="cta-row success-actions screen-only" style={{ marginTop: '18px' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={handleSavePdf}
            disabled={isDownloadingPdf}
            style={{ background: '#166534', borderColor: '#14532d' }}
          >
            <Download size={16} /> {isDownloadingPdf ? 'Downloading PDF...' : 'Save as PDF'}
          </button>
          <button type="button" className="secondary-btn" onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
          <Link to="/" className="secondary-btn">Back to home</Link>
        </div>
      </div>

      {/* Complete Submitted Admission Form for Review & PDF Print */}
      <div className="cms-paper-wrapper" style={{ marginTop: '24px', width: '100%', maxWidth: '820px' }}>
        <div className="screen-only" style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>Submitted Application Form</h3>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Application No: <strong>#{applicationId}</strong></span>
        </div>
        <AdmissionPaperView
          draft={targetApp}
          adminNumber={applicationId}
          isEditableConsultant={false}
        />
      </div>
    </main>
  );
}
