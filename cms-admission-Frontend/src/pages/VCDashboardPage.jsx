import {
  Building2,
  Bus,
  Download,
  Eye,
  GraduationCap,
  Home,
  LogOut,
  Search,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { downloadApplicationsCsv, formatDate } from '../utils/helpers';

export default function VCDashboardPage() {
  const navigate = useNavigate();
  const { applications, logoutDemoUser } = useAppContext();

  // Ensure VC can view all applications sent by Admin/AO
  const sentToVC = applications.filter((app) => (
    app.status === 'Sent to VC' ||
    app.status === 'Forwarded to VC' ||
    app.status === 'Confirmed' ||
    app.status === 'Confirm'
  ));

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);

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

  const handleLogout = () => {
    logoutDemoUser();
    navigate('/login/vc', { replace: true });
  };

  const handleCsvExport = () => {
    downloadApplicationsCsv(filteredSentToVC, 'cms-vc-applications.csv');
  };

  return (
    <main className="page-shell admin-shell vc-shell">
      {/* Top Green Box in Vertical Layout */}
      <aside className="admin-sidebar vc-top-header">
        <div className="sidebar-brand">
          <img src="/cms-logo.png" alt="CMS logo" className="brand-logo small" />
          <div>
            <p className="eyebrow accent" style={{ margin: 0 }}>VC Portal</p>
            <strong style={{ fontSize: '1.1rem' }}>Vice-Chairman Review</strong>
          </div>
        </div>

        {/* RIGHT SIDE of Green Box: Category Icons & Navigation */}
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

          <nav className="admin-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/vc/dashboard" className="nav-item active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Home size={15} /> Home
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

        {/* Forwarded Applications List */}
        <div className="content-panel table-card">
          <div className="section-header space-between">
            <div>
              <h3 style={{ margin: 0 }}>Applications Forwarded by Admission Office ({filteredSentToVC.length})</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
                Candidates confirmed by admission office and submitted for VC review
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
                  <td><strong>{app.studentName}</strong></td>
                  <td>{app.emisId || '—'}</td>
                  <td>{app.coursePreference?.firstPreference || '—'}</td>
                  <td>{app.admissionCategory || '—'}</td>
                  <td>{formatDate(app.forwardedAt || app.confirmedAt || app.submittedAt)}</td>
                  <td><span className="badge badge-success">Sent by AO</span></td>
                  <td>
                    <Link
                      to={`/vc/confirmed/${app.id}`}
                      className="btn-review"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> View Record
                    </Link>
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
                            to={`/vc/confirmed/${st.id}`}
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
