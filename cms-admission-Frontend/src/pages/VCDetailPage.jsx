import { Download, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ApplicationDocuments from '../components/ApplicationDocuments';
import { downloadApplicationsCsv } from '../utils/helpers';

export default function VCDetailPage() {
  const { id } = useParams();
  const { applications } = useAppContext();
  const application = applications.find((item) => item.id === id && (item.status === 'Sent to VC' || item.status === 'Confirmed' || item.status === 'Confirm'));

  if (!application) {
    return (
      <main className="page-shell preview-shell">
        <div className="content-panel empty-panel">
          <h2>Application unavailable</h2>
          <p>The record is either missing or it has not been sent to the VC list by the admission office.</p>
          <Link to="/vc/dashboard" className="primary-btn">Return to VC list</Link>
        </div>
      </main>
    );
  }

  const triggerCsv = () => {
    downloadApplicationsCsv([application], `${application.id}.csv`);
  };

  return (
    <main className="page-shell preview-shell">
      <section className="content-panel application-preview">
        <div className="section-header space-between">
          <div>
            <p className="eyebrow accent">Admission office forwarded record</p>
            <h2>{application.studentName}</h2>
          </div>
          <div className="preview-brand"><img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" /> <span>Admin No: {application.formNumber || application.id}</span></div>
        </div>

        <div className="preview-grid two-column">
          <div className="preview-block">
            <h3>Student & Personal details</h3>
            <ul>
              <li><span>Student name</span><strong>{application.studentName}</strong></li>
              <li><span>Email ID</span><strong>{application.email || 'â€”'}</strong></li>
              <li><span>EMIS ID</span><strong>{application.emisId || 'â€”'}</strong></li>
              <li><span>Date of birth</span><strong>{application.dateOfBirth || 'â€”'}</strong></li>
              <li><span>Gender</span><strong>{application.gender || 'â€”'}</strong></li>
              <li><span>Aadhaar number</span><strong>{application.aadhaar || 'â€”'}</strong></li>
              <li><span>Blood group</span><strong>{application.bloodGroup || 'â€”'}</strong></li>
              <li><span>Community / Category</span><strong>{`${application.community || 'â€”'} / ${application.category || 'â€”'}`}</strong></li>
              <li><span>Mobile number</span><strong>{application.studentMobile ? `+91 ${application.studentMobile}` : 'â€”'}</strong></li>
              <li><span>Address</span><strong>{application.communicationAddress || 'â€”'}</strong></li>
              <li><span>District / State / PIN</span><strong>{`${application.district || 'â€”'}, ${application.state || 'â€”'} - ${application.pinCode || 'â€”'}`}</strong></li>
            </ul>
          </div>

          <div className="preview-block">
            <h3>Programme & Academic details</h3>
            <ul>
              <li><span>Admission category</span><strong>{application.admissionCategory}</strong></li>
              <li><span>Programme / Degree</span><strong>{`${application.programme || 'â€”'} - ${application.degree || 'â€”'}`}</strong></li>
              <li><span>First preference course</span><strong>{application.coursePreference?.firstPreference || 'â€”'}</strong></li>
              <li><span>First Graduate (FG)</span><strong>{application.firstGraduate || 'â€”'}</strong></li>
              <li><span>Status</span><strong>{application.status}</strong></li>
              <li><span>School name & address</span><strong>{`${application.schoolName || 'â€”'}, ${application.schoolAddress || 'â€”'}`}</strong></li>
              <li><span>Class 12 / HSC marks</span><strong>{`${application.hscMarks ?? 'â€”'} / 600`}</strong></li>
              <li><span>Mathematics</span><strong>{`${application.mathematics ?? 'â€”'} / 100`}</strong></li>
              <li><span>Physics</span><strong>{`${application.physicsMarks ?? application.physicsTheory ?? 'â€”'} / 100`}</strong></li>
              <li><span>Chemistry</span><strong>{`${application.chemistryMarks ?? application.chemistryTheory ?? 'â€”'} / 100`}</strong></li>
              <li><span>Cut-off marks</span><strong>{application.cutOffMarks ? Number(application.cutOffMarks).toFixed(2) : 'â€”'} / 200</strong></li>
            </ul>
          </div>

          <div className="preview-block">
            <h3>Parents & Guardian</h3>
            <ul>
              <li><span>Father</span><strong>{`${application.fatherName || 'â€”'} (${application.fatherOccupation || 'â€”'}) Â· ${application.fatherMobile || application.parentMobile || 'â€”'}`}</strong></li>
              <li><span>Mother</span><strong>{`${application.motherName || 'â€”'} (${application.motherOccupation || 'â€”'}) Â· ${application.motherMobile || 'â€”'}`}</strong></li>
              <li><span>Guardian</span><strong>{`${application.guardianName || 'â€”'} (${application.guardianOccupation || 'â€”'}) Â· ${application.guardianMobile || 'â€”'}`}</strong></li>
            </ul>
          </div>

          <div className="preview-block">
            <h3>Accommodation & Declarations</h3>
            <ul>
              <li><span>Accommodation</span><strong>{application.accommodation || 'â€”'}</strong></li>
              <li><span>Bus route</span><strong>{application.busRoute || 'â€”'}</strong></li>
              <li><span>Transport requirements</span><strong>{application.transportRequirements || 'â€”'}</strong></li>
              <li><span>Student declaration</span><strong>{application.declaration ? 'Accepted' : 'Not accepted'}</strong></li>
              <li><span>Parent declaration</span><strong>{application.parentDeclaration ? 'Accepted' : 'Not accepted'}</strong></li>
              <li><span>Cash receipt</span><strong>{application.cashReceipt?.name ? 'Uploaded' : 'Not uploaded'}</strong></li>
            </ul>
          </div>
        </div>

        <ApplicationDocuments
          documents={{
            ...(application.documents || {}),
            ...(application.cashReceipt?.dataUrl ? { cashReceipt: application.cashReceipt } : {}),
          }}
          signature={application.signature}
          studentSignature={application.studentSignature}
          parentSignature={application.parentSignature}
        />

        <div className="form-actions preview-actions">
          <Link to="/vc/dashboard" className="secondary-btn">Back to list</Link>
          <button type="button" className="secondary-btn" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
          <button type="button" className="primary-btn" onClick={triggerCsv}><Download size={16} /> Export Excel/CSV</button>
        </div>
      </section>
    </main>
  );
}
