import { useState } from 'react';
import { ArrowLeft, CreditCard, Download, Eye, Printer, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { calculateCutoff, downloadElementAsPdf } from '../utils/helpers';
import { sendApplicationStatusEmail } from '../services/api';
import AdmissionPaperView from '../components/AdmissionPaperView';

function display(value) {
  return value === null || value === undefined || String(value).trim() === '' ? '—' : value;
}

function formatAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 12);
  return digits ? digits.replace(/(\d{4})(?=\d)/g, '$1 ') : '—';
}

function PaperOption({ selected, label }) {
  return (
    <span className={`paper-option ${selected ? 'selected' : ''}`}>
      <span className="paper-checkbox" aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
      <span>{label}</span>
    </span>
  );
}

const LEFT_COURSES = [
  { id: 'aids', label: 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE' },
  { id: 'cse', label: 'COMPUTER SCIENCE & ENGG' },
  { id: 'ece', label: 'ELECTRONICS AND COMMUNICATION ENGG' },
  { id: 'mech', label: 'MECHANICAL ENGG' },
];

const RIGHT_COURSES = [
  { id: 'biomed', label: 'BIO - MEDICAL ENGG' },
  { id: 'cyber', label: 'CSE- CYBER SECURITY' },
  { id: 'eee', label: 'ELECTRICAL AND ELECTRONICS ENGG' },
  { id: 'aiml', label: 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', subtext: '*Awaiting Anna University approval' },
];

function isCourseChosen(courseItem, selectedCourse) {
  if (!selectedCourse) return false;
  const s = selectedCourse.toLowerCase().trim();
  const l = courseItem.label.toLowerCase();
  if (s === l) return true;
  if (courseItem.id === 'cse' && (s === 'cse' || (s.includes('computer') && !s.includes('cyber') && !s.includes('electrical')))) return true;
  if (courseItem.id === 'aids' && (s === 'ai&ds' || s === 'aids' || s.includes('data') || s.includes('aids') || s.includes('ai&ds'))) return true;
  if (courseItem.id === 'aiml' && (s === 'aiml' || s.includes('aiml') || s.includes('machine'))) return true;
  if (courseItem.id === 'cyber' && (s === 'cs' || s.includes('cyber') || s.includes('security'))) return true;
  if (courseItem.id === 'biomed' && (s === 'bme' || s.includes('biomed') || s.includes('bio'))) return true;
  if (courseItem.id === 'ece' && (s === 'ece' || s.includes('electronics') || s.includes('communication'))) return true;
  if (courseItem.id === 'eee' && (s === 'eee' || (s.includes('electrical') && !s.includes('computer')))) return true;
  if (courseItem.id === 'mech' && (s === 'mech' || s.includes('mechanical') || s.includes('mech'))) return true;
  return false;
}

const feeStructureRows = [
  { item: 'ADMISSION FEES (one time)', amount: '5000' },
  { item: 'CONSORTIUM FEES (one time)', amount: '550' },
  { item: 'RRA AMOUNT â€“ ONE TIME (ANNA UNIVERSITY)', amount: '2500' },
  { item: 'SPORTS FEESâ€“ ONE TIME (ANNA UNIVERSITY) (Four Years)', amount: '625' },
  { item: 'GROUP INSURANCE â€“ ONE TIME', amount: '100' },
  { item: 'SYLLABUS FEES ONE TIME (ANNA UNIVERSITY)', amount: '200' },
  { item: 'NSS FEES (ANNAUNIVERSITY)', amount: '25' },
  { item: 'LAB COAT', amount: '500' },
  { item: 'ID CARD', amount: '100' },
  { item: 'BOOK FEES & EXAM PAPER FEES (IN EVERY SEMESTER)', amount: '—' },
  { item: 'TUTION FEES â€“ FIRST GRADUATE (OC/BC/BC(M)/MBC & DNC)', amount: 'Category based' },
  { item: 'TUITION FEES â€“ NON-FIRST GRADUATE (OC/BC/BC(M)/MBC& DNC)', amount: 'Category based' },
  { item: 'TUITION FEES â€“ SC/SC(A)/ST/SCC', amount: 'Category based' },
  { item: 'HOSTEL FEES â€“ (OC/BC/BC(M)/MBC& DNC)', amount: 'Category based' },
  { item: 'HOSTEL FEES â€“ SC/SC(A)/ST/SCC', amount: 'Category based' },
  { item: 'HOSTEL / TRANSPORT APPLICATION FORM', amount: '50' },
  { item: 'TRANSPORT FEES (PER YEAR)', amount: '—' },
];

export default function ApplicationPreviewPage() {
  const navigate = useNavigate();
  const { draft, saveDraft, submitApplication } = useAppContext();
  const [staffViewName, setStaffViewName] = useState(draft?.staffViewName || '');
  const [staffViewCategory, setStaffViewCategory] = useState(draft?.staffViewCategory || '');
  const [consultantName, setConsultantName] = useState(draft?.consultantName || '');
  const [organizationName, setOrganizationName] = useState(draft?.organizationName || '');
  const [selectedFilePreview, setSelectedFilePreview] = useState(null);
  const [staffErrors, setStaffErrors] = useState({});
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const cutoff = calculateCutoff({
    mathematics: draft?.mathematics,
    physics: draft?.physicsMarks,
    chemistry: draft?.chemistryMarks,
  });

  if (!draft || !draft.studentName) {
    return (
      <main className="page-shell preview-shell">
        <div className="content-panel empty-panel">
          <h2>No application found</h2>
          <p>Please complete the registration form before previewing the application.</p>
          <button type="button" className="primary-btn" onClick={() => navigate('/register')}>Back to form</button>
        </div>
      </main>
    );
  }

  const isGQ = draft.admissionCategory === 'GQ' || draft.admissionCategory === 'Counselling' || draft.admissionCategory === 'Government Quota';
  const isMQ = draft.admissionCategory === 'MQ' || draft.admissionCategory === 'Management' || draft.admissionCategory === 'Management Quota';
  const isFGYes = String(draft.firstGraduate).toLowerCase() === 'yes';
  const isFGNo = String(draft.firstGraduate).toLowerCase() === 'no';
  const isSportsYes = String(draft.sportsCategory).toLowerCase() === 'yes';
  const isSportsNo = String(draft.sportsCategory).toLowerCase() === 'no';
  const isMale = String(draft.gender).toLowerCase() === 'male';
  const isFemale = String(draft.gender).toLowerCase() === 'female';
  const isOther = Boolean(draft.gender && !isMale && !isFemale);
  const isHostelYes = draft.accommodation === 'Hostel';
  const isHostelNo = draft.accommodation === 'Day Scholar' || String(draft.transportRequired).toLowerCase() === 'yes';

  const selectedCourse = draft.coursePreference?.firstPreference || '';
  const adminNumber = draft.formNumber || draft.id || 'CMS-2026-1001';
  const studentSig = (draft.studentSignature || draft.signature)?.dataUrl || null;
  const parentSig = draft.parentSignature?.dataUrl || null;
  const studentPhoto = draft.documents?.PassportSizePhotographs?.dataUrl
    || draft.documents?.StudentPhoto?.dataUrl
    || draft.studentPhoto?.dataUrl
    || draft.studentPhoto
    || null;

  const docs = draft.documents || {};
  const docSSLC = docs.SSLC;
  const docHSC = docs.HSC;
  const docTC = docs.TC;
  const docCC = docs.CommunityCertificate || docs.CC;
  const docNativity = docs.NativityCertificate;
  const docIncome = docs.IncomeCertificate;
  const docAadhaar = docs.AadhaarCard;
  const docFG = docs.FirstGraduateCertificate || docs.FG;
  const docPhoto = docs.PassportSizePhotographs;

  const validateStaffView = () => {
    const nextErrors = {};
    if (!String(staffViewName || '').trim()) {
      nextErrors.name = 'Staff name is mandatory. Please enter staff name.';
    }
    if (!String(staffViewCategory || '').trim()) {
      nextErrors.category = 'Staff category is mandatory. Please enter staff category.';
    }
    setStaffErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateMandatoryDocs = () => {
    const hasAadhaar = Boolean(draft?.documents?.AadhaarCard?.dataUrl);
    const hasSslc = Boolean(draft?.documents?.SSLC?.dataUrl);
    const hasPhoto = Boolean(draft?.documents?.PassportSizePhotographs?.dataUrl || draft?.studentPhoto?.dataUrl || draft?.photoUrl);
    if (!hasAadhaar || !hasSslc || !hasPhoto) {
      const missing = [];
      if (!hasSslc) missing.push('SSLC Certificate');
      if (!hasAadhaar) missing.push('Aadhaar Card');
      if (!hasPhoto) missing.push('Student Photograph');
      window.alert(`Cannot submit application: The following compulsory document(s) are missing:\n- ${missing.join('\n- ')}\n\nPlease click Previous and upload them in the Documents step.`);
      return false;
    }
    return true;
  };

  const handleSavePdf = async () => {
    const cleanName = String(draft.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `CMS_Admission_Form_${adminNumber}_${cleanName}.pdf`;
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
    const cleanName = String(draft.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `CMS_Admission_Form_${adminNumber}_${cleanName}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const handleEnquiring = async () => {
    if (!validateMandatoryDocs()) return;
    if (!validateStaffView()) {
      const el = document.querySelector('.staff-view-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const sName = String(staffViewName || '').trim();
    const sCat = String(staffViewCategory || '').trim();
    const application = await submitApplication({
      ...draft,
      id: adminNumber,
      formNumber: adminNumber,
      status: 'Enquiring',
      staffViewName: sName,
      staffViewCategory: sCat,
      consultantName,
      organizationName,
      cutOffMarks: cutoff ?? '',
    });

    if (draft.email) {
      sendApplicationStatusEmail({
        to: draft.email,
        studentName: draft.studentName || 'Student',
        applicationId: application?.id || adminNumber,
        status: 'Enquiring',
        course: draft.coursePreference?.firstPreference || draft.department,
        applicationDetails: { ...draft, id: application?.id || adminNumber, status: 'Enquiring' },
      }).catch((err) => console.warn('Email dispatch notice:', err));
    }

    navigate(`/application-success?id=${encodeURIComponent(application?.id || adminNumber)}`);
  };

  const handleConfirmSeat = () => {
    if (!validateMandatoryDocs()) return;
    if (!validateStaffView()) {
      const el = document.querySelector('.staff-view-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const sName = String(staffViewName || '').trim();
    const sCat = String(staffViewCategory || '').trim();
    saveDraft({
      ...draft,
      id: adminNumber,
      formNumber: adminNumber,
      staffViewName: sName,
      staffViewCategory: sCat,
      consultantName,
      organizationName,
      cutOffMarks: cutoff ?? '',
    });
    navigate('/payment');
  };

  return (
    <main className="page-shell preview-shell" style={{ padding: '16px 10px' }}>
      <div className="cms-paper-wrapper">
        <AdmissionPaperView
          draft={draft}
          adminNumber={adminNumber}
          consultantName={consultantName}
          organizationName={organizationName}
          onConsultantChange={(val) => {
            setConsultantName(val);
            saveDraft({ ...draft, consultantName: val });
          }}
          onOrganizationChange={(val) => {
            setOrganizationName(val);
            saveDraft({ ...draft, organizationName: val });
          }}
          isEditableConsultant={true}
          onViewFile={(fileInfo) => setSelectedFilePreview(fileInfo)}
        />

        {/* Staff View Section (Screen Only) */}
        <section className="staff-view-section screen-only" style={{ marginTop: '16px' }}>
          <h3>Staff view</h3>
          <div className="staff-view-fields">
            <div className="field-group">
              <label htmlFor="staff-view-name">
                Staff name <span className="required-indicator" style={{ color: '#006747' }}>*</span>
              </label>
              <input
                id="staff-view-name"
                type="text"
                required
                value={staffViewName}
                onChange={(event) => {
                  setStaffViewName(event.target.value);
                  if (staffErrors.name) setStaffErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Type staff name"
              />
              {staffErrors.name ? <small className="error-text" style={{ color: '#dc2626', fontWeight: 600, display: 'block', marginTop: '4px' }}>{staffErrors.name}</small> : null}
            </div>
            <div className="field-group">
              <label htmlFor="staff-view-category">
                Staff category <span className="required-indicator" style={{ color: '#006747' }}>*</span>
              </label>
              <input
                id="staff-view-category"
                type="text"
                required
                value={staffViewCategory}
                onChange={(event) => {
                  setStaffViewCategory(event.target.value);
                  if (staffErrors.category) setStaffErrors((prev) => ({ ...prev, category: '' }));
                }}
                placeholder="Type staff category"
              />
              {staffErrors.category ? <small className="error-text" style={{ color: '#dc2626', fontWeight: 600, display: 'block', marginTop: '4px' }}>{staffErrors.category}</small> : null}
            </div>
          </div>
        </section>

        {/* Action Boxes (Screen Only) */}
        <section className="preview-action-boxes screen-only" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Enquiring Box (Above) */}
          <div className="action-card-box enquiring-box" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '2px solid #2563eb',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e40af', fontWeight: 700 }}>Enquiry Submission</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                Submit student application to the admission office enquiry list for review and follow-up.
              </p>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={handleEnquiring}
              style={{ minWidth: '160px', background: '#2563eb', borderColor: '#1d4ed8' }}
            >
              <Send size={16} /> Enquiring
            </button>
          </div>

          {/* Confirm Box (At the bottom) */}
          <div className="action-card-box confirm-box" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '2px solid #166534',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#166534', fontWeight: 700 }}>Confirm Seat</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>
                Confirm candidate's seat and proceed to admission fee payment.
              </p>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={handleConfirmSeat}
              style={{ minWidth: '160px', background: '#166534', borderColor: '#14532d' }}
            >
              <CreditCard size={16} /> Confirm Seat
            </button>
          </div>
        </section>

        {/* Navigation & Print Actions (Screen Only) */}
        <div className="form-actions preview-actions screen-only" style={{ marginTop: '16px' }}>
          <button type="button" className="secondary-btn" onClick={() => navigate('/register?step=8')}>
            <ArrowLeft size={16} /> Previous
          </button>
          <button type="button" className="secondary-btn" onClick={handleSavePdf} disabled={isDownloadingPdf}>
            <Download size={16} /> {isDownloadingPdf ? 'Downloading PDF...' : 'Save as PDF'}
          </button>
          <button type="button" className="secondary-btn" onClick={handlePrint}>
            <Printer size={16} /> Print Application
          </button>
        </div>
      </div>

      {/* Modal for viewing uploaded documents */}
      {selectedFilePreview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedFilePreview.title}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close preview"
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
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    transform: `rotate(${Number(selectedFilePreview.file.rotation || 0)}deg)`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
