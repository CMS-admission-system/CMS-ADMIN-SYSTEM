import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Bus,
  CheckCircle2,
  Download,
  Eye,
  FileEdit,
  FileText,
  GraduationCap,
  Home,
  Image,
  LayoutGrid,
  LogOut,
  Printer,
  Save,
  Search,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import AdmissionPaperView from '../components/AdmissionPaperView';
import ApplicationDocuments from '../components/ApplicationDocuments';
import {
  downloadApplicationsCsv,
  downloadElementAsPdf,
  formatDate,
  DEFAULT_COURSE_SEAT_QUOTAS,
  normalizeCourseName,
  calculateCutoff,
} from '../utils/helpers';

const COURSE_GROUPS = [
  {
    groupTitle: 'Undergraduate (UG) — B.Tech Programmes',
    degree: 'B.Tech',
    level: 'UG',
    courses: [
      { code: 'AI&DS', fullName: 'Artificial Intelligence & Data Science', defaultSeats: 200 },
    ],
  },
  {
    groupTitle: 'Undergraduate (UG) — B.E Programmes',
    degree: 'B.E',
    level: 'UG',
    courses: [
      { code: 'CSE', fullName: 'Computer Science & Engineering', defaultSeats: 200 },
      { code: 'CS', fullName: 'CSE - Cyber Security', defaultSeats: 200 },
      { code: 'AIML', fullName: 'Artificial Intelligence & Machine Learning', defaultSeats: 200 },
      { code: 'BME', fullName: 'Bio-Medical Engineering', defaultSeats: 200 },
      { code: 'ECE', fullName: 'Electronics & Communication Engineering', defaultSeats: 200 },
      { code: 'EEE (Electrical and Electronics Engineering)', fullName: 'Electrical & Electronics Engineering', defaultSeats: 200 },
      { code: 'MECH', fullName: 'Mechanical Engineering', defaultSeats: 200 },
      { code: 'Electrical and Computer Engineering', fullName: 'Electrical and Computer Engineering', defaultSeats: 200 },
    ],
  },
  {
    groupTitle: 'Postgraduate (PG) — M.E Programmes',
    degree: 'M.E',
    level: 'PG',
    courses: [
      { code: 'VLSI', fullName: 'M.E - VLSI Design', defaultSeats: 200 },
      { code: 'ISE', fullName: 'M.E - Industrial Safety Engineering', defaultSeats: 200 },
      { code: 'M.E - CSE', fullName: 'M.E - Computer Science & Engineering', defaultSeats: 200 },
      { code: 'M.E - BME', fullName: 'M.E - Bio-Medical Engineering', defaultSeats: 200 },
    ],
  },
];

