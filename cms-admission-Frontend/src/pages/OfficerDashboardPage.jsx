import {
  Building2,
  Bus,
  DollarSign,
  Download,
  Eye,
  FileEdit,
  GraduationCap,
  Home,
  LayoutGrid,
  LogOut,
  Search,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  downloadApplicationsCsv,
  formatDate,
  calculateCutoff,
  downloadElementAsPdf,
  ALL_PORTAL_COURSES,
  normalizeCourseName,
  matchesPortalCategory,
} from '../utils/helpers';
import AdmissionPaperView from '../components/AdmissionPaperView';
import AdminFeeManagementModal from '../components/AdminFeeManagementModal';

export default function OfficerDashboardPage() {
  const navigate = useNavigate();
  const {
    applications,
    logoutDemoUser,
    deleteApplication,
    forwardApplicationToVC,
    isLiveConnected,
    refreshFromDatabase,
  } = useAppContext();

  const [activeNavTab, setActiveNavTab] = useState('home'); // 'home' | 'category-overview'
  const [selectedAdminCategory, setSelectedAdminCategory] = useState('FG');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedConfirmedIds, setSelectedConfirmedIds] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);
  const [pdfRenderStudent, setPdfRenderStudent] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [isFeeManagementOpen, setIsFeeManagementOpen] = useState(false);

  const handleDownloadPdf = async (student) => {
    if (!student) return;
    setDownloadingId(student.id);
    setPdfRenderStudent(student);

    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const cleanName = String(student.studentName || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `CMS_Admission_Form_${student.formNumber || student.id}_${cleanName}.pdf`;
      const targetElement = document.querySelector('#officer-pdf-render-slot .admission-paper-sheet, #officer-pdf-render-slot .cms-paper-form');
      if (!targetElement) {
        window.alert('Unable to generate application document for PDF export.');
        return;
      }
      await downloadElementAsPdf(targetElement, filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingId(null);
      setPdfRenderStudent(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

  const handleDeleteApplication = (id, studentName) => {
    const confirmed = window.confirm(`Are you sure you want to delete application "${id}" (${studentName || 'Student'})? This action cannot be undone.`);
    if (confirmed) {
      deleteApplication(id);
      setSelectedConfirmedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const filteredApplications = applications.filter((app) => {
    const searchableFields = [
      app.id,
      app.formNumber,
      app.studentName,
      app.coursePreference?.firstPreference,
      app.admissionCategory,
      app.community,
    ];
    const matchesSearch = !normalizedSearch || searchableFields.some((field) => (
      String(field || '').toLocaleLowerCase().includes(normalizedSearch)
    ));

    let matchesCategory = true;
    if (categoryFilter) {
      if (categoryFilter === 'Enquiring') {
        matchesCategory = app.status === 'Enquiring';
      } else if (categoryFilter === 'Confirmed') {
        matchesCategory = (app.status === 'Confirmed' || app.status === 'Confirm' || app.status === 'Sent to VC');
      } else if (categoryFilter === 'Sent to VC') {
        matchesCategory = (app.status === 'Sent to VC' || app.status === 'Forwarded to VC');
      } else if (categoryFilter === 'FG') {
        matchesCategory = matchesPortalCategory(app, 'fg');
      } else if (categoryFilter === 'Management') {
        matchesCategory = matchesPortalCategory(app, 'management');
      } else if (categoryFilter === '7.5% Reservation') {
        matchesCategory = matchesPortalCategory(app, '7.5% Reservation');
      } else if (categoryFilter === 'PMSS') {
        matchesCategory = matchesPortalCategory(app, 'pmss');
      } else if (categoryFilter === 'ST') {
        matchesCategory = matchesPortalCategory(app, 'st');
      } else if (categoryFilter === 'Transport') {
        matchesCategory = matchesPortalCategory(app, 'transport');
      } else if (categoryFilter === 'Hostel') {
        matchesCategory = matchesPortalCategory(app, 'hostel');
      } else {
        matchesCategory = app.admissionCategory === categoryFilter ||
          String(app.admissionCategory || '').toLowerCase().includes(categoryFilter.toLowerCase());
      }
    }

    let matchesCourse = true;
    if (courseFilter) {
      const appCourse = app.coursePreference?.firstPreference || '';
      matchesCourse = appCourse === courseFilter ||
        normalizeCourseName(appCourse) === normalizeCourseName(courseFilter);
    }

    return matchesSearch && matchesCategory && matchesCourse;
  });

  // 3 distinct status lists with zero overlap / duplicate records
  const enquiring = filteredApplications.filter((app) => app.status === 'Enquiring');
  const confirmed = filteredApplications.filter((app) => (app.status === 'Confirmed' || app.status === 'Confirm') && app.status !== 'Sent to VC');
  const sentToVC = filteredApplications.filter((app) => app.status === 'Sent to VC' || app.status === 'Forwarded to VC');

  // 7 Categories for Category Overview:
  // FG, Management Quota, 7.5% Reservation, PMSS Students, ST Students, Transport, Hostel (+ Sports)
  const fgStudents = applications.filter((a) => matchesPortalCategory(a, 'fg'));
  const managementStudents = applications.filter((a) => matchesPortalCategory(a, 'management'));
  const reservation75Students = applications.filter((a) => matchesPortalCategory(a, '7.5% Reservation'));
  const pmssStudents = applications.filter((a) => matchesPortalCategory(a, 'pmss'));
  const stStudents = applications.filter((a) => matchesPortalCategory(a, 'st'));
  const transportStudents = applications.filter((a) => matchesPortalCategory(a, 'transport'));
  const hostelStudents = applications.filter((a) => matchesPortalCategory(a, 'hostel'));
  const sportsStudents = applications.filter((a) => matchesPortalCategory(a, 'sports'));

  const fgCount = fgStudents.length;
  const managementCount = managementStudents.length;
  const reservation75Count = reservation75Students.length;
  const pmssCount = pmssStudents.length;
  const stCount = stStudents.length;
  const transportCount = transportStudents.length;
  const hostelCount = hostelStudents.length;
  const sportsCount = sportsStudents.length;

  const modalCategoryStudents = activeCategoryModal === 'Transport'
    ? transportStudents
    : activeCategoryModal === 'Hostel'
    ? hostelStudents
    : activeCategoryModal === 'FG'
    ? fgStudents
    : activeCategoryModal === 'Sports'
    ? sportsStudents
    : [];

  const adminCategoryDefs = [
    {
      key: 'FG',
      label: 'FG',
      fullName: 'First Graduate (FG)',
      count: fgStudents.length,
      icon: <GraduationCap size={20} color="#004d38" />,
      description: 'First Graduate Beneficiaries',
      list: fgStudents,
    },
    {
      key: 'Management Quota',
      label: 'Management Quota',
      fullName: 'Management Quota',
      count: managementStudents.length,
      icon: <DollarSign size={20} color="#004d38" />,
      description: 'Management Seat Candidates',
      list: managementStudents,
    },
    {
      key: '7.5% Reservation',
      label: '7.5% Reservation',
      fullName: '7.5% Government School Reservation',
      count: reservation75Students.length,
      icon: <Trophy size={20} color="#004d38" />,
      description: 'Govt School 7.5% Quota',
      list: reservation75Students,
    },
    {
      key: 'PMSS Students',
      label: 'PMSS Students',
      fullName: 'PMSS Scholarship Students',
      count: pmssStudents.length,
      icon: <GraduationCap size={20} color="#004d38" />,
      description: 'Post-Matric Scholarship Scheme',
      list: pmssStudents,
    },
    {
      key: 'ST Students',
      label: 'ST Students',
      fullName: 'ST Community Students',
      count: stStudents.length,
      icon: <Building2 size={20} color="#004d38" />,
      description: 'Scheduled Tribe Candidates',
      list: stStudents,
    },
    {
      key: 'Transport',
      label: 'Transport',
      fullName: 'Transport (Day Scholar)',
      count: transportStudents.length,
      icon: <Bus size={20} color="#004d38" />,
      description: 'College Bus Route Registered',
      list: transportStudents,
    },
    {
      key: 'Hostel',
      label: 'Hostel',
      fullName: 'Hostel Resident',
      count: hostelStudents.length,
      icon: <Home size={20} color="#004d38" />,
      description: 'Campus Resident Accommodation',
      list: hostelStudents,
    },
  ];

  const currentCategoryObj = adminCategoryDefs.find((c) => c.key === selectedAdminCategory) || adminCategoryDefs[0];
  const normalizedCategorySearch = categorySearchTerm.trim().toLowerCase();
  const displayedCategoryStudents = currentCategoryObj.list.filter((app) => {
    if (!normalizedCategorySearch) return true;
    const fields = [
      app.id,
      app.formNumber,
      app.studentName,
      app.coursePreference?.firstPreference,
      app.admissionCategory,
      app.community,
      app.busRoute,
      app.pickupPoint,
      app.busNumber,
      app.status,
    ];
    return fields.some((f) => String(f || '').toLowerCase().includes(normalizedCategorySearch));
  });

  const dynamicExtraCategories = [...new Set(applications.map((app) => app.admissionCategory).filter(Boolean))]
    .filter((c) => !['Management', 'MQ', 'Government / Counselling', '7.5% Reservation', 'General'].includes(c))
    .sort();

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/officer', { replace: true });
  };

  return (
    <main className="page-shell admin-shell officer-shell">
      {/* 1. Admin Green Navigation Box (Vertical layout at top) */}
      <aside className="admin-sidebar officer-top-header">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent" style={{ margin: 0 }}>Officer Portal</p>
            <strong style={{ fontSize: '1.1rem' }}>Admission Office</strong>
          </div>
        </div>

        {/* RIGHT SIDE of Green Box: Confirmed Category Summary Icons + Home, Category Overview, Fee Management, Logout */}
        <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {/* Confirmed Category Summary Icons */}
          <div className="cat-summary-nav">
            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => {
                setActiveNavTab('category-overview');
                setSelectedAdminCategory('Transport');
              }}
              title="Click to view Transport Students in Category Overview"
            >
              <Bus size={15} />
              <span>Transport</span>
              <strong>{transportCount}</strong>
            </button>

            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => {
                setActiveNavTab('category-overview');
                setSelectedAdminCategory('Hostel');
              }}
              title="Click to view Hostel Students in Category Overview"
            >
              <Building2 size={15} />
              <span>Hostel</span>
              <strong>{hostelCount}</strong>
            </button>

            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => {
                setActiveNavTab('category-overview');
                setSelectedAdminCategory('FG');
              }}
              title="Click to view First Graduate Students in Category Overview"
            >
              <GraduationCap size={15} />
              <span>FG</span>
              <strong>{fgCount}</strong>
            </button>

            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => {
                setActiveNavTab('category-overview');
                setSelectedAdminCategory('7.5% Reservation');
              }}
              title="Click to view 7.5% Reservation Students in Category Overview"
            >
              <Trophy size={15} />
              <span>7.5%</span>
              <strong>{reservation75Students.length}</strong>
            </button>
          </div>

          {/* Navigation Items: Home, Category Overview, Fee Management, Logout */}
          <nav className="admin-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className={`nav-item ${activeNavTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveNavTab('home')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                background: activeNavTab === 'home' ? 'rgba(255,255,255,0.22)' : 'transparent',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: '8px',
              }}
            >
              <Home size={15} /> Home
            </button>
            <button
              type="button"
              className={`nav-item ${activeNavTab === 'category-overview' ? 'active' : ''}`}
              onClick={() => setActiveNavTab('category-overview')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                background: activeNavTab === 'category-overview' ? 'rgba(255,255,255,0.22)' : 'transparent',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: '8px',
              }}
              title="Category Overview: FG, Management Quota, 7.5% Reservation, PMSS Students, ST Students, Transport, Hostel"
            >
              <LayoutGrid size={15} /> Category Overview
            </button>
            <button
              type="button"
              className="nav-item button-link"
              onClick={() => setIsFeeManagementOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Dynamic Fee Calculator & 2026-2027 Fee Management"
            >
              <DollarSign size={15} /> Fee Management
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
        {/* Live sync indicator & Quick Stats Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 700,
            color: isLiveConnected ? '#15803d' : '#6b7280',
            backgroundColor: isLiveConnected ? '#dcfce7' : '#f3f4f6',
            padding: '5px 12px',
            borderRadius: '999px',
            border: `1px solid ${isLiveConnected ? '#bbf7d0' : '#e5e7eb'}`
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isLiveConnected ? '#16a34a' : '#9ca3af',
              boxShadow: isLiveConnected ? '0 0 0 2px rgba(34,197,94,0.3)' : 'none'
            }}></span>
            {isLiveConnected ? 'Live Central Sync Active' : 'Connecting to Database...'}
          </span>
          <span style={{ fontSize: '0.86rem', color: '#475569', fontWeight: 600 }}>
            Total Applications: <strong>{applications.length}</strong>
          </span>
        </div>

        {/* =========================================================================
            VIEW 1: CATEGORY OVERVIEW (Requirement 1)
           ========================================================================= */}
        {activeNavTab === 'category-overview' ? (
          <div>
            <div className="content-panel" style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(4px)',
              border: '1.5px solid rgba(22, 101, 52, 0.25)',
              borderRadius: '20px',
              padding: '22px 24px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <p className="eyebrow accent" style={{ margin: 0 }}>Admission Office</p>
                  <h2 style={{ margin: '4px 0 0', fontSize: '1.45rem', color: '#000000', fontWeight: 800, textShadow: 'none' }}>
                    Category Overview
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Click on any category to view and manage students matching that specific category
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-btn compact"
                  onClick={() => setActiveNavTab('home')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Home size={14} /> Back to Dashboard
                </button>
              </div>

              {/* The 7 Selectable Category Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
              }}>
                {adminCategoryDefs.map((cat) => {
                  const isSelected = selectedAdminCategory === cat.key;
                  return (
                    <div
                      key={cat.key}
                      style={{
                        background: '#ffffff',
                        border: isSelected ? '2.5px solid #004d38' : '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 14px rgba(0, 77, 56, 0.12)' : '0 2px 4px rgba(0,0,0,0.03)',
                      }}
                      onClick={() => {
                        setSelectedAdminCategory(cat.key);
                        setCategorySearchTerm('');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#004d38' }}>
                          {cat.icon}
                          <strong style={{ fontSize: '1rem', color: '#000000', fontWeight: 800, textShadow: 'none' }}>{cat.label}</strong>
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: '0.72rem', background: '#004d38', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                            Active
                          </span>
                        )}
                      </div>
                      <strong style={{ display: 'block', fontSize: '1.9rem', color: '#004d38', fontWeight: 850 }}>
                        {cat.count}
                      </strong>
                      <small style={{ color: '#475569', fontSize: '0.78rem', fontWeight: 600 }}>
                        {cat.description}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Students Table for the Selected Category */}
            <div className="content-panel table-card">
              <div className="section-header space-between" style={{ flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {currentCategoryObj.icon}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#000000', fontWeight: 800, textShadow: 'none' }}>
                      {currentCategoryObj.fullName} ({displayedCategoryStudents.length})
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Showing students matching category: <strong>{currentCategoryObj.label}</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="secondary-btn compact"
                    onClick={() => downloadApplicationsCsv(displayedCategoryStudents, `cms-admin-${currentCategoryObj.key.toLowerCase().replace(/[^a-z0-9]/g, '_')}-students.csv`)}
                  >
                    <Download size={14} /> Export {currentCategoryObj.label} CSV
                  </button>
                </div>
              </div>

              {/* Search Within Selected Category */}
              <div style={{ margin: '14px 0' }}>
                <div className="search-input-wrapper">
                  <Search size={18} color="#006747" style={{ flexShrink: 0 }} />
                  <input
                    value={categorySearchTerm}
                    onChange={(event) => setCategorySearchTerm(event.target.value)}
                    placeholder={`Search within ${currentCategoryObj.label} by name, admin no, course...`}
                    aria-label={`Search ${currentCategoryObj.label} students`}
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
                    <th>Course</th>
                    <th>Category Details</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCategoryStudents.length ? displayedCategoryStudents.map((app, index) => (
                    <tr key={app.id}>
                      <td><strong>{index + 1}</strong></td>
                      <td>{app.formNumber || app.id}</td>
                      <td><strong>{app.studentName}</strong></td>
                      <td>{app.coursePreference?.firstPreference || '—'}</td>
                      <td>
                        {selectedAdminCategory === 'Transport' && (
                          <span><strong>{app.busNumber || app.busRoute || 'Assigned'}</strong> · {app.boardingStop || app.pickupPoint || 'Pickup Point'}</span>
                        )}
                        {selectedAdminCategory === 'Hostel' && (
                          <span style={{ color: '#166534', fontWeight: 600 }}>Campus Resident Hostel</span>
                        )}
                        {selectedAdminCategory === 'FG' && (
                          <span style={{ color: '#166534', fontWeight: 600 }}>First Graduate (Eligible)</span>
                        )}
                        {selectedAdminCategory === 'Management Quota' && (
                          <span>{app.admissionCategory || 'Management Quota'}</span>
                        )}
                        {selectedAdminCategory === '7.5% Reservation' && (
                          <span style={{ color: '#0369a1', fontWeight: 600 }}>Govt School 7.5% Quota</span>
                        )}
                        {selectedAdminCategory === 'PMSS Students' && (
                          <span>Community: <strong>{app.community || 'SC/ST'}</strong> (PMSS Scheme)</span>
                        )}
                        {selectedAdminCategory === 'ST Students' && (
                          <span>Community: <strong>ST (Scheduled Tribe)</strong></span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${app.status === 'Enquiring' ? 'badge-warning' : 'badge-success'}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-review"
                            onClick={() => handleDownloadPdf(app)}
                            disabled={downloadingId === app.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            title="Download PDF"
                          >
                            <Download size={13} /> {downloadingId === app.id ? 'Saving...' : 'PDF'}
                          </button>
                          <Link
                            to={`/officer/application/${app.id}`}
                            className="btn-review"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="View student application"
                          >
                            <Eye size={13} /> View
                          </Link>
                          <Link
                            to={`/officer/documents?id=${app.id}`}
                            className="btn-review"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Edit student documents"
                          >
                            <FileEdit size={13} /> Edit
                          </Link>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => handleDeleteApplication(app.id, app.studentName)}
                            title="Delete application"
                            style={{ padding: '4px 8px', borderColor: '#d1d5db' }}
                          >
                            <Trash2 size={13} color="#6b7280" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                        No students found matching category "{currentCategoryObj.label}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* =========================================================================
              VIEW 2: HOME DASHBOARD (Requirements 2, 3, 4)
             ========================================================================= */
          <div>
            {/* Search Box & Updated Filters (Requirements 3 & 4) */}
            <div className="content-panel dashboard-filters" style={{ marginBottom: '20px' }}>
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label htmlFor="applicationSearch" style={{ fontWeight: 700, color: '#000000', marginBottom: '6px', textShadow: 'none' }}>
                  Search Applications
                </label>
                <div className="search-input-wrapper">
                  <Search size={18} color="#006747" style={{ flexShrink: 0 }} />
                  <input
                    id="applicationSearch"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by student name, admin no, course..."
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

              {/* Admission Category Filter (Includes Enquiring and Confirmed options - Requirement 3) */}
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label htmlFor="categoryFilter" style={{ fontWeight: 700, color: '#000000', marginBottom: '6px', textShadow: 'none' }}>
                  Admission Category / Status
                </label>
                <select
                  id="categoryFilter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  style={{ minHeight: '48px' }}
                >
                  <option value="">All Categories &amp; Statuses</option>
                  <optgroup label="Filter by Status">
                    <option value="Enquiring">Status: Enquiring</option>
                    <option value="Confirmed">Status: Confirmed</option>
                    <option value="Sent to VC">Status: Sent to VC</option>
                  </optgroup>
                  <optgroup label="Filter by Admission Category">
                    <option value="Management">Management Quota</option>
                    <option value="Government / Counselling">Government / Counselling</option>
                    <option value="7.5% Reservation">7.5% Reservation</option>
                    <option value="FG">First Graduate (FG)</option>
                    <option value="PMSS">PMSS Students</option>
                    <option value="ST">ST Students</option>
                    <option value="Transport">Transport (Day Scholar)</option>
                    <option value="Hostel">Hostel</option>
                    <option value="General">General</option>
                    {dynamicExtraCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Course Filter (Includes all supported departments/courses - Requirement 4) */}
              <div className="field-group" style={{ marginBottom: 0 }}>
                <label htmlFor="courseFilter" style={{ fontWeight: 700, color: '#000000', marginBottom: '6px', textShadow: 'none' }}>
                  Course / Department
                </label>
                <select
                  id="courseFilter"
                  value={courseFilter}
                  onChange={(event) => setCourseFilter(event.target.value)}
                  style={{ minHeight: '48px' }}
                >
                  <option value="">All Courses ({ALL_PORTAL_COURSES.length})</option>
                  <optgroup label="Undergraduate (UG) — B.Tech Programmes">
                    {ALL_PORTAL_COURSES.filter((c) => c.label.includes('B.Tech')).map((course) => (
                      <option key={course.code} value={course.code}>{course.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Undergraduate (UG) — B.E Programmes">
                    {ALL_PORTAL_COURSES.filter((c) => c.label.includes('B.E')).map((course) => (
                      <option key={course.code} value={course.code}>{course.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Postgraduate (PG) — M.E Programmes">
                    {ALL_PORTAL_COURSES.filter((c) => c.label.includes('M.E')).map((course) => (
                      <option key={course.code} value={course.code}>{course.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Status Counts Grid */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px', width: '100%', alignItems: 'stretch' }}>
              <div className="stat-card" style={{ minHeight: '84px', height: '84px', color: '#000000', boxSizing: 'border-box' }}>
                <span style={{ color: '#000000', fontWeight: 700, fontSize: '1rem' }}>Enquiring</span>
                <strong style={{ color: '#000000', fontWeight: 800, fontSize: '1.4rem' }}>{applications.filter((app) => app.status === 'Enquiring').length}</strong>
              </div>
              <div className="stat-card" style={{ minHeight: '84px', height: '84px', color: '#000000', boxSizing: 'border-box' }}>
                <span style={{ color: '#000000', fontWeight: 700, fontSize: '1rem' }}>Confirm</span>
                <strong style={{ color: '#000000', fontWeight: 800, fontSize: '1.4rem' }}>{applications.filter((app) => (app.status === 'Confirmed' || app.status === 'Confirm') && app.status !== 'Sent to VC').length}</strong>
              </div>
              <div className="stat-card" style={{ minHeight: '84px', height: '84px', color: '#000000', boxSizing: 'border-box' }}>
                <span style={{ color: '#000000', fontWeight: 700, fontSize: '1rem' }}>Sent to VC</span>
                <strong style={{ color: '#000000', fontWeight: 800, fontSize: '1.4rem' }}>{applications.filter((app) => app.status === 'Sent to VC' || app.status === 'Forwarded to VC').length}</strong>
              </div>
            </div>

            {/* Enquiring List */}
            <div className="content-panel table-card" style={{ marginBottom: '24px' }}>
              <div className="section-header space-between">
                <div>
                  <h3 style={{ margin: 0, color: '#000000' }}>Enquiring List ({enquiring.length})</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>Candidates inquiring / awaiting seat confirmation payment</p>
                </div>
                <button type="button" className="secondary-btn compact" onClick={() => downloadApplicationsCsv(enquiring, 'cms-enquiring-applications.csv')}><Download size={14} /> Export CSV</button>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>S.No</th>
                    <th>Admin No</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiring.length ? enquiring.map((app, index) => (
                    <tr key={app.id}>
                      <td><strong>{index + 1}</strong></td>
                      <td>{app.formNumber || app.id}</td>
                      <td><strong>{app.studentName}</strong></td>
                      <td>{app.coursePreference?.firstPreference || '—'}</td>
                      <td>{formatDate(app.submittedAt)}</td>
                      <td><span className="badge badge-warning">{app.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-review"
                            style={{ background: '#166534', color: '#ffffff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                            onClick={() => navigate(`/payment?id=${encodeURIComponent(app.id)}&from=admin`)}
                            title="Process Seat Confirmation Payment"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="btn-review"
                            onClick={() => handleDownloadPdf(app)}
                            disabled={downloadingId === app.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            title="Download Complete Student Application Form PDF"
                          >
                            <Download size={13} /> {downloadingId === app.id ? 'Saving...' : 'PDF'}
                          </button>
                          <Link
                            to={`/officer/application/${app.id}`}
                            className="btn-review"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Open Complete Student Preview & Document Verification"
                          >
                            <Eye size={13} /> Preview
                          </Link>
                          <Link
                            to={`/officer/documents?id=${app.id}`}
                            className="btn-review"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Edit Documents & Verification Checklist"
                          >
                            <FileEdit size={13} /> Edit
                          </Link>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => handleDeleteApplication(app.id, app.studentName)}
                            title="Delete application"
                            style={{ padding: '4px 8px', borderColor: '#d1d5db' }}
                          >
                            <Trash2 size={13} color="#6b7280" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No applications currently in Enquiring list.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Confirmed List (With Selectable Checklist & Bulk Selection - Requirement 2) */}
            <div className="content-panel table-card" style={{ marginBottom: '24px' }}>
              <div className="section-header space-between">
                <div>
                  <h3 style={{ margin: 0, color: '#000000' }}>Confirmed List ({confirmed.length})</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>Payment completed &amp; seat confirmed candidates ready for VC dispatch</p>
                </div>
                <button type="button" className="secondary-btn compact" onClick={() => downloadApplicationsCsv(confirmed, 'cms-confirmed-applications.csv')}><Download size={14} /> Export CSV</button>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={confirmed.length > 0 && selectedConfirmedIds.length === confirmed.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedConfirmedIds(confirmed.map((app) => app.id));
                          } else {
                            setSelectedConfirmedIds([]);
                          }
                        }}
                        aria-label="Select all confirmed students"
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: '60px' }}>S.No</th>
                    <th>Admin No</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmed.length ? confirmed.map((app, index) => {
                    const isSelected = selectedConfirmedIds.includes(app.id);
                    return (
                      <tr key={app.id} style={{ backgroundColor: isSelected ? 'rgba(22, 163, 74, 0.06)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedConfirmedIds((prev) => [...prev, app.id]);
                              } else {
                                setSelectedConfirmedIds((prev) => prev.filter((id) => id !== app.id));
                              }
                            }}
                            aria-label={`Select student ${app.studentName}`}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                        <td><strong>{index + 1}</strong></td>
                        <td>{app.formNumber || app.id}</td>
                        <td><strong>{app.studentName}</strong></td>
                        <td>{app.coursePreference?.firstPreference || '—'}</td>
                        <td>{formatDate(app.confirmedAt || app.submittedAt)}</td>
                        <td><span className="badge badge-success">Confirmed</span></td>
                        <td>
                          {/* Row actions: Review, Edit, Delete removed from rows per requirement 2 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn-review"
                              onClick={() => handleDownloadPdf(app)}
                              disabled={downloadingId === app.id}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                              title="Download Complete Student Application Form PDF"
                            >
                              <Download size={13} /> {downloadingId === app.id ? 'Saving...' : 'PDF'}
                            </button>
                            <button
                              type="button"
                              className="btn-review"
                              style={{ background: '#0369a1', color: '#ffffff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                              onClick={() => {
                                const conf = window.confirm(`Send application #${app.formNumber || app.id} (${app.studentName}) to Vice-Chairman?`);
                                if (conf) {
                                  forwardApplicationToVC(app.id, 'Admission Officer');
                                }
                              }}
                              title="Send confirmed application to VC"
                            >
                              Send to VC
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : <tr><td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>No confirmed applications waiting to be sent to VC.</td></tr>}
                </tbody>
              </table>

              {/* Bulk Action Buttons placed together below the list applying to selected students (Requirement 2) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                marginTop: '12px',
                background: selectedConfirmedIds.length > 0 ? '#f0fdf4' : '#f8fafc',
                border: selectedConfirmedIds.length > 0 ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                borderRadius: '12px',
                flexWrap: 'wrap',
                gap: '12px',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.9rem', color: selectedConfirmedIds.length > 0 ? '#166534' : '#64748b', fontWeight: 700 }}>
                    {selectedConfirmedIds.length} of {confirmed.length} student{confirmed.length === 1 ? '' : 's'} selected
                  </span>
                  {selectedConfirmedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedConfirmedIds([])}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.8rem', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Review Selected */}
                  <button
                    type="button"
                    className="btn-review"
                    disabled={selectedConfirmedIds.length === 0}
                    onClick={() => {
                      if (selectedConfirmedIds.length === 0) {
                        window.alert('Please select at least one student from the checklist to review.');
                        return;
                      }
                      navigate(`/officer/application/${selectedConfirmedIds[0]}`);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: selectedConfirmedIds.length > 0 ? '#166534' : '#cbd5e1',
                      color: selectedConfirmedIds.length > 0 ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: selectedConfirmedIds.length > 0 ? 'pointer' : 'not-allowed',
                    }}
                    title="Review application of selected student"
                  >
                    <Eye size={15} /> Review Selected {selectedConfirmedIds.length > 0 ? `(${selectedConfirmedIds.length})` : ''}
                  </button>

                  {/* Edit Selected */}
                  <button
                    type="button"
                    className="btn-review"
                    disabled={selectedConfirmedIds.length === 0}
                    onClick={() => {
                      if (selectedConfirmedIds.length === 0) {
                        window.alert('Please select at least one student from the checklist to edit.');
                        return;
                      }
                      navigate(`/officer/documents?id=${selectedConfirmedIds[0]}`);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: selectedConfirmedIds.length > 0 ? '#0284c7' : '#cbd5e1',
                      color: selectedConfirmedIds.length > 0 ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: selectedConfirmedIds.length > 0 ? 'pointer' : 'not-allowed',
                    }}
                    title="Edit documents of selected student"
                  >
                    <FileEdit size={15} /> Edit Selected {selectedConfirmedIds.length > 0 ? `(${selectedConfirmedIds.length})` : ''}
                  </button>

                  {/* Delete Selected */}
                  <button
                    type="button"
                    disabled={selectedConfirmedIds.length === 0}
                    onClick={async () => {
                      if (selectedConfirmedIds.length === 0) {
                        window.alert('Please select at least one student to delete.');
                        return;
                      }
                      const count = selectedConfirmedIds.length;
                      const confirmedProceed = window.confirm(
                        `Are you sure you want to delete ${count} selected student application${count > 1 ? 's' : ''}? This action cannot be undone.`
                      );
                      if (!confirmedProceed) return;

                      for (const id of selectedConfirmedIds) {
                        await deleteApplication(id);
                      }
                      setSelectedConfirmedIds([]);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: selectedConfirmedIds.length > 0 ? '#991b1b' : '#cbd5e1',
                      color: selectedConfirmedIds.length > 0 ? '#ffffff' : '#64748b',
                      fontWeight: 700,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: selectedConfirmedIds.length > 0 ? 'pointer' : 'not-allowed',
                    }}
                    title="Delete only selected student applications"
                  >
                    <Trash2 size={15} /> Delete Selected {selectedConfirmedIds.length > 0 ? `(${selectedConfirmedIds.length})` : ''}
                  </button>
                </div>
              </div>
            </div>

            {/* Sent to VC List */}
            <div className="content-panel table-card">
              <div className="section-header space-between">
                <div>
                  <h3 style={{ margin: 0, color: '#000000' }}>Sent to VC List ({sentToVC.length})</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>Applications forwarded to Vice-Chairman portal</p>
                </div>
                <button type="button" className="secondary-btn compact" onClick={() => downloadApplicationsCsv(sentToVC, 'cms-sent-to-vc-applications.csv')}><Download size={14} /> Export CSV</button>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>S.No</th>
                    <th>Admin No</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Date Forwarded</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sentToVC.length ? sentToVC.map((app, index) => (
                    <tr key={app.id}>
                      <td><strong>{index + 1}</strong></td>
                      <td>{app.formNumber || app.id}</td>
                      <td><strong>{app.studentName}</strong></td>
                      <td>{app.coursePreference?.firstPreference || '—'}</td>
                      <td>{formatDate(app.forwardedAt || app.confirmedAt || app.submittedAt)}</td>
                      <td><span className="badge badge-success">Sent to VC</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-review"
                            onClick={() => handleDownloadPdf(app)}
                            disabled={downloadingId === app.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            title="Download Complete Student Application Form PDF"
                          >
                            <Download size={13} /> {downloadingId === app.id ? 'Saving...' : 'PDF'}
                          </button>
                          <Link
                            to={`/officer/application/${app.id}`}
                            className="btn-review"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={13} /> View Record
                          </Link>
                          <button
                            type="button"
                            className="secondary-btn compact"
                            onClick={() => handleDeleteApplication(app.id, app.studentName)}
                            title="Delete application"
                            style={{ padding: '4px 8px', borderColor: '#d1d5db' }}
                          >
                            <Trash2 size={13} color="#6b7280" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No applications have been sent to VC yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Confirmed Category Details Modal */}
      {activeCategoryModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setActiveCategoryModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeCategoryModal === 'Transport' && <Bus size={22} color="#166534" />}
                {activeCategoryModal === 'Hostel' && <Building2 size={22} color="#166534" />}
                {activeCategoryModal === 'FG' && <GraduationCap size={22} color="#166534" />}
                {activeCategoryModal === 'Sports' && <Trophy size={22} color="#166534" />}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#166534', fontWeight: 800 }}>
                    Confirmed {activeCategoryModal === 'FG' ? 'First Graduate (FG)' : activeCategoryModal} Students ({modalCategoryStudents.length})
                  </h3>
                  <small style={{ color: '#64748b' }}>Students with payment verified &amp; confirmed</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategoryModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: '16px 22px', overflowY: 'auto' }}>
              {modalCategoryStudents.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>S.No</th>
                      <th>Admin No</th>
                      <th>Student Name</th>
                      <th>Course</th>
                      <th>{activeCategoryModal === 'Transport' ? 'Bus Route / Stop' : activeCategoryModal === 'Hostel' ? 'Hostel Detail' : activeCategoryModal === 'FG' ? 'First Graduate' : 'Sports Quota'}</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalCategoryStudents.map((st, i) => (
                      <tr key={st.id}>
                        <td><strong>{i + 1}</strong></td>
                        <td>{st.formNumber || st.id}</td>
                        <td><strong>{st.studentName}</strong></td>
                        <td>{st.coursePreference?.firstPreference || '—'}</td>
                        <td>
                          {activeCategoryModal === 'Transport' && (
                            <span>{st.busNumber || st.busRoute || 'Assigned Bus'} — {st.boardingStop || st.pickupPoint || 'Pickup Point'}</span>
                          )}
                          {activeCategoryModal === 'Hostel' && <span>Hostel Campus Resident</span>}
                          {activeCategoryModal === 'FG' && <span>Yes (First Graduate)</span>}
                          {activeCategoryModal === 'Sports' && <span>Yes (Sports Quota)</span>}
                        </td>
                        <td>
                          <Link
                            to={`/officer/application/${st.id}`}
                            className="btn-review"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => setActiveCategoryModal(null)}
                          >
                            <Eye size={13} /> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  No confirmed students found under {activeCategoryModal}.
                </p>
              )}
            </div>

            <div style={{ padding: '12px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-btn compact" onClick={() => setActiveCategoryModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hidden offscreen container for high-fidelity PDF capture */}
      <div
        id="officer-pdf-render-slot"
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
      {/* Dynamic Fee Calculator 2026-2027 Admin Management Modal */}
      <AdminFeeManagementModal
        isOpen={isFeeManagementOpen}
        onClose={() => setIsFeeManagementOpen(false)}
        applications={applications}
        onConfigUpdated={() => refreshFromDatabase()}
      />
    </main>
  );
}
