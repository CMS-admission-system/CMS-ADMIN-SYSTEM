import { Camera, Eye } from 'lucide-react';
import { calculateCutoff, formatDate } from '../utils/helpers';

function formatAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 12);
  return digits ? digits.replace(/(\d{4})(?=\d)/g, '$1 ') : '—';
}

export function PaperOption({ selected, label }) {
  return (
    <span className={`paper-option ${selected ? 'selected' : ''}`}>
      <span className="paper-checkbox" aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
      <span>{label}</span>
    </span>
  );
}

export const LEFT_COURSES = [
  { id: 'aids', label: 'ARTIFICIAL INTELLIGENCE & DATA SCIENCE' },
  { id: 'cse', label: 'COMPUTER SCIENCE & ENGG' },
  { id: 'ece', label: 'ELECTRONICS AND COMMUNICATION ENGG' },
  { id: 'mech', label: 'MECHANICAL ENGG' },
];

export const RIGHT_COURSES = [
  { id: 'biomed', label: 'BIO - MEDICAL ENGG' },
  { id: 'cyber', label: 'CSE- CYBER SECURITY' },
  { id: 'eee', label: 'ELECTRICAL AND ELECTRONICS ENGG' },
  { id: 'aiml', label: 'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING', subtext: '*Awaiting Anna University approval' },
];

