import { useState } from 'react';
import { ArrowLeft, Check, CreditCard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '../utils/helpers';
import FileUploadField from '../components/FileUploadField';

const DEMO_PAYMENT_QR_VALUE = 'CMS ADMISSION PAYMENT DEMO ONLY - NO PAYMENT ADDRESS';

export default function AdmissionPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('id');
  const fromAdmin = searchParams.get('from') === 'admin' || Boolean(studentId);

  const {
    draft,
    saveDraft,
    paymentSettings,
    submitApplication,
    updateApplication,
    applications,
    auth,
  } = useAppContext();

  // Find target candidate: either from applications by ID (admin dashboard flow), or current registration draft
  const targetApp = studentId
    ? applications.find((a) => a.id === studentId || a.formNumber === studentId)
    : null;
  const currentRecord = targetApp || draft;

  const [staffName, setStaffName] = useState(() => (
    currentRecord?.staffViewName || auth.username || ''
  ));
  const [paymentStatus, setPaymentStatus] = useState(() => (
    currentRecord?.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'
  ));
  const [paymentError, setPaymentError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentQr = paymentSettings.paymentQrs?.[0] || paymentSettings.paymentQr || null;
  const adminNum = currentRecord?.formNumber || currentRecord?.id || 'CMS-2026-1001';

  const handleConfirm = async () => {
    // 1. Staff Name is mandatory
    if (!String(staffName || '').trim()) {
      setPaymentError('Staff Name is required to process seat confirmation.');
      return;
    }

    // 2. Student must complete payment before confirmation. Do not mark unpaid applications as paid.
    if (paymentStatus !== 'Paid') {
      setPaymentError('Student must complete payment (select Paid) before confirmation. Unpaid applications cannot be confirmed.');
      return;
    }

    setPaymentError('');
    setIsSubmitting(true);

    try {
      if (targetApp) {
        // Flow from Admin Dashboard (Enquiring -> Confirm)
        const updatedRecord = {
          ...targetApp,
          status: 'Confirmed',
          paymentStatus: 'Paid',
          admissionFeeAmount: 5000,
          staffViewName: String(staffName).trim(),
          confirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await updateApplication(
          targetApp.id,
          updatedRecord,
          `Seat confirmed and payment verified as Paid by ${staffName}`,
          staffName
        );
        alert(`Payment verified as Paid! Application #${adminNum} (${targetApp.studentName}) is confirmed.`);
        navigate('/officer/dashboard', { replace: true });
      } else {
        // Flow from Student Registration
        const application = await submitApplication({
          ...draft,
          id: adminNum,
          formNumber: adminNum,
          status: 'Confirmed',
          admissionFeeAmount: 5000,
          paymentStatus: 'Paid',
          staffViewName: String(staffName).trim(),
          confirmedAt: new Date().toISOString(),
        });
        navigate(`/application-success?id=${encodeURIComponent(application?.id || adminNum || '')}`);
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      setPaymentError('Unable to confirm payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (fromAdmin) {
      navigate('/officer/dashboard');
    } else {
      navigate('/application-preview');
    }
  };

  return (
    <main className="page-shell payment-shell" style={{ background: 'transparent' }}>
      <section className="content-panel payment-panel" style={{ background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(3px)', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
        <div className="section-header">
          <div>
            <p className="eyebrow accent">Admission Payment</p>
            <h2>Seat confirmation payment</h2>
            {fromAdmin && targetApp ? (
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                Processing payment for: <strong>{targetApp.studentName}</strong> ({targetApp.coursePreference?.firstPreference || 'Course'})
              </p>
            ) : null}
          </div>
          <img src="/cms-logo.png" alt="CMS College of Engineering logo" className="brand-logo small" />
        </div>

        <div className="payment-meta">
          <div style={{ background: 'rgba(255,255,255,0.5)' }}><span>Admin / Form No</span><strong>#{adminNum}</strong></div>
          <div style={{ background: 'rgba(255,255,255,0.5)' }}><span>Admission fee</span><strong>{formatCurrency(5000)}</strong></div>
        </div>

        {/* 1. Payment QR Section */}
        <section className="payment-qr-section" style={{ background: 'rgba(255,255,255,0.5)' }}>
          <h3>Payment QR code</h3>
          {paymentQr?.dataUrl ? (
            <img className="payment-qr-image" src={paymentQr.dataUrl} alt="College payment QR code" />
          ) : (
            <QRCodeSVG
              className="payment-qr-image"
              size={240}
              value={DEMO_PAYMENT_QR_VALUE}
              level="H"
              marginSize={4}
              bgColor="#fff"
              fgColor="#004D38"
              aria-label="Demo-only QR code; does not initiate a payment"
            />
          )}
          <p>{paymentQr?.dataUrl ? 'Official QR image configured by the college.' : 'Demo QR code for payment verification.'}</p>
          <p className="payment-upi-id"><strong>UPI ID:</strong> <code>{paymentSettings.upiId || 'Not configured'}</code></p>
          <p>Scan with any UPI app (GPay, PhonePe, Paytm) to complete payment.</p>
        </section>

        {/* 2. Cash / Bank Receipt Section */}
        <section className="payment-cash-section" style={{ background: 'rgba(255,255,255,0.5)', padding: '16px', borderRadius: '12px', marginTop: '16px', border: '1px solid rgba(0,77,56,0.12)' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: '#004D38' }}>Cash Payment / Bank Receipt</h3>
          <p style={{ margin: '0 0 12px', fontSize: '0.85rem' }}>Students paying by cash at the college counter or bank deposit can upload their cash bill or receipt here.</p>
          <FileUploadField
            label="Upload Cash Bill / Payment Receipt (optional)"
            value={currentRecord?.cashReceipt || null}
            existingFiles={[
              ...Object.values(currentRecord?.documents || {}),
              currentRecord?.studentSignature,
              currentRecord?.parentSignature,
            ].filter(Boolean)}
            onChange={(file) => {
              if (targetApp) {
                targetApp.cashReceipt = file;
              } else {
                saveDraft({ ...draft, cashReceipt: file });
              }
            }}
          />
        </section>

        {/* 3. Combined Box: Amount, Staff Name, Payment Status (Requirement 6) */}
        <section
          className="payment-verification-box"
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(3px)',
            border: '2px solid #006747',
            borderRadius: '16px',
            padding: '20px',
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 4px 16px rgba(0, 103, 71, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,103,71,0.15)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#004d38', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} /> Payment Verification &amp; Staff Confirmation
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Required for Confirmation</span>
          </div>

          {/* Combined Field 1: Amount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontWeight: 600, color: '#334155' }}>Admission Fee Amount:</span>
            <strong style={{ fontSize: '1.3rem', color: '#006747' }}>{formatCurrency(5000)}</strong>
          </div>

          {/* Combined Field 2: Staff Name */}
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label htmlFor="paymentStaffName" style={{ fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Staff Name <span className="required-indicator" style={{ color: '#006747' }}>*</span>
            </label>
            <input
              id="paymentStaffName"
              type="text"
              required
              value={staffName}
              onChange={(e) => {
                setStaffName(e.target.value);
                if (paymentError) setPaymentError('');
              }}
              placeholder="Type staff name"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
          </div>

          {/* Combined Field 3: Payment Status (Paid / Unpaid) */}
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Payment Status <span className="required-indicator" style={{ color: '#006747' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                className={`choice-card ${paymentStatus === 'Paid' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentStatus('Paid');
                  if (paymentError) setPaymentError('');
                }}
                style={{ padding: '12px', textAlign: 'center', fontWeight: 700, borderRadius: '8px' }}
              >
                ✓ Paid
              </button>
              <button
                type="button"
                className={`choice-card ${paymentStatus === 'Unpaid' ? 'active' : ''}`}
                onClick={() => setPaymentStatus('Unpaid')}
                style={{ padding: '12px', textAlign: 'center', fontWeight: 700, borderRadius: '8px' }}
              >
                ✗ Unpaid
              </button>
            </div>
          </div>

          {paymentError ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
              {paymentError}
            </div>
          ) : null}
        </section>

        {/* Action Buttons */}
        <div className="form-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="secondary-btn" onClick={handlePrevious}>
            <ArrowLeft size={16} /> Previous
          </button>
          <button type="button" className="primary-btn" onClick={handleConfirm} disabled={isSubmitting}>
            <Check size={16} /> {isSubmitting ? 'Confirming...' : 'Confirm Seat'}
          </button>
        </div>
      </section>
    </main>
  );
}
