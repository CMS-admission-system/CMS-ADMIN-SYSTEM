import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { calculateStudentFeeApi } from '../services/api';
import { calculateCutoff } from '../utils/helpers';

export default function DynamicFeePreview({ formData = {}, initialBreakdown = null, onFeeCalculated = null }) {
  const [breakdown, setBreakdown] = useState(initialBreakdown || formData.feeCalculation || null);
  const [loading, setLoading] = useState(false);

  const cutoff = calculateCutoff({
    mathematics: formData.mathematics,
    physics: formData.physicsMarks,
    chemistry: formData.chemistryMarks,
  }) ?? formData.cutoff_mark ?? formData.cutOffMarks ?? 0;

  useEffect(() => {
    let isMounted = true;
    const fetchLiveCalculation = async () => {
      setLoading(true);
      try {
        const payload = {
          studentName: formData.studentName || 'Candidate',
          department: formData.coursePreference?.firstPreference || formData.department || 'BE CSE',
          community: formData.community || 'OC',
          firstGraduate: formData.firstGraduate || 'No',
          cutoff_mark: Number(cutoff) || 0,
          accommodation: formData.accommodation || 'Day Scholar',
          transportRequired: formData.transportRequired || 'No',
          transport_location: formData.pickupPoint || formData.transport_location || '',
          busRoute: formData.busRoute || '',
          scholarshipCategory: formData.scholarshipCategory || 'General',
          academic_year: '2026-2027',
          application_id: formData.formNumber || formData.id || '',
        };
        const res = await calculateStudentFeeApi(payload);
        if (isMounted && res) {
          setBreakdown(res);
          onFeeCalculated?.(res);
        }
      } catch (err) {
        console.warn('Failed to calculate fee live:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLiveCalculation();
    return () => {
      isMounted = false;
    };
  }, [
    formData.department,
    formData.coursePreference?.firstPreference,
    formData.community,
    formData.firstGraduate,
    formData.accommodation,
    formData.transportRequired,
    formData.pickupPoint,
    formData.busRoute,
    formData.scholarshipCategory,
    cutoff,
    formData.formNumber,
    formData.id,
  ]);

  if (!breakdown) {
    return (
      <div className="dynamic-fee-loading" style={{ padding: '24px', textAlign: 'center', color: '#166534', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
        <Sparkles size={24} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 8px', display: 'block' }} />
        <strong>Retrieving live 2026–2027 fee calculation from college database...</strong>
      </div>
    );
  }

  const s = breakdown.student_details || {};
  const f = breakdown.fee_breakdown || {};
  const fmt = breakdown.formatted || {};
  const isPackageMode = breakdown.calculation_mode === 'package';

  return (
    <div className="dynamic-fee-card" style={{ background: '#ffffff', borderRadius: '14px', border: '1.5px solid #006747', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0, 103, 71, 0.08)', marginBottom: '20px' }}>
      
      {/* Official College Header */}
      <div style={{ background: 'linear-gradient(135deg, #006747 0%, #0d4a36 100%)', color: '#ffffff', padding: '16px 20px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '0.04em', fontWeight: 900, textTransform: 'uppercase' }}>
          CMS COLLEGE OF ENGINEERING
        </h2>
        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#facc15', margin: '4px 0 2px', letterSpacing: '0.05em' }}>
          FEE STRUCTURE – 2026–2027
        </div>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>
          TNEA COUNSELLING CODE: 2635 · AUTONOMOUS
        </div>
      </div>

      {/* Mode & Live Indicator Bar */}
      <div style={{ background: '#f8fafc', padding: '10px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.82rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a' }}>
          <ShieldCheck size={16} color="#006747" />
          <span>Calculation Mode: </span>
          <span style={{ color: '#006747', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
            {breakdown.calculation_mode_label || 'Mode A: Department-wise'}
          </span>
        </span>
        <span style={{ color: loading ? '#d97706' : '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          {loading ? <Clock size={14} /> : <CheckCircle2 size={14} />}
          {loading ? 'Recalculating...' : 'Database Verified'}
        </span>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {/* Student Profile Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '18px', fontSize: '0.82rem' }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Student Name & App No:</span>
            <strong style={{ color: '#0f172a' }}>{s.student_name} ({s.application_number})</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Department & Community:</span>
            <strong style={{ color: '#0f172a' }}>{s.department} · {s.community}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>FG Status & Cut-off:</span>
            <strong style={{ color: '#0f172a' }}>{s.first_graduate} · Cutoff: {s.cutoff_mark}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Accommodation & Transport:</span>
            <strong style={{ color: '#0f172a' }}>{s.accommodation} · {s.transport_selection}</strong>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Scholarship Category:</span>
            <span style={{ fontWeight: 700, color: f.pmss_status === 'Approved' ? '#15803d' : (f.pmss_status?.includes('Eligible') ? '#b45309' : '#475569') }}>
              {s.scholarship_category} — 
              <span style={{ marginLeft: '4px', padding: '1px 6px', borderRadius: '4px', background: f.pmss_status?.includes('Eligible') ? '#fef3c7' : '#f1f5f9' }}>
                {f.pmss_status}
              </span>
            </span>
          </div>
        </div>

        {/* Detailed Itemized Fee Breakdown Table */}
        <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#1e293b', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Fee Component</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Standard / Base</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Concession / Waiver</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Effective Amount</th>
              </tr>
            </thead>
            <tbody style={{ divideY: '1px solid #f1f5f9' }}>
              
              {/* Row 1: Tuition or Community Package */}
              {!isPackageMode ? (
                <>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '9px 12px' }}>
                      <strong>Tuition Fee (Per Year)</strong>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{s.department} · {s.first_graduate}</div>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt.original_tuition}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                      {f.fg_reduction > 0 ? `- ${fmt.fg_reduction} (FG)` : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt.applicable_tuition}</td>
                  </tr>

                  {/* Cut-off Concession Row */}
                  {f.cutoff_concession_amount > 0 ? (
                    <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Award size={14} /> Cut-off Merit Concession
                        </span>
                        <div style={{ fontSize: '0.74rem', color: '#166534' }}>{f.cutoff_concession_label} (Cut-off: {s.cutoff_mark})</div>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#15803d', fontWeight: 700 }}>
                        - {fmt.cutoff_concession}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                        - {fmt.cutoff_concession}
                      </td>
                    </tr>
                  ) : null}

                  {/* PMSS Scholarship Row */}
                  {f.pmss_status?.includes('Eligible') || f.pmss_status === 'Approved' ? (
                    <tr style={{ background: f.pmss_approved_amount > 0 ? '#f0fdf4' : '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
                      <td style={{ padding: '9px 12px' }}>
                        <strong>PMSS Scholarship (SC/SCA/SCC/ST)</strong>
                        <div style={{ fontSize: '0.74rem', color: '#92400e' }}>
                          Status: {f.pmss_status} {f.pmss_approved_amount === 0 ? '(Approved upon official college office verification)' : ''}
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: f.pmss_approved_amount > 0 ? '#15803d' : '#d97706', fontWeight: 600 }}>
                        {f.pmss_approved_amount > 0 ? `- ${fmt.pmss_approved}` : 'Pending Verification'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {f.pmss_approved_amount > 0 ? `- ${fmt.pmss_approved}` : '₹0'}
                      </td>
                    </tr>
                  ) : null}

                  {/* Net Final Tuition */}
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a' }}>Net Tuition Payable</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b' }}>{fmt.original_tuition}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                      - ₹{int(f.fg_reduction + f.cutoff_concession_amount + f.pmss_approved_amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#006747' }}>
                      {fmt.final_tuition}
                    </td>
                  </tr>

                  {/* Admission Fee (Paid Separately) */}
                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <td style={{ padding: '9px 12px' }}>
                      <strong>Admission Fee (Paid Separately)</strong>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '6px' }}>(One-time registration · Excluded from Total Fees)</span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt.admission_fee}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b' }}>Paid separately</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt.admission_fee}</td>
                  </tr>

                  {/* Hostel Fee (if applicable) */}
                  {s.accommodation === 'Hostel' ? (
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px' }}>
                        <strong>Hostel &amp; Mess Charges</strong>
                        <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '6px' }}>(Annual)</span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt.hostel_fee}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt.hostel_fee}</td>
                    </tr>
                  ) : null}
                </>
              ) : (
                /* Mode B: Community Package Row */
                <>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '9px 12px' }}>
                      <strong>Community Package ({f.community_package_name || s.community})</strong>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Includes Tuition + {s.accommodation} (No duplicate hostel or tuition charges)
                      </div>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt.community_package}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt.community_package}</td>
                  </tr>
                </>
              )}

              {/* Transport Fee Row (if applicable) */}
              {f.transport_fee > 0 ? (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '9px 12px' }}>
                    <strong>College Bus Transport Fee</strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{f.transport_label}</div>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt.transport_fee}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8' }}>—</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt.transport_fee}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Highlighted Final Payable Amount Card */}
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '2px solid #059669', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Fees (Excluding Admission Fee)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#047857' }}>
              Total Base: <span style={{ textDecoration: 'line-through' }}>{fmt.total_original_amount}</span> · Total Concession / Waiver: <strong style={{ color: '#15803d' }}>{fmt.total_concession}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#065f46', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {fmt.final_payable_amount}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
              Admission Fee ({fmt.admission_fee}) paid separately · Zero duplicate charges
            </div>
          </div>
        </div>

        {/* Small Legal Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748b', marginTop: '12px' }}>
          <Info size={14} />
          <span>Calculations strictly follow CMS College 2026–2027 Admission Guidelines and Government Anna University Regulations.</span>
        </div>

      </div>
    </div>
  );
}

function int(val) {
  return Math.round(Number(val) || 0);
}