export default function VCDashboardPage() {
  const navigate = useNavigate();
  const {
    applications,
    logoutDemoUser,
    courseSeats,
    updateCourseSeats,
    backgroundSettings,
    setBackgroundSettings,
    paymentSettings,
    setPaymentSettings,
  } = useAppContext();

  // Navigation tab state: 'home' (Overall Forwarded Student List), 'overview' (Category Overview), 'seats' (Course Seats Quotas), or 'edit' (VC Portal Settings)
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('Transport');
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedStudentPreview, setSelectedStudentPreview] = useState(null);
  const [selectedFileModal, setSelectedFileModal] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfRenderStudent, setPdfRenderStudent] = useState(null);
  const [downloadingStudentId, setDownloadingStudentId] = useState(null);
  const [settingsNotice, setSettingsNotice] = useState('');

  // Exclusive VC Course Seat Editor state
  const [editableSeats, setEditableSeats] = useState({});
  const [isSavingSeats, setIsSavingSeats] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Sync draft seat quotas from context state
  useEffect(() => {
    if (courseSeats) {
      const draft = {};
      for (const [k, v] of Object.entries(courseSeats)) {
        draft[k] = typeof v === 'object' && v !== null && v.total !== undefined ? v.total : Number(v);
      }
      setEditableSeats((prev) => ({ ...draft, ...prev }));
    }
  }, [courseSeats]);

  const handleSeatChange = (courseName, newTotal) => {
    const parsed = newTotal === '' ? '' : Math.max(0, parseInt(newTotal, 10) || 0);
    setEditableSeats((prev) => ({
      ...prev,
      [courseName]: parsed,
    }));
  };

  const handleSaveSeats = async () => {
    setIsSavingSeats(true);
    setSaveSuccessMsg('');
    const payload = {};
    for (const [k, v] of Object.entries(editableSeats)) {
      payload[k] = v === '' ? 60 : Number(v);
    }
    const res = await updateCourseSeats(payload);
    setIsSavingSeats(false);
    if (res.ok) {
      setSaveSuccessMsg('Course seat quotas updated successfully in TiDB database!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } else {
      window.alert(res.error || 'Failed to update course seats.');
    }
  };

  // Ensure VC can view all applications forwarded by Admin/AO
  const sentToVC = applications.filter((app) => (
    app.status === 'Sent to VC' ||
    app.status === 'Forwarded to VC' ||
    app.status === 'Confirmed' ||
    app.status === 'Confirm'
  ));

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredSentToVC = sentToVC.filter((app) => [
    app.id,
    app.formNumber,
    app.studentName,
    app.emisId,
    app.coursePreference?.firstPreference,
    app.admissionCategory,
  ].some((field) => String(field || '').toLocaleLowerCase().includes(normalizedSearch)));

  const allSeatStats = useMemo(() => {
    let totalCap = 0;
    let totalFilled = 0;
    let totalBal = 0;
    let aidsBal = 200;

    for (const group of COURSE_GROUPS) {
      for (const course of group.courses) {
        const configuredTotal = editableSeats[course.code] !== undefined && editableSeats[course.code] !== ''
          ? Number(editableSeats[course.code])
          : (courseSeats?.[course.code]?.total ?? course.defaultSeats);

        const filled = applications.filter((app) => {
          const c = app.coursePreference?.firstPreference || app.courseName || '';
          return normalizeCourseName(c) === normalizeCourseName(course.code);
        }).length;

        const balance = Math.max(0, configuredTotal - filled);
        totalCap += configuredTotal;
        totalFilled += filled;
        totalBal += balance;

        if (course.code === 'AI&DS') {
          aidsBal = balance;
        }
      }
    }

    return { totalCap, totalFilled, totalBal, aidsBal };
  }, [editableSeats, courseSeats, applications]);

  // Category counts calculated exclusively from confirmed & paid student records from the database
  const confirmedStudents = applications.filter(
    (app) => (app.status === 'Confirmed' || app.status === 'Confirm' || app.status === 'Sent to VC')
      && app.paymentStatus !== 'Unpaid'
  );

  const transportList = confirmedStudents.filter(
    (a) => a.accommodation === 'Day Scholar' && (
      a.transportRequired === 'Yes' || a.transportApplication === 'Yes' || a.pickupPoint || a.busRoute
    )
  );
  const transportCount = transportList.length;

  const hostelList = confirmedStudents.filter((a) => a.accommodation === 'Hostel');
  const hostelCount = hostelList.length;

  const fgList = confirmedStudents.filter((a) => String(a.firstGraduate || '').toLowerCase() === 'yes');
  const fgCount = fgList.length;

  const sportsList = confirmedStudents.filter((a) => String(a.sportsCategory || '').toLowerCase() === 'yes');
  const sportsCount = sportsList.length;

  // Active category student list based on selected category
  const rawCategoryStudents = selectedCategory === 'Transport'
    ? transportList
    : selectedCategory === 'Hostel'
    ? hostelList
    : selectedCategory === 'FG'
    ? fgList
    : sportsList;

  const normalizedCatSearch = categorySearchTerm.trim().toLowerCase();
  const activeCategoryStudents = rawCategoryStudents.filter((app) => [
    app.id,
    app.formNumber,
    app.studentName,
    app.emisId,
    app.coursePreference?.firstPreference,
    app.busNumber,
    app.busRoute,
    app.boardingStop,
    app.pickupPoint,
  ].some((f) => String(f || '').toLowerCase().includes(normalizedCatSearch)));

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/vc', { replace: true });
  };

  const handleCsvExport = () => {
    downloadApplicationsCsv(filteredSentToVC, 'cms-vc-applications.csv');
  };

  const handleCategoryCsvExport = () => {
    downloadApplicationsCsv(activeCategoryStudents, `cms-vc-${selectedCategory.toLowerCase()}-students.csv`);
  };

  const handleFeeStructureUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      window.alert('Fee structure file must be smaller than 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const nextFee = {
        name: file.name,
        dataUrl,
        mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
      setPaymentSettings((prev) => ({
        ...prev,
        feeStructure: nextFee,
      }));
      setSettingsNotice('Official Fee Structure uploaded and saved successfully!');
      setTimeout(() => setSettingsNotice(''), 4500);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDeleteFeeStructure = () => {
    if (window.confirm('Are you sure you want to remove the uploaded Fee Structure?')) {
      setPaymentSettings((prev) => ({
        ...prev,
        feeStructure: null,
      }));
      setSettingsNotice('Fee Structure removed successfully.');
      setTimeout(() => setSettingsNotice(''), 4500);
    }
  };

  const handleBackgroundImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      window.alert('Background image must be smaller than 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const nextBg = {
        enabled: true,
        backgroundImageDataUrl: dataUrl,
        videoDataUrl: dataUrl,
        mimeType: file.type || 'image/jpeg',
        updatedAt: new Date().toISOString(),
      };
      setBackgroundSettings(nextBg);
      setSettingsNotice('Portal background image updated and saved successfully!');
      setTimeout(() => setSettingsNotice(''), 4500);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDeleteBackgroundImage = () => {
    if (window.confirm('Reset background to default college campus image?')) {
      setBackgroundSettings({
        enabled: true,
        backgroundImageDataUrl: '',
        videoDataUrl: '',
        mimeType: '',
        updatedAt: new Date().toISOString(),
      });
      setSettingsNotice('Background image reset to default campus image.');
      setTimeout(() => setSettingsNotice(''), 4500);
    }
  };

  const handleDownloadPdf = async (student) => {
    if (!student) return;
    setDownloadingStudentId(student.id);
    setPdfRenderStudent(student);

    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const cleanName = String(student.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `CMS_Admission_Form_${student.formNumber || student.id}_${cleanName}.pdf`;
      const targetElement = document.querySelector('#vc-pdf-render-slot .admission-paper-sheet, #vc-pdf-render-slot .cms-paper-form, .admission-paper-sheet, .cms-paper-form');
      if (!targetElement) {
        window.alert('Application form document sheet not found.');
        return;
      }
      setIsDownloadingPdf(true);
      await downloadElementAsPdf(targetElement, filename);
    } catch (err) {
      console.error('Error saving PDF:', err);
      window.alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
      setDownloadingStudentId(null);
      setPdfRenderStudent(null);
    }
  };

  return (
    <main className="page-shell admin-shell vc-shell">
      {/* 1. Green Navigation Box */}
      <aside className="admin-sidebar vc-top-header">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent" style={{ margin: 0 }}>Vice Chairman View</p>
            <strong style={{ fontSize: '1.15rem' }}>Vice Chairman View</strong>
          </div>
        </div>

        {/* RIGHT SIDE of Green Box: Home, Category Overview, Course Seats, Edit, Logout */}
        <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          <nav className="admin-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('home');
                setSelectedStudentPreview(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              title="Home: View Complete Overall Student List Sent by Admin"
            >
              <Home size={15} /> Home
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('overview');
                setSelectedStudentPreview(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              title="View Confirmed Category Overview (Transport, Hostel, FG, Sports)"
            >
              <LayoutGrid size={15} /> Category Overview
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'seats' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('seats');
                setSelectedStudentPreview(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              title="Manage Course Intake Seats & Quotas (VC Exclusive)"
            >
              <GraduationCap size={15} /> Course Seats
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'edit' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('edit');
                setSelectedStudentPreview(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              title="Portal Settings: Upload & Manage Fee Structure and Background Image"
            >
              <FileEdit size={15} /> Edit
            </button>
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
        {settingsNotice ? (
          <div style={{
            background: '#ecfdf5',
            border: '1.5px solid #10b981',
            borderRadius: '14px',
            padding: '12px 18px',
            color: '#065f46',
            fontWeight: 700,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}>
            <span>{settingsNotice}</span>
            <button
              type="button"
              onClick={() => setSettingsNotice('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46' }}
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        {selectedStudentPreview ? (
          <div className="content-panel" style={{ background: '#ffffff', borderRadius: '20px', padding: '24px 20px', marginBottom: '24px', border: '1.5px solid rgba(0,77,56,0.15)' }}>
            {/* Header with Back, Title, and PDF Export */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="secondary-btn compact"
                  onClick={() => setSelectedStudentPreview(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={16} /> Back to {activeTab === 'home' ? 'Student List' : (selectedCategory === 'FG' ? 'First Graduate' : selectedCategory) + ' List'}
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#004d38', fontWeight: 800 }}>
                    {selectedStudentPreview.studentName}
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Admin No: <strong>#{selectedStudentPreview.formNumber || selectedStudentPreview.id}</strong> · Status: <span className="badge badge-success" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Sent by AO</span>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="primary-btn compact"
                  onClick={() => handleDownloadPdf(selectedStudentPreview)}
                  disabled={isDownloadingPdf}
                  style={{ background: '#004d38', borderColor: '#003325', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={15} /> {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  className="secondary-btn compact"
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={15} /> Print
                </button>
              </div>
            </div>

            {/* 1. Complete Institutional Admission Paper View */}
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '12px 6px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <AdmissionPaperView
                draft={selectedStudentPreview}
                adminNumber={selectedStudentPreview.formNumber || selectedStudentPreview.id}
                isEditableConsultant={false}
              />
            </div>

            {/* 2. Uploaded Photos and Certificates */}
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', color: '#004d38', fontWeight: 800 }}>
                Uploaded Photos &amp; Certificates
              </h3>
              <ApplicationDocuments
                documents={{
                  ...(selectedStudentPreview.documents || {}),
                  ...(selectedStudentPreview.cashReceipt?.dataUrl ? { cashReceipt: selectedStudentPreview.cashReceipt } : {}),
                }}
                signature={selectedStudentPreview.signature}
                studentSignature={selectedStudentPreview.studentSignature}
                parentSignature={selectedStudentPreview.parentSignature}
              />
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSelectedStudentPreview(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Back to {activeTab === 'home' ? 'Student List' : (selectedCategory === 'FG' ? 'First Graduate' : selectedCategory) + ' List'}
              </button>
            </div>
          </div>
        ) : activeTab === 'home' ? (
          /* =========================================================================
              TAB 1: HOME - COMPLETE OVERALL STUDENT LIST SENT BY ADMIN (Requirement 4)
             ========================================================================= */
          <div className="content-panel table-card">
            <div className="section-header space-between" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <p className="eyebrow accent" style={{ margin: 0 }}>Vice Chairman View</p>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', color: '#004d38', fontWeight: 800 }}>
                  Overall Student List Sent by Admin ({filteredSentToVC.length})
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
                  Complete list of student applications verified and forwarded by Admission Office to Vice Chairman
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" className="secondary-btn compact" onClick={handleCsvExport}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div style={{ margin: '14px 0' }}>
              <div className="search-input-wrapper">
                <Search size={18} color="#006747" style={{ flexShrink: 0 }} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search forwarded students by name, admin no, course, EMIS..."
                  aria-label="Search forwarded students"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '56px' }}>S.No</th>
                  <th>Admin No</th>
                  <th>Student Name</th>
                  <th>EMIS ID</th>
                  <th>Course</th>
                  <th>Category</th>
                  <th>Confirmation Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSentToVC.length ? filteredSentToVC.map((app, index) => (
                  <tr key={app.id}>
                    <td><strong>{index + 1}</strong></td>
                    <td>{app.formNumber || app.id}</td>
                    <td><strong>{app.studentName}</strong></td>
                    <td>{app.emisId || '—'}</td>
                    <td>{app.coursePreference?.firstPreference || '—'}</td>
                    <td>{app.admissionCategory || '—'}</td>
                    <td>{formatDate(app.forwardedAt || app.confirmedAt || app.submittedAt)}</td>
                    <td><span className="badge badge-success">Sent by AO</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-review"
                          onClick={() => setSelectedStudentPreview(app)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#004d38', color: '#ffffff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                          title="Open Full Application Preview"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          type="button"
                          className="btn-review"
                          onClick={() => handleDownloadPdf(app)}
                          disabled={downloadingStudentId === app.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                          title="Download Complete Student Application Form PDF"
                        >
                          <Download size={13} /> {downloadingStudentId === app.id ? 'Saving...' : 'PDF'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '24px' }}>
                      {sentToVC.length ? 'No forwarded applications match your search.' : 'No applications have been sent to VC yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'overview' ? (
          <div>
            {/* 2. Category Selector (4 Selectable Boxes) */}
            <div className="content-panel" style={{
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(4px)',
              border: '1.5px solid rgba(22, 101, 52, 0.25)',
              borderRadius: '20px',
              padding: '22px 24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <p className="eyebrow accent" style={{ margin: 0 }}>Vice Chairman View</p>
                      <h2 style={{ margin: '4px 0 0', fontSize: '1.45rem', color: '#004d38', fontWeight: 800 }}>
                        Category Overview
                      </h2>
                    </div>
                    <span style={{ fontSize: '0.86rem', color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '5px 14px', borderRadius: '999px', border: '1px solid #bbf7d0' }}>
                      Total Confirmed Students: {confirmedStudents.length}
                    </span>
                  </div>

                  {/* The 4 Selectable Category Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                  }}>
                    {/* Card 1: Transport */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: selectedCategory === 'Transport' ? '2.5px solid #004d38' : '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedCategory === 'Transport' ? '0 4px 14px rgba(0, 77, 56, 0.12)' : '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                      onClick={() => {
                        setSelectedCategory('Transport');
                        setCategorySearchTerm('');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#004d38' }}>
                          <Bus size={22} color="#004d38" />
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Transport</strong>
                        </div>
                        {selectedCategory === 'Transport' && (
                          <span style={{ fontSize: '0.72rem', background: '#004d38', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <strong style={{ display: 'block', fontSize: '2rem', color: '#004d38', fontWeight: 850 }}>
                        {transportCount}
                      </strong>
                      <small style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                        Bus Route &amp; Boarding Stop Confirmed
                      </small>
                    </div>

                    {/* Card 2: Hostel */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: selectedCategory === 'Hostel' ? '2.5px solid #004d38' : '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedCategory === 'Hostel' ? '0 4px 14px rgba(0, 77, 56, 0.12)' : '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                      onClick={() => {
                        setSelectedCategory('Hostel');
                        setCategorySearchTerm('');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#004d38' }}>
                          <Building2 size={22} color="#004d38" />
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Hostel</strong>
                        </div>
                        {selectedCategory === 'Hostel' && (
                          <span style={{ fontSize: '0.72rem', background: '#004d38', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <strong style={{ display: 'block', fontSize: '2rem', color: '#004d38', fontWeight: 850 }}>
                        {hostelCount}
                      </strong>
                      <small style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                        Campus Resident Accommodation
                      </small>
                    </div>

                    {/* Card 3: First Graduate (FG) */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: selectedCategory === 'FG' ? '2.5px solid #004d38' : '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedCategory === 'FG' ? '0 4px 14px rgba(0, 77, 56, 0.12)' : '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                      onClick={() => {
                        setSelectedCategory('FG');
                        setCategorySearchTerm('');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#004d38' }}>
                          <GraduationCap size={22} color="#004d38" />
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>First Graduate (FG)</strong>
                        </div>
                        {selectedCategory === 'FG' && (
                          <span style={{ fontSize: '0.72rem', background: '#004d38', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <strong style={{ display: 'block', fontSize: '2rem', color: '#004d38', fontWeight: 850 }}>
                        {fgCount}
                      </strong>
                      <small style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                        TNEA First Graduate Verified
                      </small>
                    </div>

                    {/* Card 4: Sports */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: selectedCategory === 'Sports' ? '2.5px solid #004d38' : '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedCategory === 'Sports' ? '0 4px 14px rgba(0, 77, 56, 0.12)' : '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                      onClick={() => {
                        setSelectedCategory('Sports');
                        setCategorySearchTerm('');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#004d38' }}>
                          <Trophy size={22} color="#004d38" />
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>Sports Quota</strong>
                        </div>
                        {selectedCategory === 'Sports' && (
                          <span style={{ fontSize: '0.72rem', background: '#004d38', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <strong style={{ display: 'block', fontSize: '2rem', color: '#004d38', fontWeight: 850 }}>
                        {sportsCount}
                      </strong>
                      <small style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                        Sports Achievement &amp; Quota
                      </small>
                    </div>
                  </div>
                </div>

                {/* Corresponding Confirmed Students List for Selected Category */}
                <div className="content-panel table-card">
                  <div className="section-header space-between" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedCategory === 'Transport' && <Bus size={24} color="#166534" />}
                      {selectedCategory === 'Hostel' && <Building2 size={24} color="#166534" />}
                      {selectedCategory === 'FG' && <GraduationCap size={24} color="#166534" />}
                      {selectedCategory === 'Sports' && <Trophy size={24} color="#166534" />}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#166534', fontWeight: 800 }}>
                          Confirmed {selectedCategory === 'FG' ? 'First Graduate' : selectedCategory} Students ({activeCategoryStudents.length})
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                          Displaying confirmed student records with all details, photos, and documents
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button type="button" className="secondary-btn compact" onClick={handleCategoryCsvExport}>
                        <Download size={14} /> Export {selectedCategory} CSV
                      </button>
                    </div>
                  </div>

                  {/* Search within Category */}
                  <div style={{ margin: '14px 0' }}>
                    <div className="search-input-wrapper">
                      <Search size={18} color="#006747" style={{ flexShrink: 0 }} />
                      <input
                        value={categorySearchTerm}
                        onChange={(event) => setCategorySearchTerm(event.target.value)}
                        placeholder={`Search ${selectedCategory} students by name, admin no, course...`}
                        aria-label="Search category students"
                      />
                      {categorySearchTerm ? (
                        <button
                          type="button"
                          onClick={() => setCategorySearchTerm('')}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                          title="Clear search"
                        >
                          <X size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '56px' }}>S.No</th>
                        <th>Admin No</th>
                        <th>Student Name</th>
                        <th>EMIS ID</th>
                        <th>Course</th>
                        <th>
                          {selectedCategory === 'Transport'
                            ? 'Bus Route / Boarding Stop'
                            : selectedCategory === 'Hostel'
                            ? 'Hostel Accommodation'
                            : selectedCategory === 'FG'
                            ? 'First Graduate'
                            : 'Sports Quota'}
                        </th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCategoryStudents.length ? activeCategoryStudents.map((app, index) => (
                        <tr key={app.id}>
                          <td><strong>{index + 1}</strong></td>
                          <td>{app.formNumber || app.id}</td>
                          <td><strong>{app.studentName}</strong></td>
                          <td>{app.emisId || '—'}</td>
                          <td>{app.coursePreference?.firstPreference || '—'}</td>
                          <td>
                            {selectedCategory === 'Transport' && (
                              <span style={{ fontSize: '0.85rem' }}>
                                <strong>{app.busNumber || app.busRoute || 'Assigned'}</strong> · {app.boardingStop || app.pickupPoint || 'Pickup Point'}
                              </span>
                            )}
                            {selectedCategory === 'Hostel' && (
                              <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                                Campus Resident Hostel
                              </span>
                            )}
                            {selectedCategory === 'FG' && (
                              <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                                Yes (Certificate Verified)
                              </span>
                            )}
                            {selectedCategory === 'Sports' && (
                              <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                                Yes (Sports Quota Verified)
                              </span>
                            )}
                          </td>
                          <td><span className="badge badge-success">Sent by AO</span></td>
                          <td>
                            <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                              ✓ Paid
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-review"
                                onClick={() => setSelectedStudentPreview(app)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#004d38', color: '#ffffff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                title="Click to view student's complete preview page"
                              >
                                <Eye size={13} /> View
                              </button>
                              <button
                                type="button"
                                className="btn-review"
                                onClick={() => handleDownloadPdf(app)}
                                disabled={downloadingStudentId === app.id}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                title="Download Complete Student Application Form PDF"
                              >
                                <Download size={13} /> {downloadingStudentId === app.id ? 'Saving...' : 'PDF'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '26px', color: '#64748b' }}>
                            {categorySearchTerm ? 'No students found matching your search in this category.' : `No confirmed students currently in ${selectedCategory} category.`}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
        ) : activeTab === 'seats' ? (
          /* =========================================================================
             TAB 3: COURSE SEATS MANAGEMENT (Vice Chairman Exclusive Authorization)
             ========================================================================= */
          <div className="content-panel table-card">
            <div className="section-header space-between" style={{ flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <p className="eyebrow accent" style={{ margin: 0 }}>Vice Chairman View</p>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.4rem', color: '#004d38', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={24} color="#006747" /> Course Seats Management & Quota Configuration
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Exclusive Vice Chairman seat quota authorization. Balance seats update dynamically in real time as students submit admission forms.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSaveSeats}
                  disabled={isSavingSeats}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#166534',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '9px 18px',
                    borderRadius: '8px',
                    cursor: isSavingSeats ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(22, 101, 52, 0.25)',
                    border: 'none',
                  }}
                  title="Save configured total seat quotas to the database"
                >
                  <Save size={16} /> {isSavingSeats ? 'Saving to Database...' : 'Save Seat Quotas'}
                </button>
              </div>
            </div>

            {saveSuccessMsg ? (
              <div style={{
                margin: '14px 0',
                padding: '12px 18px',
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#166534',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <CheckCircle2 size={18} /> {saveSuccessMsg}
              </div>
            ) : null}

            {/* Overall Quick Metrics Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              margin: '18px 0',
            }}>
              <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total College Intake</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                  {allSeatStats.totalCap} <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#64748b' }}>Seats</span>
                </div>
              </div>
              <div style={{ background: '#eff6ff', padding: '14px 18px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase' }}>Total Submitted Applications</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e40af', marginTop: '3px' }}>
                  {allSeatStats.totalFilled} <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#3b82f6' }}>Students</span>
                </div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '14px 18px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Balance Remaining</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: '3px' }}>
                  {allSeatStats.totalBal} <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#16a34a' }}>Seats</span>
                </div>
              </div>
              <div style={{ background: '#ecfdf5', padding: '14px 18px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600, textTransform: 'uppercase' }}>AI&DS Course Status</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>
                  {editableSeats['AI&DS'] ?? 200} Total | {allSeatStats.aidsBal} Balance
                </div>
              </div>
            </div>

            {/* Grouped Courses Tables */}
            {COURSE_GROUPS.map((group) => (
              <div key={group.groupTitle} style={{ marginTop: '24px', marginBottom: '16px' }}>
                <div style={{
                  padding: '10px 14px',
                  background: '#f1f5f9',
                  borderRadius: '8px 8px 0 0',
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  color: '#1e293b',
                  border: '1px solid #e2e8f0',
                  borderBottom: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>{group.groupTitle}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#006747', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                    {group.degree} · {group.level}
                  </span>
                </div>

                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th style={{ minWidth: '220px' }}>Course / Programme</th>
                        <th style={{ minWidth: '150px' }}>Total Seats Quota (VC Edit)</th>
                        <th style={{ minWidth: '120px' }}>Filled Applications</th>
                        <th style={{ minWidth: '130px' }}>Balance Available</th>
                        <th style={{ minWidth: '160px' }}>Occupancy</th>
                        <th style={{ minWidth: '120px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.courses.map((course, idx) => {
                        const totalVal = editableSeats[course.code] !== undefined && editableSeats[course.code] !== ''
                          ? Number(editableSeats[course.code])
                          : (courseSeats?.[course.code]?.total ?? course.defaultSeats);

                        const filled = applications.filter((app) => {
                          const c = app.coursePreference?.firstPreference || app.courseName || '';
                          return normalizeCourseName(c) === normalizeCourseName(course.code);
                        }).length;

                        const balance = Math.max(0, totalVal - filled);
                        const pct = Math.min(100, Math.round((filled / Math.max(1, totalVal)) * 100));

                        return (
                          <tr key={course.code}>
                            <td><strong>{idx + 1}</strong></td>
                            <td>
                              <div>
                                <strong style={{ color: '#0f172a', fontSize: '0.96rem' }}>{course.code}</strong>
                                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{course.fullName}</div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={editableSeats[course.code] ?? totalVal}
                                  onChange={(e) => handleSeatChange(course.code, e.target.value)}
                                  style={{
                                    width: '90px',
                                    padding: '6px 10px',
                                    border: '2px solid #006747',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    fontSize: '0.98rem',
                                    color: '#004d38',
                                    background: '#ffffff',
                                    textAlign: 'center',
                                  }}
                                  title="Edit total intake seat quota for this course"
                                />
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>seats</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: filled > 0 ? '#1e40af' : '#64748b' }}>
                                {filled} {filled === 1 ? 'student' : 'students'}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '0.96rem',
                                color: balance > 0 ? '#15803d' : '#991b1b',
                                background: balance > 0 ? '#dcfce7' : '#fee2e2',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                border: `1px solid ${balance > 0 ? '#86efac' : '#fecaca'}`,
                                display: 'inline-block',
                              }}>
                                {balance} seats
                              </span>
                            </td>
                            <td>
                              <div style={{ width: '100%', maxWidth: '140px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                                  <span>{pct}%</span>
                                  <span>{filled}/{totalVal}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: pct >= 90 ? '#dc2626' : (pct >= 70 ? '#f59e0b' : '#166534'),
                                    borderRadius: '4px',
                                  }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              {balance <= 0 ? (
                                <span className="badge badge-danger" style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem' }}>
                                  Full
                                </span>
                              ) : balance <= 10 ? (
                                <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem' }}>
                                  Filling Fast
                                </span>
                              ) : (
                                <span className="badge badge-success" style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem' }}>
                                  Available
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* =========================================================================
             TAB 4: EDIT / VC SETTINGS (Fee Structure & Background Image Management)
             ========================================================================= */
          <div className="content-panel" style={{ background: '#ffffff', borderRadius: '20px', padding: '28px 24px', border: '1.5px solid rgba(0,77,56,0.15)' }}>
            <div style={{ marginBottom: '22px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '14px' }}>
              <p className="eyebrow accent" style={{ margin: 0 }}>Vice Chairman Controls</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.45rem', color: '#004d38', fontWeight: 800 }}>
                Portal Settings &amp; Customization
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Upload, edit, and manage the official College Fee Structure schedule and the Student Portal Background Image. Changes are persistently saved to TiDB database.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px' }}>
              {/* Box 1: Fee Structure Upload */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#004d38', marginBottom: '10px' }}>
                    <FileText size={22} color="#004d38" />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                      College Fee Structure
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '16px' }}>
                    Upload official tuition &amp; institutional fee schedules (PDF or Image). Students can download and review this directly in their portal.
                  </p>

                  {paymentSettings?.feeStructure?.dataUrl ? (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #94a3b8',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      marginBottom: '16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          Active Upload
                        </span>
                        <strong style={{ fontSize: '0.92rem', color: '#1e293b', wordBreak: 'break-all' }}>
                          {paymentSettings.feeStructure.name}
                        </strong>
                      </div>
                      {paymentSettings.feeStructure.uploadedAt && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                          Uploaded: {formatDate(paymentSettings.feeStructure.uploadedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: '18px',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '0.86rem',
                      marginBottom: '16px',
                    }}>
                      No custom fee structure uploaded. Default standard institutional rates are active.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label
                    className="primary-btn compact"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      margin: 0,
                      background: '#004d38',
                      borderColor: '#003325',
                    }}
                  >
                    <Upload size={14} />
                    {paymentSettings?.feeStructure?.dataUrl ? 'Edit / Replace File' : 'Upload Fee Structure'}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFeeStructureUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {paymentSettings?.feeStructure?.dataUrl && (
                    <>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={() => setSelectedFileModal({ title: 'College Fee Structure', file: paymentSettings.feeStructure })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        type="button"
                        className="secondary-btn compact"
                        onClick={handleDeleteFeeStructure}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Box 2: Background Image Upload */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#004d38', marginBottom: '10px' }}>
                    <Image size={22} color="#004d38" />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                      Student Portal Background
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '16px' }}>
                    Customize the background image across all student registration, login, and application screens.
                  </p>

                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}>
                    <div style={{ width: '100px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0, background: '#000000' }}>
                      <img
                        src={backgroundSettings?.backgroundImageDataUrl || backgroundSettings?.videoDataUrl || '/campus-background.jpg'}
                        alt="Portal Background Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <span style={{
                        fontSize: '0.75rem',
                        background: backgroundSettings?.backgroundImageDataUrl ? '#dcfce7' : '#f1f5f9',
                        color: backgroundSettings?.backgroundImageDataUrl ? '#166534' : '#475569',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        display: 'inline-block',
                        marginBottom: '4px',
                      }}>
                        {backgroundSettings?.backgroundImageDataUrl ? 'Custom Image Active' : 'Default Campus Image'}
                      </span>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                        {backgroundSettings?.backgroundImageDataUrl ? 'Custom high-res image loaded' : '/campus-background.jpg'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label
                    className="primary-btn compact"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      margin: 0,
                      background: '#004d38',
                      borderColor: '#003325',
                    }}
                  >
                    <Upload size={14} />
                    {backgroundSettings?.backgroundImageDataUrl ? 'Edit / Upload Image' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {backgroundSettings?.backgroundImageDataUrl && (
                    <button
                      type="button"
                      className="secondary-btn compact"
                      onClick={handleDeleteBackgroundImage}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#dc2626', borderColor: '#fca5a5' }}
                    >
                      <Trash2 size={14} /> Reset to Default
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Document View Modal */}
      {selectedFileModal ? (
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
          onClick={() => setSelectedFileModal(null)}
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
                <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{selectedFileModal.title}</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{selectedFileModal.file.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFileModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} color="#334155" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f1f5f9' }}>
              {selectedFileModal.file.mimeType?.includes('pdf') ? (
                <iframe
                  src={selectedFileModal.file.dataUrl}
                  title={selectedFileModal.title}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '6px' }}
                />
              ) : (
                <img
                  src={selectedFileModal.file.dataUrl}
                  alt={selectedFileModal.title}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '6px' }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Offscreen container for high-fidelity PDF capture */}
      <div
        id="vc-pdf-render-slot"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '900px',
          zIndex: -999,
          background: '#ffffff',
          visibility: pdfRenderStudent ? 'visible' : 'hidden',
          pointerEvents: 'none',
        }}
      >
        {pdfRenderStudent && (
          <AdmissionPaperView
            draft={pdfRenderStudent}
            cutoff={calculateCutoff(pdfRenderStudent)}
            uploadedDocuments={pdfRenderStudent.documents || pdfRenderStudent.uploadedDocuments}
            feeStructure={pdfRenderStudent.feeStructure}
            paymentReceipt={pdfRenderStudent.paymentReceipt}
          />
        )}
      </div>
    </main>
  );
}
