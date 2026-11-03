import {
  Building2,
  Bus,
  Download,
  Eye,
  FileEdit,
  GraduationCap,
  Home,
  LogOut,
  Search,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { downloadApplicationsCsv, formatDate } from '../utils/helpers';

export default function OfficerDashboardPage() {
  const navigate = useNavigate();
  const {
    applications,
    logoutDemoUser,
    deleteApplication,
    forwardApplicationToVC,
    isLiveConnected,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

  const handleDeleteApplication = (id, studentName) => {
    const confirmed = window.confirm(`Are you sure you want to delete application "${id}" (${studentName || 'Student'})? This action cannot be undone.`);
    if (confirmed) {
      deleteApplication(id);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const searchableFields = [
      app.id,
      app.formNumber,
      app.studentName,
      app.emisId,
      app.coursePreference?.firstPreference,
      app.admissionCategory,
    ];
    const matchesSearch = !normalizedSearch || searchableFields.some((field) => (
      String(field || '').toLocaleLowerCase().includes(normalizedSearch)
    ));
    return matchesSearch
      && (!categoryFilter || app.admissionCategory === categoryFilter)
      && (!courseFilter || app.coursePreference?.firstPreference === courseFilter);
  });

  // 3 distinct status lists with zero overlap / duplicate records
  const enquiring = filteredApplications.filter((app) => app.status === 'Enquiring');
  const confirmed = filteredApplications.filter((app) => (app.status === 'Confirmed' || app.status === 'Confirm') && app.status !== 'Sent to VC');
  const sentToVC = filteredApplications.filter((app) => app.status === 'Sent to VC' || app.status === 'Forwarded to VC');

  // Category counts calculated exclusively from confirmed & paid student records
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

  const modalCategoryStudents = activeCategoryModal === 'Transport'
    ? transportList
    : activeCategoryModal === 'Hostel'
    ? hostelList
    : activeCategoryModal === 'FG'
    ? fgList
    : activeCategoryModal === 'Sports'
    ? sportsList
    : [];

  const categories = [...new Set(applications.map((app) => app.admissionCategory).filter(Boolean))].sort();
  const courses = [...new Set(applications.map((app) => app.coursePreference?.firstPreference).filter(Boolean))].sort();

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

        {/* RIGHT SIDE of Green Box: Confirmed Category Summary Icons + Home, Edit, Logout */}
        <div className="header-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          {/* Confirmed Category Summary Icons */}
          <div className="cat-summary-nav">
            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => setActiveCategoryModal('Transport')}
              title="Click to view Confirmed Transport Students"
            >
              <Bus size={15} />
              <span>Transport</span>
              <strong>{transportCount}</strong>
            </button>

            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => setActiveCategoryModal('Hostel')}
              title="Click to view Confirmed Hostel Students"
            >
              <Building2 size={15} />
              <span>Hostel</span>
              <strong>{hostelCount}</strong>
            </button>

            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => setActiveCategoryModal('FG')}
              title="Click to view Confirmed First Graduate Students"
            >
              <GraduationCap size={15} />
              <span>FG</span>
              <strong>{fgCount}</strong>
            </button>

            <button
              type="button"
              className="cat-summary-pill"
              onClick={() => setActiveCategoryModal('Sports')}
              title="Click to view Confirmed Sports Quota Students"
            >
              <Trophy size={15} />
              <span>Sports</span>
              <strong>{sportsCount}</strong>
            </button>
          </div>

          {/* Navigation Items: Home, Edit, Logout with suitable icons */}
          <nav className="admin-nav">
            <Link to="/officer/dashboard" className="nav-item active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Home size={15} /> Home
            </Link>
            <Link to="/officer/documents" className="nav-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
        {/* Live sync indicator & Quick Stats Bar (Welcome Back completely removed) */}
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

        {/* 2. Search Box & Filter Controls */}
        <div className="content-panel dashboard-filters" style={{ marginBottom: '20px' }}>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label htmlFor="applicationSearch" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Search Applications
            </label>
            <div className="search-input-wrapper">
              <Search size={18} color="#006747" style={{ flexShrink: 0 }} />
              <input
                id="applicationSearch"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by student name, admin no, EMIS, course..."
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
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label htmlFor="categoryFilter" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Admission Category
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              style={{ minHeight: '48px' }}
            >
              <option value="">All Categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label htmlFor="courseFilter" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Course
            </label>
            <select
              id="courseFilter"
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              style={{ minHeight: '48px' }}
            >
              <option value="">All Courses</option>
              {courses.map((course) => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>
        </div>

        {/* Status Counts Grid */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
          <div className="stat-card">
            <span>Enquiring</span>
            <strong>{applications.filter((app) => app.status === 'Enquiring').length}</strong>
          </div>
          <div className="stat-card">
            <span>Confirmed</span>
            <strong>{applications.filter((app) => (app.status === 'Confirmed' || app.status === 'Confirm') && app.status !== 'Sent to VC').length}</strong>
          </div>
          <div className="stat-card">
            <span>Sent to VC</span>
            <strong>{applications.filter((app) => app.status === 'Sent to VC' || app.status === 'Forwarded to VC').length}</strong>
          </div>
        </div>

        {/* 3. Confirmed Category Summary Box with clickable icons */}
        <div className="content-panel" style={{
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(3px)',
          border: '1px solid rgba(22, 101, 52, 0.2)',
          borderRadius: '16px',
          padding: '18px 24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#166534', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Confirmed Category Summary
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '4px 12px', borderRadius: '999px', border: '1px solid #bbf7d0' }}>
              Total Confirmed &amp; Paid: {confirmedStudents.length}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px'
          }}>
            <div
              style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setActiveCategoryModal('Transport')}
              title="Click to view Confirmed Transport Students"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', marginBottom: '4px' }}>
                <Bus size={18} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Transport</p>
              </div>
              <strong style={{ fontSize: '1.7rem', color: '#166534', fontWeight: 800 }}>{transportCount}</strong>
            </div>

            <div
              style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setActiveCategoryModal('Hostel')}
              title="Click to view Confirmed Hostel Students"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', marginBottom: '4px' }}>
                <Building2 size={18} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Hostel</p>
              </div>
              <strong style={{ fontSize: '1.7rem', color: '#166534', fontWeight: 800 }}>{hostelCount}</strong>
            </div>

            <div
              style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setActiveCategoryModal('FG')}
              title="Click to view Confirmed First Graduate Students"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', marginBottom: '4px' }}>
                <GraduationCap size={18} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>First Graduate (FG)</p>
              </div>
              <strong style={{ fontSize: '1.7rem', color: '#166534', fontWeight: 800 }}>{fgCount}</strong>
            </div>

            <div
              style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setActiveCategoryModal('Sports')}
              title="Click to view Confirmed Sports Quota Students"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', marginBottom: '4px' }}>
                <Trophy size={18} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Sports</p>
              </div>
              <strong style={{ fontSize: '1.7rem', color: '#166534', fontWeight: 800 }}>{sportsCount}</strong>
            </div>
          </div>
        </div>

        {/* 4. Enquiring List (With Sequential S.No, Preview, Edit, Confirm) */}
        <div className="content-panel table-card" style={{ marginBottom: '24px' }}>
          <div className="section-header space-between">
            <div>
              <h3 style={{ margin: 0 }}>Enquiring List ({enquiring.length})</h3>
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
                <th>EMIS ID</th>
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
                  <td>{app.emisId || '—'}</td>
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

        {/* 5. Confirmed List (With Working Review, Edit, and Send to VC) */}
        <div className="content-panel table-card" style={{ marginBottom: '24px' }}>
          <div className="section-header space-between">
            <div>
              <h3 style={{ margin: 0 }}>Confirmed List ({confirmed.length})</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>Payment completed &amp; seat confirmed candidates ready for VC dispatch</p>
            </div>
            <button type="button" className="secondary-btn compact" onClick={() => downloadApplicationsCsv(confirmed, 'cms-confirmed-applications.csv')}><Download size={14} /> Export CSV</button>
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
              {confirmed.length ? confirmed.map((app, index) => (
                <tr key={app.id}>
                  <td><strong>{index + 1}</strong></td>
                  <td>{app.formNumber || app.id}</td>
                  <td><strong>{app.studentName}</strong></td>
                  <td>{app.coursePreference?.firstPreference || '—'}</td>
                  <td>{formatDate(app.confirmedAt || app.submittedAt)}</td>
                  <td><span className="badge badge-success">Confirmed</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/officer/application/${app.id}`}
                        className="btn-review"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Review complete student application & documents"
                      >
                        <Eye size={13} /> Review
                      </Link>
                      <Link
                        to={`/officer/documents?id=${app.id}`}
                        className="btn-review"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Edit student documents and authorized corrections"
                      >
                        <FileEdit size={13} /> Edit
                      </Link>
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
              )) : <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No confirmed applications waiting to be sent to VC.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* 3. Sent to VC List */}
        <div className="content-panel table-card">
          <div className="section-header space-between">
            <div>
              <h3 style={{ margin: 0 }}>Sent to VC List ({sentToVC.length})</h3>
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
    </main>
  );
}
