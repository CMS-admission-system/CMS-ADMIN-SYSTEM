import { Download, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { downloadApplicationsCsv, formatDate } from '../utils/helpers';

export default function VCDashboardPage() {
  const navigate = useNavigate();
  const { applications, auth, logoutDemoUser } = useAppContext();
  const sentToVC = applications.filter((app) => app.status === 'Sent to VC' || app.status === 'Confirmed' || app.status === 'Confirm');
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredSentToVC = sentToVC.filter((app) => [
    app.id,
    app.formNumber,
    app.studentName,
    app.emisId,
    app.coursePreference?.firstPreference,
    app.admissionCategory,
  ].some((field) => String(field || '').toLocaleLowerCase().includes(normalizedSearch)));

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

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/vc', { replace: true });
  };

  const handleCsvExport = () => {
    downloadApplicationsCsv(filteredSentToVC, 'cms-vc-applications.csv');
  };

  return (
    <main className="page-shell admin-shell vc-shell">
      <aside className="admin-sidebar vc-top-header">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent">VC Portal</p>
            <strong>Vice-Chairman</strong>
          </div>
        </div>

        <nav className="admin-nav">
          <Link to="/vc/dashboard" className="nav-item active">Applications from admission office</Link>
          <button type="button" className="nav-item button-link" onClick={handleLogout}>Logout</button>
        </nav>
      </aside>

      <section className="admin-content" style={{ width: '100%' }}>
        <header className="admin-topbar">
          <div>
            <p className="eyebrow accent">Chairman&apos;s view</p>
            <h2>{auth.username || 'Vice-Chairman'}</h2>
          </div>
          <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="button" className="secondary-btn compact" onClick={handleCsvExport}><Download size={16} /> Export Excel/CSV</button>
          </div>
        </header>

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

        <div className="content-panel table-card">
          <div className="section-header space-between">
            <h3>Applications forwarded by admission office</h3>
            <div className="mini-control"><Search size={14} /> <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search forwarded students" aria-label="Search forwarded students" /></div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.No</th>
                <th>Admin No</th>
                <th>Student</th>
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
                  <td>{app.studentName}</td>
                  <td>{app.emisId}</td>
                  <td>{app.coursePreference?.firstPreference || '—'}</td>
                  <td>{app.admissionCategory || '—'}</td>
                  <td>{formatDate(app.forwardedAt || app.confirmedAt || app.submittedAt)}</td>
                  <td><span className="badge badge-success">{app.status}</span></td>
                  <td><Link to={`/vc/confirmed/${app.id}`} className="btn-review">Review / Open</Link></td>
                </tr>
              )) : <tr><td colSpan="9">{sentToVC.length ? 'No forwarded applications match your search.' : 'No applications have been sent to VC yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
