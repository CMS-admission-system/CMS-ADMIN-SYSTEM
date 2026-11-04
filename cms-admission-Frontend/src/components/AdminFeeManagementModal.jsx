import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Bus,
  Check,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Layers,
  Save,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { approveScholarshipApi, fetchFeeConfigApi, updateFeeConfigApi } from '../services/api';

export default function AdminFeeManagementModal({ isOpen, onClose, applications = [], onConfigUpdated }) {
  const [activeTab, setActiveTab] = useState('mode'); // 'mode', 'depts', 'packages', 'cutoff', 'transport', 'pmss'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Config State
  const [config, setConfig] = useState({
    master: {
      academic_year: '2026-2027',
      calculation_mode: 'department',
      admission_fee: 5000,
      hostel_fee: 45000,
      apply_cutoff_in_package_mode: false,
      allow_hostel_transport: false,
      package_included_components: ['tuition', 'hostel'],
    },
    departments: [],
    community_packages: [],
    cutoff_slabs: [],
    transport_fees: [],
  });

  // PMSS Approval input state: { [appId]: approvedAmount }
  const [pmssInputs, setPmssInputs] = useState({});
  const [approvingId, setApprovingId] = useState(null);
  const [pmssSuccessMsg, setPmssSuccessMsg] = useState('');
  const [pmssSearch, setPmssSearch] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchFeeConfigApi('2026-2027');
      if (res) {
        setConfig(res);
      }
    } catch (err) {
      console.error('Error loading fee config:', err);
      setErrorMsg('Failed to load current fee structure from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveToDatabase = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg('');
    try {
      const payload = {
        academic_year: config.master.academic_year || '2026-2027',
        calculation_mode: config.master.calculation_mode,
        admission_fee: Number(config.master.admission_fee) || 5000,
        hostel_fee: Number(config.master.hostel_fee) || 45000,
        apply_cutoff_in_package_mode: Boolean(config.master.apply_cutoff_in_package_mode),
        allow_hostel_transport: Boolean(config.master.allow_hostel_transport),
        departments: config.departments,
        community_packages: config.community_packages,
        cutoff_slabs: config.cutoff_slabs,
        transport_fees: config.transport_fees,
      };

      const res = await updateFeeConfigApi(payload);
      if (res.ok) {
        setSaveSuccess(true);
        if (onConfigUpdated) onConfigUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(res.error || 'Failed to save configuration to database.');
      }
    } catch (err) {
      console.error('Save error:', err);
      setErrorMsg('Network error while saving fee configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePmss = async (app) => {
    const amount = Number(pmssInputs[app.id]);
    if (isNaN(amount) || amount <= 0) {
      window.alert('Please enter a valid approved scholarship amount.');
      return;
    }
    setApprovingId(app.id);
    setPmssSuccessMsg('');
    try {
      const res = await approveScholarshipApi(app.id, { approvedAmount: amount, status: 'Approved' });
      if (res.ok) {
        setPmssSuccessMsg(`Approved scholarship of ₹${amount.toLocaleString('en-IN')} for ${app.studentName || app.id}!`);
        if (onConfigUpdated) onConfigUpdated();
        setTimeout(() => setPmssSuccessMsg(''), 4000);
      } else {
        window.alert(`Failed to approve scholarship: ${res.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('PMSS error:', err);
      window.alert('Network error while approving scholarship.');
    } finally {
      setApprovingId(null);
    }
  };

  // Filter PMSS eligible applicants: SC, SCA, SCC, ST
  const pmssApplicants = applications.filter((app) => {
    const c = String(app.community || app.caste || '').toUpperCase();
    const isEligible = c.includes('SC') || c.includes('ST') || c.includes('SCA') || c.includes('SCC');
    if (!isEligible) return false;
    if (!pmssSearch) return true;
    const q = pmssSearch.toLowerCase();
    return (
      String(app.studentName || '').toLowerCase().includes(q)
      || String(app.id || '').toLowerCase().includes(q)
      || String(app.formNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '960px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1.5px solid #006747', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(135deg, #006747 0%, #0d4a36 100%)', color: '#ffffff', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} color="#facc15" />
              <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#ffffff' }}>
                Fee Management &amp; Dynamic Calculator Engine (2026–2027)
              </h3>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#bbf7d0' }}>
              CMS College of Engineering · Master Database Control &amp; Fee Rules
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '0 12px' }}>
          {[
            { id: 'mode', label: 'Calculation Mode & Global Charges', icon: ShieldCheck },
            { id: 'depts', label: 'Department Tuition Fees', icon: GraduationCap },
            { id: 'packages', label: 'Community Packages (Mode B)', icon: Building2 },
            { id: 'cutoff', label: 'Cut-off Concession Slabs', icon: Award },
            { id: 'transport', label: 'Transport Charges', icon: Bus },
            { id: 'pmss', label: `PMSS Scholarship Approvals (${pmssApplicants.length})`, icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 14px',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.82rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#006747' : '#64748b',
                  borderBottom: active ? '3px solid #006747' : '3px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Scrollable Area */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, fontSize: '0.86rem' }}>
          
          {errorMsg ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {saveSuccess ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <strong>Fee configuration saved and committed to MySQL database successfully!</strong>
            </div>
          ) : null}

          {/* TAB 1: Calculation Mode & Global Charges */}
          {activeTab === 'mode' && (
            <div>
              <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontWeight: 800 }}>Admin Calculation Mode Selection</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                {/* Option Mode A */}
                <div
                  onClick={() => setConfig((prev) => ({ ...prev, master: { ...prev.master, calculation_mode: 'department' } }))}
                  style={{
                    border: config.master.calculation_mode === 'department' ? '2px solid #006747' : '1px solid #cbd5e1',
                    background: config.master.calculation_mode === 'department' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.94rem' }}>Mode A – Department-wise</strong>
                    <input
                      type="radio"
                      name="calcMode"
                      checked={config.master.calculation_mode === 'department'}
                      onChange={() => {}}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0 }}>
                    Final Payable = Admission Fee (₹5,000) + Final Tuition + Hostel (₹45,000) + Transport − Approved Concessions.
                  </p>
                </div>

                {/* Option Mode B */}
                <div
                  onClick={() => setConfig((prev) => ({ ...prev, master: { ...prev.master, calculation_mode: 'package' } }))}
                  style={{
                    border: config.master.calculation_mode === 'package' ? '2px solid #006747' : '1px solid #cbd5e1',
                    background: config.master.calculation_mode === 'package' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.94rem' }}>Mode B – Community Package</strong>
                    <input
                      type="radio"
                      name="calcMode"
                      checked={config.master.calculation_mode === 'package'}
                      onChange={() => {}}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0 }}>
                    Uses applicable Community Package (e.g. SC/ST ₹63.5k/₹62k, BC/MBC FG ₹25k). Prevents duplicate hostel or tuition charges.
                  </p>
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontWeight: 800 }}>Global Charge Amounts</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Admission Fee (One-Time ₹)
                  </label>
                  <input
                    type="number"
                    value={config.master.admission_fee}
                    onChange={(e) => setConfig((prev) => ({ ...prev, master: { ...prev.master, admission_fee: Number(e.target.value) } }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Department Mode Hostel Fee (Annual ₹)
                  </label>
                  <input
                    type="number"
                    value={config.master.hostel_fee}
                    onChange={(e) => setConfig((prev) => ({ ...prev, master: { ...prev.master, hostel_fee: Number(e.target.value) } }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontWeight: 800 }}>Admin Policy Toggles</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.master.apply_cutoff_in_package_mode}
                    onChange={(e) => setConfig((prev) => ({ ...prev, master: { ...prev.master, apply_cutoff_in_package_mode: e.target.checked } }))}
                  />
                  <span>Allow Cut-off Concessions in Community Package Mode (Mode B)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config.master.allow_hostel_transport}
                    onChange={(e) => setConfig((prev) => ({ ...prev, master: { ...prev.master, allow_hostel_transport: e.target.checked } }))}
                  />
                  <span>Allow Hostel Residents to opt for college bus transport (otherwise transport is ₹0 for hostel)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Department Tuition Fees */}
          {activeTab === 'depts' && (
            <div>
              <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 800 }}>Department Tuition Fee Slabs</h4>
              <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#64748b' }}>
                First Graduate (FG) selects the reduced tuition fee automatically.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Code</th>
                    <th style={{ padding: '8px 12px' }}>Department Programme</th>
                    <th style={{ padding: '8px 12px' }}>NFG Tuition Fee (₹)</th>
                    <th style={{ padding: '8px 12px' }}>FG Tuition Fee (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {config.departments.map((dept, index) => (
                    <tr key={dept.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{dept.code}</td>
                      <td style={{ padding: '8px 12px' }}>{dept.name}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          value={dept.nfg_fee}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig((prev) => {
                              const depts = [...prev.departments];
                              depts[index] = { ...depts[index], nfg_fee: val };
                              return { ...prev, departments: depts };
                            });
                          }}
                          style={{ width: '110px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          value={dept.fg_fee}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig((prev) => {
                              const depts = [...prev.departments];
                              depts[index] = { ...depts[index], fg_fee: val };
                              return { ...prev, departments: depts };
                            });
                          }}
                          style={{ width: '110px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Community Packages */}
          {activeTab === 'packages' && (
            <div>
              <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 800 }}>Community-wise Packages (Mode B)</h4>
              <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#64748b' }}>
                Used in Package Mode. Package includes tuition and accommodation without double charging.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Community Group</th>
                    <th style={{ padding: '8px 12px' }}>Hostel Package (₹)</th>
                    <th style={{ padding: '8px 12px' }}>Day Scholar Package (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {config.community_packages.map((pkg, index) => (
                    <tr key={pkg.community_group} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{pkg.community_group}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          value={pkg.hostel_package}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig((prev) => {
                              const pkgs = [...prev.community_packages];
                              pkgs[index] = { ...pkgs[index], hostel_package: val };
                              return { ...prev, community_packages: pkgs };
                            });
                          }}
                          style={{ width: '130px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          value={pkg.dayscholar_package}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig((prev) => {
                              const pkgs = [...prev.community_packages];
                              pkgs[index] = { ...pkgs[index], dayscholar_package: val };
                              return { ...prev, community_packages: pkgs };
                            });
                          }}
                          style={{ width: '130px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Cut-off Concession Slabs */}
          {activeTab === 'cutoff' && (
            <div>
              <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 800 }}>Cut-off Merit Concession Slabs</h4>
              <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#64748b' }}>
                Only the highest eligible slab is applied to the applicable FG/NFG tuition amount.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Cut-off Range</th>
                    <th style={{ padding: '8px 12px' }}>Type</th>
                    <th style={{ padding: '8px 12px' }}>Value</th>
                    <th style={{ padding: '8px 12px' }}>Label</th>
                  </tr>
                </thead>
                <tbody>
                  {config.cutoff_slabs.map((slab, index) => (
                    <tr key={slab.id || slab.min_cutoff} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                        {slab.min_cutoff} {slab.max_cutoff >= 200 ? '+' : `– ${slab.max_cutoff}`}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{slab.concession_type === 'percent' ? 'Percentage (%)' : 'Fixed Cash (₹)'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          value={slab.concession_value}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig((prev) => {
                              const slabs = [...prev.cutoff_slabs];
                              slabs[index] = { ...slabs[index], concession_value: val };
                              return { ...prev, cutoff_slabs: slabs };
                            });
                          }}
                          style={{ width: '100px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          value={slab.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setConfig((prev) => {
                              const slabs = [...prev.cutoff_slabs];
                              slabs[index] = { ...slabs[index], label: val };
                              return { ...prev, cutoff_slabs: slabs };
                            });
                          }}
                          style={{ width: '220px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: Transport Slabs */}
          {activeTab === 'transport' && (
            <div>
              <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 800 }}>Transport Charge Categories</h4>
              <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#64748b' }}>
                Annual college bus transportation fees based on route distance.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Transport Category</th>
                    <th style={{ padding: '8px 12px' }}>Annual Charge (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {config.transport_fees.map((t, index) => (
                    <tr key={t.category_name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{t.category_name}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          value={t.amount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setConfig((prev) => {
                              const arr = [...prev.transport_fees];
                              arr[index] = { ...arr[index], amount: val };
                              return { ...prev, transport_fees: arr };
                            });
                          }}
                          style={{ width: '140px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: PMSS Scholarship Approvals */}
          {activeTab === 'pmss' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>PMSS Scholarship Approvals</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Eligible communities: SC, SCA, SCC, ST. Deducted only upon official Admin approval.
                  </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', padding: '4px 8px', border: '1px solid #cbd5e1' }}>
                  <Search size={14} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Search applicant name / ID..."
                    value={pmssSearch}
                    onChange={(e) => setPmssSearch(e.target.value)}
                    style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.82rem', marginLeft: '6px' }}
                  />
                </div>
              </div>

              {pmssSuccessMsg ? (
                <div style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                  {pmssSuccessMsg}
                </div>
              ) : null}

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>App No</th>
                    <th style={{ padding: '8px 10px' }}>Student</th>
                    <th style={{ padding: '8px 10px' }}>Community</th>
                    <th style={{ padding: '8px 10px' }}>Department</th>
                    <th style={{ padding: '8px 10px' }}>Current Status</th>
                    <th style={{ padding: '8px 10px' }}>Approved Amt (₹)</th>
                    <th style={{ padding: '8px 10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pmssApplicants.length ? (
                    pmssApplicants.map((app) => {
                      const curCalc = app.feeCalculation?.fee_breakdown || {};
                      const isApproved = curCalc.pmss_status === 'Approved' || (curCalc.pmss_approved_amount > 0);
                      const currentApproved = curCalc.pmss_approved_amount || 0;
                      return (
                        <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{app.formNumber || app.id}</td>
                          <td style={{ padding: '8px 10px' }}><strong>{app.studentName}</strong></td>
                          <td style={{ padding: '8px 10px' }}>{app.community}</td>
                          <td style={{ padding: '8px 10px' }}>{app.coursePreference?.firstPreference || app.department}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, background: isApproved ? '#dcfce7' : '#fef3c7', color: isApproved ? '#15803d' : '#b45309' }}>
                              {isApproved ? 'Approved' : 'Verification Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <input
                              type="number"
                              placeholder={currentApproved ? String(currentApproved) : 'e.g. 55000'}
                              value={pmssInputs[app.id] ?? (currentApproved > 0 ? currentApproved : '')}
                              onChange={(e) => setPmssInputs((prev) => ({ ...prev, [app.id]: e.target.value }))}
                              style={{ width: '100px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <button
                              type="button"
                              onClick={() => handleApprovePmss(app)}
                              disabled={approvingId === app.id}
                              style={{
                                background: '#006747',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {approvingId === app.id ? 'Saving...' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        No SC/SCA/SCC/ST applications found currently.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Academic Year: <strong>2026–2027</strong> · All fee updates take effect immediately on live calculations.
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', fontSize: '0.84rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={saving}
              style={{
                background: '#006747',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0, 103, 71, 0.25)',
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving to Database...' : 'Save Configuration to MySQL'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
