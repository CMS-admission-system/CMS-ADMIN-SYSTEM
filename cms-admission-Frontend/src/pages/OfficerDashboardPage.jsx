import { BellRing, Download, LogOut, Search, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { downloadApplicationsCsv, formatDate } from '../utils/helpers';

export default function OfficerDashboardPage() {
  const navigate = useNavigate();
  const { applications, auth, logoutDemoUser, deleteApplication, isLiveConnected } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
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

  const transportCount = confirmedStudents.filter(
    (a) => a.accommodation === 'Day Scholar' && (
      a.transportRequired === 'Yes' || a.transportApplication === 'Yes' || a.pickupPoint || a.busRoute
    )
  ).length;

  const hostelCount = confirmedStudents.filter(
    (a) => a.accommodation === 'Hostel'
  ).length;

  const fgCount = confirmedStudents.filter(
    (a) => String(a.firstGraduate || '').toLowerCase() === 'yes'
  ).length;

  const sportsCount = confirmedStudents.filter(
    (a) => String(a.sportsCategory || '').toLowerCase() === 'yes'
  ).length;

  const categories = [...new Set(applications.map((app) => app.admissionCategory).filter(Boolean))].sort();
  const courses = [...new Set(applications.map((app) => app.coursePreference?.firstPreference).filter(Boolean))].sort();

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/officer', { replace: true });
  };

  return (
    <main className="page-shell admin-shell officer-shell">
      {/* Top Green Box in Vertical Layout */}
      <aside className="admin-sidebar officer-top-header">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">Officer Portal</p>
            <strong>Admission Office</strong>
          </div>
        </div>

        <nav className="admin-nav">
          <Link to="/officer/dashboard" className="nav-item active">Dashboard</Link>
          <Link to="/officer/documents" className="nav-item">Edit Settings</Link>
          <button type="button" className="nav-item button-link" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </nav>
      </aside>

      <section className="admin-content" style={{ width: '100%' }}>
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Welcome back</p>
            <h2>{auth.username || 'Officer'}</h2>
          </div>
          <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: isLiveConnected ? '#15803d' : '#6b7280',
              backgroundColor: isLiveConnected ? '#dcfce7' : '#f3f4f6',
              padding: '4px 10px',
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
              {isLiveConnected ? 'Live Central Sync' : 'Reconnecting...'}
            </span>
            <button type="button" className="secondary-btn compact"><BellRing size={16} /> Alerts</button>
            <Link to="/officer/documents" className="secondary-btn compact"><Settings size={16} /> Edit Settings</Link>
          </div>
        </header>

        {/* Filter Controls */}
        <div className="content-panel dashboard-filters">
          <div className="field-group">
            <label htmlFor="applicationSearch">Search applications</label>
            <div className="mini-control"><Search size={14} /><input id="applicationSearch" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Student, application, EMIS, course" /></div>
          </div>
          <div className="field-group">
            <label htmlFor="categoryFilter">Admission category</label>
            <select id="categoryFilter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="courseFilter">Course</label>
            <select id="courseFilter" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
              <option value="">All courses</option>
              {courses.map((course) => <option key={course} value={course}>{course}</option>)}
            </select>
          </div>
        </div>

        {/* Status Counts (Matching Applications removed) */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
          <div className="stat-card"><span>Enquiring</span><strong>{applications.filter((app) => app.status === 'Enquiring').length}</strong></div>
          <div className="stat-card"><span>Confirmed</span><strong>{applications.filter((app) => (app.status === 'Confirmed' || app.status === 'Confirm') && app.status !== 'Sent to VC').length}</strong></div>
          <div className="stat-card"><span>Sent to VC</span><strong>{applications.filter((app) => app.status === 'Sent to VC' || app.status === 'Forwarded to VC').length}</strong></div>
        </div>

        {/* Confirmed Category Summary Box */}
        <div className="content-panel" style={{
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(3px)',
          border: '1px solid rgba(22, 101, 52, 0.2)',
          borderRadius: '16px',
          padding: '18px 24px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Confirmed Category Summary
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 600, background: '#dcfce7', padding: '4px 12px', borderRadius: '999px', border: '1px solid #bbf7d0' }}>
              Total Confirmed &amp; Paid: {confirmedStudents.length}
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px'
          }}>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Transport</p>
              <strong style={{ fontSize: '1.6rem', color: '#166534', fontWeight: 700 }}>{transportCount}</strong>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Hostel</p>
              <strong style={{ fontSize: '1.6rem', color: '#166534', fontWeight: 700 }}>{hostelCount}</strong>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>First Graduate (FG)</p>
              <strong style={{ fontSize: '1.6rem', color: '#166534', fontWeight: 700 }}>{fgCount}</strong>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Sports</p>
              <strong style={{ fontSize: '1.6rem', color: '#166534', fontWeight: 700 }}>{sportsCount}</strong>
            </div>
          </div>
        </div>

        {/* 1. Enquiring List */}
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
                  <td>{app.studentName}</td>
                  <td>{app.emisId || '—'}</td>
                  <td>{app.coursePreference?.firstPreference || '—'}</td>
                  <td>{formatDate(app.submittedAt)}</td>
                  <td><span className="badge badge-warning">{app.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-review"
                        style={{ background: '#166534', color: '#ffffff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                        onClick={() => navigate(`/payment?id=${encodeURIComponent(app.id)}&from=admin`)}
                        title="Process Seat Confirmation Payment"
                      >
                        Confirm
                      </button>
                      <Link to={`/officer/application/${app.id}`} className="btn-review">View/Edit</Link>
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

        {/* 2. Confirmed List */}
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
                  <td>{app.studentName}</td>
                  <td>{app.coursePreference?.firstPreference || '—'}</td>
                  <td>{formatDate(app.confirmedAt || app.submittedAt)}</td>
                  <td><span className="badge badge-success">Confirmed</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link to={`/officer/application/${app.id}`} className="btn-review">Review / Send to VC</Link>
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
                  <td>{app.studentName}</td>
                  <td>{app.coursePreference?.firstPreference || '—'}</td>
                  <td>{formatDate(app.forwardedAt || app.confirmedAt || app.submittedAt)}</td>
                  <td><span className="badge badge-success">Sent to VC</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Link to={`/officer/application/${app.id}`} className="btn-review">View Record</Link>
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
    </main>
  );
}