export function isCourseChosen(courseItem, selectedCourse) {
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

export function getCalculatedTotalFees(draft = {}, cutoff = 0) {
  // If draft has authoritative backend feeCalculation snapshot
  const calc = draft?.feeCalculation;
  if (calc?.fee_breakdown?.final_payable_amount !== undefined || calc?.formatted?.final_payable_amount) {
    const fmt = calc.formatted || {};
    const fb = calc.fee_breakdown || {};
    const totalVal = fmt.final_payable_amount || fmt.total_fees || (fb.final_payable_amount !== undefined ? `₹${Number(fb.final_payable_amount).toLocaleString('en-IN')}` : null);
    const admVal = fmt.admission_fee || '₹5,000';
    if (totalVal) {
      return {
        admissionFee: admVal,
        totalFees: totalVal,
      };
    }
  }

  // Fallback calculation using official 2026-2027 fee rules
  const dept = String(draft?.coursePreference?.firstPreference || draft?.department || '').toUpperCase();
  const isLowCostDept = dept.includes('EEE') || dept.includes('MECH') || dept.includes('ELECTRICAL AND ELECTRONICS') || dept.includes('MECHANICAL');
  const isFg = String(draft?.firstGraduate || '').toLowerCase() === 'yes';

  // Base tuition: 80,000 / 55,000 or 60,000 / 35,000
  let tuition = isLowCostDept ? (isFg ? 35000 : 60000) : (isFg ? 55000 : 80000);

  // Cut-off Concession
  const cutoffVal = Number(cutoff) || 0;
  let concession = 0;
  if (cutoffVal >= 170) {
    concession = tuition;
  } else if (cutoffVal >= 160) {
    concession = tuition * 0.75;
  } else if (cutoffVal >= 150) {
    concession = tuition * 0.50;
  } else if (cutoffVal >= 140) {
    concession = tuition * 0.25;
  } else if (cutoffVal >= 130) {
    concession = 10000;
  } else if (cutoffVal >= 125) {
    concession = 5000;
  }
  const finalTuition = Math.max(0, tuition - concession);

  // Hostel (₹45,000 if Hostel, 0 if Day Scholar)
  const isHostel = draft?.accommodation === 'Hostel';
  const hostelFee = isHostel ? 45000 : 0;

  // Transport
  let transportFee = 0;
  const transportReq = String(draft?.transportRequired || '').toLowerCase() === 'yes';
  const pickup = String(draft?.pickupPoint || draft?.boardingStop || '').toLowerCase();
  if (transportReq || pickup) {
    if (pickup.includes('local') || pickup.includes('namakkal')) {
      transportFee = 5000;
    } else if (pickup.includes('above 25') || pickup.includes('>25')) {
      transportFee = 12500;
    } else if (pickup.includes('25') || pickup.includes('within')) {
      transportFee = 7500;
    } else if (!isHostel) {
      transportFee = 5000;
    }
  }

  // Total Fees excludes Admission Fee (₹5,000)
  const totalFees = finalTuition + hostelFee + transportFee;

  return {
    admissionFee: '₹5,000',
    totalFees: `₹${totalFees.toLocaleString('en-IN')}`,
  };
}

export const feeStructureRows = [
  { item: 'ADMISSION FEES (one time)', amount: '5000' },
  { item: 'TOTAL FEES', amount: 'Category based' },
];

export default function AdmissionPaperView({
  draft = {},
  adminNumber = '1888',
  consultantName = '',
  organizationName = '',
  onConsultantChange,
  onOrganizationChange,
  isEditableConsultant = false,
  onViewFile,
}) {
  const display = (val) => (val === undefined || val === null || String(val).trim() === '' ? '—' : String(val));

  const cutoff = calculateCutoff({
    mathematics: draft?.mathematics,
    physics: draft?.physicsMarks,
    chemistry: draft?.chemistryMarks,
  });

  const feeInfo = getCalculatedTotalFees(draft, cutoff);

  const admCat = String(draft.admissionCategory || draft.category || '').toUpperCase();
  const isGQ = admCat.includes('GQ') || admCat.includes('COUNSELL') || admCat.includes('GOVERNMENT');
  const isMQ = admCat.includes('MQ') || admCat.includes('MANAGEMENT');

  const fg = String(draft.firstGraduate || '').toLowerCase();
  const isFGYes = fg === 'yes' || fg === 'true';
  const isFGNo = fg === 'no' || fg === 'false' || (!isFGYes && fg !== '');

  const sports = String(draft.sportsCategory || '').toLowerCase();
  const isSportsYes = sports === 'yes' || sports === 'true';
  const isSportsNo = sports === 'no' || sports === 'false' || (!isSportsYes && sports !== '');

  const gender = String(draft.gender || '').toUpperCase();
  const isMale = gender.includes('MALE') && !gender.includes('FE');
  const isFemale = gender.includes('FEMALE');
  const isOther = !isMale && !isFemale && draft.gender;

  const accom = String(draft.accommodation || '').toLowerCase();
  const isHostelYes = accom.includes('hostel');
  const isHostelNo = accom.includes('day') || (!isHostelYes && draft.accommodation);

  const selectedCourse = draft.coursePreference?.firstPreference || draft.department || '';

  const studentPhoto = draft.photoUrl || draft.studentPhoto?.dataUrl || draft.photo?.dataUrl || null;
  const studentSig = draft.studentSignature?.dataUrl || draft.signature?.dataUrl || null;
  const parentSig = draft.parentSignature?.dataUrl || null;

  const docs = draft.documents || {};
  const docSSLC = !!docs.SSLC?.dataUrl;
  const docHSC = !!docs.HSC?.dataUrl;
  const docTC = !!docs.TC?.dataUrl;
  const docCC = !!docs.CommunityCertificate?.dataUrl || !!docs.CC?.dataUrl;
  const docNativity = !!docs.NativityCertificate?.dataUrl;
  const docIncome = !!docs.IncomeCertificate?.dataUrl;
  const docAadhaar = !!docs.AadhaarCard?.dataUrl;
  const docFG = !!docs.FirstGraduateCertificate?.dataUrl || !!docs.FG?.dataUrl;
  const docPhoto = !!docs.PassportSizePhotographs?.dataUrl || !!studentPhoto;

  const effectiveConsultant = consultantName || draft.consultantName || '';
  const effectiveOrg = organizationName || draft.organizationName || '';

  const isVocational = String(draft.hscGroup || '').toLowerCase().includes('vocational');

  return (
    <article className="cms-paper-form admission-paper-sheet">
      {/* Header matching authentic Reference Images 1 & 2 */}
      <header className="cms-paper-header">
        <div className="cms-branding-top">
          <div className="cms-branding-left">
            <img src="/cms-logo.png" alt="CMS College of Engineering Logo" className="cms-header-logo" />
            <div>
              <h1 className="cms-college-title">CMS COLLEGE OF ENGINEERING</h1>
              <p className="cms-college-motto">Nurturing Minds Through Innovative Education</p>
              <p className="cms-college-status">(AUTONOMOUS STATUS AWARDED BY UGC, New Delhi)</p>
              <p className="cms-college-address">CMS Nagar, Ernapuram post, Near Collectorate, Namakkal - 637 003</p>
              <p className="cms-college-affiliation">(Approved by the AICTE New Delhi and affiliated to Anna University)</p>
            </div>
          </div>

          <div className="cms-header-right">
            <div
              className="cms-photo-single"
              title="Student Photograph"
              style={{
                width: '95px',
                height: '115px',
                border: '1.5px solid #006747',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}
            >
              {studentPhoto ? (
                <img
                  src={studentPhoto}
                  alt="Student"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.68rem', padding: '4px' }}>
                  <Camera size={22} style={{ margin: '0 auto 4px', display: 'block', color: '#94a3b8' }} />
                  <span>Affix Photo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Consultant and Organization Details */}
        <div className="cms-consultant-strip">
          <div className="cms-consultant-field">
            <label htmlFor="preview-consultant">Consultant Name:</label>
            {isEditableConsultant ? (
              <input
                id="preview-consultant"
                type="text"
                placeholder="Enter consultant name"
                value={effectiveConsultant}
                onChange={(e) => onConsultantChange && onConsultantChange(e.target.value)}
                className="cms-consultant-input"
              />
            ) : (
              <strong style={{ marginLeft: '6px', color: '#0f172a' }}>{effectiveConsultant || '—'}</strong>
            )}
          </div>
          <div className="cms-consultant-field">
            <label htmlFor="preview-org">Organization Name:</label>
            {isEditableConsultant ? (
              <input
                id="preview-org"
                type="text"
                placeholder="Enter organization name"
                value={effectiveOrg}
                onChange={(e) => onOrganizationChange && onOrganizationChange(e.target.value)}
                className="cms-consultant-input"
              />
            ) : (
              <strong style={{ marginLeft: '6px', color: '#0f172a' }}>{effectiveOrg || '—'}</strong>
            )}
          </div>
        </div>
      </header>

      {/* Form No, Admission Form Title & Date */}
      <div className="cms-form-title-bar">
        <span>Admin / Form No: <strong># {adminNumber}</strong></span>
        <span className="cms-form-title">ADMISSION FORM</span>
        <span>Date: <strong>{formatDate(draft.applicationDate || draft.submittedAt || new Date())}</strong></span>
      </div>

      {/* Personal & Academic Details Table */}
      <table className="cms-paper-table">
        <tbody>
          <tr>
            <th style={{ width: '30%' }}>CATEGORY OF ADMISSION</th>
            <td style={{ width: '70%' }}>
              <PaperOption selected={isGQ} label="GQ (Counselling)" />
              <PaperOption selected={isMQ} label="MQ (Management)" />
            </td>
          </tr>
          <tr>
            <th>FIRST GRADUATE</th>
            <td>
              <PaperOption selected={isFGYes} label="YES" />
              <PaperOption selected={isFGNo} label="NO" />
            </td>
          </tr>
          <tr>
            <th>SPORTS CATEGORY</th>
            <td>
              <PaperOption selected={isSportsYes} label="YES" />
              <PaperOption selected={isSportsNo} label="NO" />
            </td>
          </tr>
          <tr>
            <th>COURSE &amp; DEPARTMENT PREFERRED</th>
            <td style={{ fontWeight: 700, color: '#166534' }}>
              {draft.degree ? `${draft.degree} — ` : ''}{selectedCourse || '—'}
              {draft.programme ? <span style={{ marginLeft: '8px', color: '#64748b', fontWeight: 500, fontSize: '0.78rem' }}>({draft.programme})</span> : null}
            </td>
          </tr>
          <tr>
            <th>NAME OF THE STUDENT</th>
            <td style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
              {display(String(draft.studentName || '').toUpperCase())}
            </td>
          </tr>
          <tr>
            <th>FATHER&apos;S NAME &amp; OCCUPATION</th>
            <td>
              {display(draft.fatherName)} {draft.fatherOccupation ? `& ${draft.fatherOccupation}` : ''}
            </td>
          </tr>
          <tr>
            <th>MOTHER&apos;S NAME &amp; OCCUPATION</th>
            <td>
              {display(draft.motherName)} {draft.motherOccupation ? `& ${draft.motherOccupation}` : ''}
            </td>
          </tr>
          <tr>
            <th>DATE OF BIRTH</th>
            <td>{display(formatDate(draft.dateOfBirth))}</td>
          </tr>
          <tr>
            <th>GENDER</th>
            <td>
              <PaperOption selected={isMale} label="MALE" />
              <PaperOption selected={isFemale} label="FEMALE" />
              {isOther ? <PaperOption selected={true} label={`OTHER (${draft.gender})`} /> : null}
            </td>
          </tr>
          <tr>
            <th>AADHAAR NUMBER</th>
            <td style={{ letterSpacing: '1px' }}>{formatAadhaar(draft.aadhaar)}</td>
          </tr>
          <tr>
            <th>STUDENT&apos;S MOBILE NO</th>
            <td>{draft.studentMobile ? `+91 ${draft.studentMobile}` : '—'}</td>
          </tr>
          <tr>
            <th>FATHER&apos;S &amp; MOTHER&apos;S MOBILE NO</th>
            <td>
              Father: <strong>{draft.fatherMobile || draft.parentMobile ? `+91 ${draft.fatherMobile || draft.parentMobile}` : '—'}</strong>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              Mother: <strong>{draft.motherMobile ? `+91 ${draft.motherMobile}` : '—'}</strong>
            </td>
          </tr>
          {draft.guardianName ? (
            <tr>
              <th>GUARDIAN&apos;S DETAILS</th>
              <td>
                Name: <strong>{display(draft.guardianName)}</strong>
                {draft.guardianOccupation ? <> &nbsp;|&nbsp; Occupation: <strong>{draft.guardianOccupation}</strong></> : null}
                {draft.guardianMobile ? <> &nbsp;|&nbsp; Mobile: <strong>+91 {draft.guardianMobile}</strong></> : null}
              </td>
            </tr>
          ) : null}
          <tr>
            <th>STUDENT EMAIL ID</th>
            <td>
              <strong>{display(draft.email)}</strong>
            </td>
          </tr>
          <tr>
            <th>COMMUNITY</th>
            <td>
              <strong>{display(draft.community)}</strong> {draft.category ? `(${draft.category})` : ''}
            </td>
          </tr>
          <tr>
            <th>BLOOD GROUP</th>
            <td>
              <strong>{draft.bloodGroup === 'Others' && draft.bloodGroupOther ? `Others (${draft.bloodGroupOther})` : display(draft.bloodGroup)}</strong>
            </td>
          </tr>
          <tr>
            <th>HOSTEL ACCOMMODATION</th>
            <td>
              <PaperOption selected={isHostelYes} label="YES" />
              <PaperOption selected={isHostelNo} label="NO" />
            </td>
          </tr>
          <tr>
            <th>BOARDING PLACE – ROUTE</th>
            <td>
              {isHostelYes ? (
                'Hosteller (No Route)'
              ) : draft.transportRequired === 'Yes' || draft.busNumber || draft.pickupPoint ? (
                <span>
                  <strong>{draft.boardingStop || draft.pickupPoint || 'Boarding Stage'}</strong>
                  {draft.busNumber ? ` (Bus: ${draft.busNumber})` : (draft.busRoute ? ` (Route: ${draft.busRoute})` : '')}
                  {draft.pickupPoint && draft.pickupPoint !== draft.boardingStop ? ` — Route: ${draft.pickupPoint}` : ''}
                </span>
              ) : (
                'Day Scholar (Self Transport)'
              )}
            </td>
          </tr>
          <tr>
            <th>ADDRESS FOR COMMUNICATION</th>
            <td>
              {[draft.communicationAddress, draft.district, draft.state, draft.pinCode ? `PIN: ${draft.pinCode}` : ''].filter(Boolean).join(', ') || '—'}
            </td>
          </tr>
          <tr>
            <th>NAME OF THE SCHOOL &amp; ADDRESS</th>
            <td>
              {[draft.schoolName, draft.schoolAddress].filter(Boolean).join(', ') || '—'}
              {draft.hscGroup ? <span style={{ display: 'block', fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>Group: {draft.hscGroup}</span> : null}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Details of Marks Obtained */}
      <div className="cms-section-header">DETAILS OF MARKS OBTAINED</div>
      <table className="cms-paper-table" style={{ textAlign: 'center', marginTop: '-1px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'center', width: '20%' }}>{isVocational ? 'RELATED MATHS' : 'MATHS'}</th>
            <th style={{ textAlign: 'center', width: '25%' }}>{isVocational ? 'VOCATIONAL THEORY' : 'PHYSICS (THEORY + PRACTICAL)'}</th>
            <th style={{ textAlign: 'center', width: '25%' }}>{isVocational ? 'VOCATIONAL PRACTICAL' : 'CHEMISTRY (THEORY + PRACTICAL)'}</th>
            <th style={{ textAlign: 'center', width: '15%' }}>CUT-OFF (200)</th>
            <th style={{ textAlign: 'center', width: '15%' }}>TOTAL (600)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 700 }}>{display(draft.mathematics)}</td>
            <td style={{ fontWeight: 700 }}>{display(draft.physicsMarks)}</td>
            <td style={{ fontWeight: 700 }}>{display(draft.chemistryMarks)}</td>
            <td style={{ fontWeight: 700, color: '#006747' }}>{cutoff !== null ? cutoff.toFixed(2) : '—'}</td>
            <td style={{ fontWeight: 700 }}>{display(draft.hscMarks)}</td>
          </tr>
        </tbody>
      </table>

      {/* Courses (B.E/B.TECH) Preferred */}
      <div className="cms-section-header">
        COURSES ({draft.degree || 'B.E/B.TECH'}) PREFERRED
        {selectedCourse ? <span style={{ marginLeft: '10px', color: '#166534', fontWeight: 800 }}>— {draft.degree ? `${draft.degree} ` : ''}{selectedCourse}</span> : null}
      </div>
      <div className="cms-courses-grid">
        <div>
          {LEFT_COURSES.map((course) => {
            const chosen = isCourseChosen(course, selectedCourse);
            return (
              <div key={course.id} className={`cms-course-item ${chosen ? 'selected' : ''}`}>
                <span className="paper-checkbox" aria-hidden="true">{chosen ? '✓' : ''}</span>
                <span>{course.label}</span>
              </div>
            );
          })}
        </div>
        <div>
          {RIGHT_COURSES.map((course) => {
            const chosen = isCourseChosen(course, selectedCourse);
            return (
              <div key={course.id} className={`cms-course-item ${chosen ? 'selected' : ''}`}>
                <span className="paper-checkbox" aria-hidden="true">{chosen ? '✓' : ''}</span>
                <div>
                  <span>{course.label}</span>
                  {course.subtext ? <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b' }}>{course.subtext}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedCourse && !LEFT_COURSES.some((c) => isCourseChosen(c, selectedCourse)) && !RIGHT_COURSES.some((c) => isCourseChosen(c, selectedCourse)) ? (
        <div style={{ marginTop: '6px' }}>
          <div className="cms-course-item selected">
            <span className="paper-checkbox" aria-hidden="true">✓</span>
            <span>{selectedCourse.toUpperCase()} ({draft.degree || 'Course'})</span>
          </div>
        </div>
      ) : null}

      {/* Fees Structure */}
      <div className="cms-section-header" style={{ marginTop: '8px' }}>FEES STRUCTURE</div>
      <table className="cms-fees-table">
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ textAlign: 'left', width: '75%' }}>Particulars</th>
            <th style={{ textAlign: 'right', width: '25%' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Admission Fee (One-Time)</strong>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>One-time registration fee (Paid separately · Not added to total fees)</div>
            </td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{feeInfo.admissionFee}</td>
          </tr>
          <tr style={{ background: '#f8fafc' }}>
            <td>
              <strong style={{ fontSize: '0.85rem', color: '#000000' }}>TOTAL FEES</strong>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Admin-configured total fees (Excluding admission fee)</div>
            </td>
            <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.95rem', color: '#004d38' }}>
              {feeInfo.totalFees}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Digital Signatures for Student and Parent */}
      <div className="cms-signatures-row">
        <div className="cms-signature-block">
          {studentSig ? (
            <img src={studentSig} alt="Signature of the Student" className="cms-signature-img" />
          ) : (
            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>Digital signature recorded</span>
          )}
          <span className="cms-signature-label">SIGNATURE OF THE STUDENT</span>
        </div>
        <div className="cms-signature-block" style={{ textAlign: 'right', alignItems: 'flex-end' }}>
          {parentSig ? (
            <img src={parentSig} alt="Signature of the Parent" className="cms-signature-img" />
          ) : (
            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>Digital signature recorded</span>
          )}
          <span className="cms-signature-label">SIGNATURE OF THE PARENT</span>
        </div>
      </div>

      {/* FOR OFFICE USE ONLY — CERTIFICATES SUBMITTED Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 4px', fontWeight: 800, fontSize: '0.76rem' }}>
        <span>FOR OFFICE USE ONLY</span>
        <span style={{ textDecoration: 'underline' }}>CERTIFICATES SUBMITTED</span>
        <span style={{ visibility: 'hidden' }}>OFFSET</span>
      </div>

      <table className="cms-office-table">
        <thead>
          <tr>
            <th style={{ width: '13%' }}>SUBMITTED TYPE</th>
            <th>SSLC</th>
            <th>HSC</th>
            <th>TC</th>
            <th>CC</th>
            <th>NATIVITY CERTIFICATE</th>
            <th>INCOME CERTIFICATE</th>
            <th>AADHAAR CARD</th>
            <th>F.G</th>
            <th>PHOTO Nos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={{ textAlign: 'left' }}>ORIGINAL</th>
            <td>{docSSLC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docHSC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docTC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docCC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docNativity ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docIncome ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docAadhaar ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docFG ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docPhoto ? '4' : '—'}</td>
          </tr>
          <tr>
            <th style={{ textAlign: 'left' }}>XEROX</th>
            <td>{docSSLC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docHSC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docTC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docCC ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docNativity ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docIncome ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docAadhaar ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>{docFG ? <span className="cms-cert-submitted">✓</span> : '—'}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      {/* Interactive Document Preview Buttons in Screen Mode */}
      {onViewFile ? (
        <div className="screen-only" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0 10px', fontSize: '0.74rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#475569' }}>Uploaded Certificates:</span>
          {Object.entries(docs).filter(([, file]) => file?.dataUrl).map(([key, file]) => (
            <button
              key={key}
              type="button"
              className="secondary-btn compact"
              style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={() => onViewFile({ title: key, file })}
            >
              <Eye size={12} /> {key === 'CC' || key === 'CommunityCertificate' ? 'Community' : key.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
          {!Object.values(docs).some((f) => f?.dataUrl) ? <span style={{ color: '#94a3b8' }}>None uploaded yet</span> : null}
        </div>
      ) : null}

      {/* REFERENCE Box */}
      <div className="cms-reference-box">
        <div className="cms-reference-title">REFERENCE</div>
        <div className="cms-reference-content">
          <div><strong>Consultant Name:</strong> {effectiveConsultant || '—'}</div>
          <div><strong>Organization Name:</strong> {effectiveOrg || '—'}</div>
        </div>
      </div>

      {/* Bottom Authorities Signatures */}
      <div className="cms-authorities-row">
        <span>ADMISSION OFFICER</span>
        <span>VICE-CHAIRMAN</span>
      </div>
    </article>
  );
}
