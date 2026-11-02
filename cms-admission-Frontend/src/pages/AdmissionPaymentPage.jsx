import { useState } from 'react';
import { ArrowLeft, Banknote, Check, QrCode } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { sendApplicationStatusEmail } from '../services/api';

const DEMO_PAYMENT_QR_VALUE = 'CMS ADMISSION PAYMENT DEMO ONLY - NO PAYMENT ADDRESS';

export default function AdmissionPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentId = searchParams.get('id');
  const fromAdmin = searchParams.get('from') === 'admin' || Boolean(studentId);

  const {
    draft,
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

  const adminNum = currentRecord?.formNumber || currentRecord?.id || 'CMS-2026-1001';
  const initialAmount = String(currentRecord?.admissionFeeAmount || 5000);
  const initialStaff = currentRecord?.staffViewName || auth.username || '';

  // Which payment method is actively selected: 'Cash' or 'GPay'
  const [selectedMethod, setSelectedMethod] = useState(() => (
    currentRecord?.paymentMethod === 'GPay' ? 'GPay' : 'Cash'
  ));

  // Box A: Cash Payment State
  const [cashAmount, setCashAmount] = useState(() => (
    currentRecord?.paymentMethod === 'Cash' ? initialAmount : '5000'
  ));
  const [cashStatus, setCashStatus] = useState(() => (
    currentRecord?.paymentMethod === 'Cash' && currentRecord?.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'
  ));
  const [cashStaffName, setCashStaffName] = useState(() => (
    currentRecord?.paymentMethod === 'Cash' ? initialStaff : (auth.username || '')
  ));

  // Box B: GPay Payment State
  const [gpayAmount, setGpayAmount] = useState(() => (
    currentRecord?.paymentMethod === 'GPay' ? initialAmount : '5000'
  ));
  const [gpayStatus, setGpayStatus] = useState(() => (
    currentRecord?.paymentMethod === 'GPay' && currentRecord?.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'
  ));
  const [gpayStaffName, setGpayStaffName] = useState(() => (
    currentRecord?.paymentMethod === 'GPay' ? initialStaff : (auth.username || '')
  ));

  const [paymentError, setPaymentError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentQr = paymentSettings.paymentQrs?.[0] || paymentSettings.paymentQr || null;

  const handleConfirm = async () => {
    setPaymentError('');

    const activeAmountStr = selectedMethod === 'Cash' ? cashAmount : gpayAmount;
    const activeStatus = selectedMethod === 'Cash' ? cashStatus : gpayStatus;
    const activeStaff = String(selectedMethod === 'Cash' ? cashStaffName : gpayStaffName).trim();
    const verifiedAmount = Number(activeAmountStr);

    // 1. Validate Amount
    if (!activeAmountStr || Number.isNaN(verifiedAmount) || verifiedAmount <= 0) {
      setPaymentError(`Please enter a valid payment amount for ${selectedMethod} Payment.`);
      return;
    }

    // 2. Validate Staff Verification
    if (!activeStaff) {
      setPaymentError(`Authorized Staff Name is required under ${selectedMethod} Payment verification.`);
      return;
    }

    // 3. Validate Paid status (prevent unpaid payments from being marked Confirmed)
    if (activeStatus !== 'Paid') {
      setPaymentError(`Student must complete payment (select Paid under ${selectedMethod} Payment) before confirmation. Unpaid applications cannot be confirmed.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const updatedFields = {
        paymentMethod: selectedMethod,
        admissionFeeAmount: verifiedAmount,
        paymentStatus: 'Paid',
        staffViewName: activeStaff,
        paymentVerificationMode: `Manual Staff ${selectedMethod} Verification`,
        status: 'Confirmed',
        confirmedAt: nowIso,
        updatedAt: nowIso,
      };

      const destEmail = targetApp?.email || draft?.email;
      if (destEmail) {
        sendApplicationStatusEmail({
          to: destEmail,
          studentName: targetApp?.studentName || draft?.studentName || 'Student',
          applicationId: adminNum,
          status: 'Confirmed',
          course: targetApp?.course_name || draft?.coursePreference?.firstPreference,
          applicationDetails: { ...(targetApp || draft), ...updatedFields, id: adminNum, status: 'Confirmed' },
        }).catch((err) => console.warn('Email dispatch notice:', err));
      }

      if (targetApp) {
        // Flow from Admin Dashboard (Enquiring -> Confirm)
        const updatedRecord = {
          ...targetApp,
          ...updatedFields,
        };
        await updateApplication(
          targetApp.id,
          updatedRecord,
          `Seat confirmed and payment verified as Paid via ${selectedMethod} (Amount: ₹${verifiedAmount}) by staff ${activeStaff}`,
          activeStaff
        );
        alert(`Payment verified as Paid via ${selectedMethod}! Application #${adminNum} (${targetApp.studentName}) is confirmed.`);
        navigate('/officer/dashboard', { replace: true });
      } else {
        // Flow from Student Registration
        const application = await submitApplication({
          ...draft,
          id: adminNum,
          formNumber: adminNum,
          ...updatedFields,
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
      <section className="content-panel payment-panel" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,77,56,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
        <div className="section-header">
          <div>
            <p className="eyebrow accent">Admission Payment</p>
            <h2>Seat confirmation payment</h2>
            {fromAdmin && targetApp ? (
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>
                Processing payment for: <strong>{targetApp.studentName}</strong> ({targetApp.coursePreference?.firstPreference || 'Course'})
              </p>
            ) : null}
          </div>
          <img src="/cms-logo.png" alt="CMS College of Engineering logo" className="brand-logo small" />
        </div>

        <div className="payment-meta">
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}><span>Admin / Form No</span><strong>#{adminNum}</strong></div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span>Active Payment Method</span>
            <strong style={{ color: selectedMethod === 'Cash' ? '#166534' : '#0369a1' }}>
              {selectedMethod === 'Cash' ? 'Cash Payment' : 'GPay / UPI Payment'}
            </strong>
          </div>
        </div>

        {/* Method Switcher Header */}
        <div style={{ margin: '20px 0 10px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
            Select Payment Verification Method:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <button
              type="button"
              className={`choice-card ${selectedMethod === 'Cash' ? 'active' : ''}`}
              onClick={() => setSelectedMethod('Cash')}
              style={{
                padding: '14px 18px',
                border: `2px solid ${selectedMethod === 'Cash' ? '#166534' : '#cbd5e1'}`,
                background: selectedMethod === 'Cash' ? '#dcfce7' : '#ffffff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <Banknote size={22} color={selectedMethod === 'Cash' ? '#166534' : '#475569'} />
              <div>
                <span style={{ display: 'block', fontSize: '1rem', color: selectedMethod === 'Cash' ? '#166534' : '#1e293b' }}>
                  A. Cash Payment
                </span>
                <small style={{ fontSize: '0.78rem', color: '#64748b' }}>Office Counter Cash Receipt</small>
              </div>
            </button>

            <button
              type="button"
              className={`choice-card ${selectedMethod === 'GPay' ? 'active' : ''}`}
              onClick={() => setSelectedMethod('GPay')}
              style={{
                padding: '14px 18px',
                border: `2px solid ${selectedMethod === 'GPay' ? '#0369a1' : '#cbd5e1'}`,
                background: selectedMethod === 'GPay' ? '#e0f2fe' : '#ffffff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <QrCode size={22} color={selectedMethod === 'GPay' ? '#0369a1' : '#475569'} />
              <div>
                <span style={{ display: 'block', fontSize: '1rem', color: selectedMethod === 'GPay' ? '#0369a1' : '#1e293b' }}>
                  B. GPay / UPI Payment
                </span>
                <small style={{ fontSize: '0.78rem', color: '#64748b' }}>Google Pay / PhonePe / Paytm QR</small>
              </div>
            </button>
          </div>
        </div>

        {/* TWO SEPARATE PAYMENT VERIFICATION BOXES */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginTop: '16px',
        }}>
          {/* =========================================================================
              BOX A: CASH PAYMENT VERIFICATION
             ========================================================================= */}
          <section
            className="payment-verification-box"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: `2px solid ${selectedMethod === 'Cash' ? '#166534' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: selectedMethod === 'Cash' ? '0 6px 20px rgba(22, 101, 52, 0.14)' : 'none',
              opacity: selectedMethod === 'Cash' ? 1 : 0.82,
              transition: 'all 0.2s ease',
            }}
            onClick={() => setSelectedMethod('Cash')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Banknote size={20} color="#166534" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#166534', fontWeight: 800 }}>
                  A. Cash Payment
                </h3>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '999px',
                background: selectedMethod === 'Cash' ? '#dcfce7' : '#f1f5f9',
                color: selectedMethod === 'Cash' ? '#166534' : '#64748b',
                border: `1px solid ${selectedMethod === 'Cash' ? '#86efac' : '#cbd5e1'}`,
              }}>
                {selectedMethod === 'Cash' ? 'Active Selection' : 'Click to select'}
              </span>
            </div>

            {/* 1. Cash Amount Input Field */}
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label htmlFor="cashAmount" style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Cash Payment Amount (₹) <span className="required-indicator">*</span>
              </label>
              <input
                id="cashAmount"
                type="number"
                min="1"
                step="100"
                required
                value={cashAmount}
                onChange={(e) => {
                  setCashAmount(e.target.value);
                  if (paymentError) setPaymentError('');
                }}
                placeholder="Enter cash amount (e.g. 5000)"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 700 }}
              />
              <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                Authorized staff can enter or modify the cash payment amount.
              </small>
            </div>

            {/* 2. Paid / Unpaid Checklist */}
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Cash Status Checklist <span className="required-indicator">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className={`choice-card ${cashStatus === 'Paid' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMethod('Cash');
                    setCashStatus('Paid');
                    if (paymentError) setPaymentError('');
                  }}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 800,
                    borderRadius: '8px',
                    background: cashStatus === 'Paid' ? '#166534' : '#ffffff',
                    color: cashStatus === 'Paid' ? '#ffffff' : '#1e293b',
                    border: `1.5px solid ${cashStatus === 'Paid' ? '#166534' : '#cbd5e1'}`,
                  }}
                >
                  ✓ Paid
                </button>
                <button
                  type="button"
                  className={`choice-card ${cashStatus === 'Unpaid' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMethod('Cash');
                    setCashStatus('Unpaid');
                  }}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 800,
                    borderRadius: '8px',
                    background: cashStatus === 'Unpaid' ? '#fef2f2' : '#ffffff',
                    color: cashStatus === 'Unpaid' ? '#991b1b' : '#1e293b',
                    border: `1.5px solid ${cashStatus === 'Unpaid' ? '#ef4444' : '#cbd5e1'}`,
                  }}
                >
                  ✗ Unpaid
                </button>
              </div>
            </div>

            {/* 3. Staff Verification */}
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label htmlFor="cashStaffName" style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Staff Verification <span className="required-indicator">*</span>
              </label>
              <input
                id="cashStaffName"
                type="text"
                required
                value={cashStaffName}
                onChange={(e) => {
                  setCashStaffName(e.target.value);
                  if (paymentError) setPaymentError('');
                }}
                placeholder="Type authorized staff name"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
              <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                Required staff signature / name verifying physical cash collection.
              </small>
            </div>
          </section>

          {/* =========================================================================
              BOX B: GPAY / UPI PAYMENT VERIFICATION
             ========================================================================= */}
          <section
            className="payment-verification-box"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: `2px solid ${selectedMethod === 'GPay' ? '#0369a1' : '#e2e8f0'}`,
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: selectedMethod === 'GPay' ? '0 6px 20px rgba(3, 105, 161, 0.14)' : 'none',
              opacity: selectedMethod === 'GPay' ? 1 : 0.82,
              transition: 'all 0.2s ease',
            }}
            onClick={() => setSelectedMethod('GPay')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} color="#0369a1" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0369a1', fontWeight: 800 }}>
                  B. GPay / UPI Payment
                </h3>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '999px',
                background: selectedMethod === 'GPay' ? '#e0f2fe' : '#f1f5f9',
                color: selectedMethod === 'GPay' ? '#0369a1' : '#64748b',
                border: `1px solid ${selectedMethod === 'GPay' ? '#7dd3fc' : '#cbd5e1'}`,
              }}>
                {selectedMethod === 'GPay' ? 'Active Selection' : 'Click to select'}
              </span>
            </div>

            {/* QR Code and UPI details */}
            <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              {paymentQr?.dataUrl ? (
                <img className="payment-qr-image" src={paymentQr.dataUrl} alt="College payment QR code" style={{ maxWidth: '140px', margin: '0 auto 6px', display: 'block' }} />
              ) : (
                <QRCodeSVG
                  className="payment-qr-image"
                  size={140}
                  value={DEMO_PAYMENT_QR_VALUE}
                  level="H"
                  marginSize={3}
                  bgColor="#fff"
                  fgColor="#004D38"
                  aria-label="Demo GPay QR Code"
                  style={{ margin: '0 auto 6px', display: 'block' }}
                />
              )}
              <p style={{ margin: '4px 0 2px', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                UPI ID: <code>{paymentSettings.upiId || 'cmsadmission@okaxis'}</code>
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Scan with GPay, PhonePe, or Paytm</p>
            </div>

            {/* 1. GPay Amount Input Field */}
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label htmlFor="gpayAmount" style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                GPay Payment Amount (₹) <span className="required-indicator">*</span>
              </label>
              <input
                id="gpayAmount"
                type="number"
                min="1"
                step="100"
                required
                value={gpayAmount}
                onChange={(e) => {
                  setGpayAmount(e.target.value);
                  if (paymentError) setPaymentError('');
                }}
                placeholder="Enter GPay amount (e.g. 5000)"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 700 }}
              />
              <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                Authorized staff can enter or modify the verified UPI/GPay amount.
              </small>
            </div>

            {/* 2. Paid / Unpaid Checklist */}
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                GPay Status Checklist <span className="required-indicator">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className={`choice-card ${gpayStatus === 'Paid' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMethod('GPay');
                    setGpayStatus('Paid');
                    if (paymentError) setPaymentError('');
                  }}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 800,
                    borderRadius: '8px',
                    background: gpayStatus === 'Paid' ? '#0369a1' : '#ffffff',
                    color: gpayStatus === 'Paid' ? '#ffffff' : '#1e293b',
                    border: `1.5px solid ${gpayStatus === 'Paid' ? '#0369a1' : '#cbd5e1'}`,
                  }}
                >
                  ✓ Paid
                </button>
                <button
                  type="button"
                  className={`choice-card ${gpayStatus === 'Unpaid' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMethod('GPay');
                    setGpayStatus('Unpaid');
                  }}
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    fontWeight: 800,
                    borderRadius: '8px',
                    background: gpayStatus === 'Unpaid' ? '#fef2f2' : '#ffffff',
                    color: gpayStatus === 'Unpaid' ? '#991b1b' : '#1e293b',
                    border: `1.5px solid ${gpayStatus === 'Unpaid' ? '#ef4444' : '#cbd5e1'}`,
                  }}
                >
                  ✗ Unpaid
                </button>
              </div>
            </div>

            {/* 3. Staff Verification */}
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label htmlFor="gpayStaffName" style={{ fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                Staff Verification <span className="required-indicator">*</span>
              </label>
              <input
                id="gpayStaffName"
                type="text"
                required
                value={gpayStaffName}
                onChange={(e) => {
                  setGpayStaffName(e.target.value);
                  if (paymentError) setPaymentError('');
                }}
                placeholder="Type authorized staff name"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
              <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                Required staff signature / name verifying digital UPI transaction.
              </small>
            </div>
          </section>
        </div>

        {paymentError ? (
          <div style={{ background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: '10px', padding: '12px 16px', color: '#b91c1c', fontSize: '0.88rem', fontWeight: 700, marginTop: '20px' }}>
            {paymentError}
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="form-actions" style={{ marginTop: '24px' }}>
          <button type="button" className="secondary-btn" onClick={handlePrevious}>
            <ArrowLeft size={16} /> Previous
          </button>
          <button type="button" className="primary-btn" onClick={handleConfirm} disabled={isSubmitting}>
            <Check size={16} /> {isSubmitting ? 'Confirming...' : `Confirm Seat (${selectedMethod} Payment)`}
          </button>
        </div>
      </section>
    </main>
  );
}
