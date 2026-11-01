from datetime import datetime
from typing import Any


def _display(val: Any) -> str:
    if val is None or str(val).strip() in ["", "None", "null"]:
        return "—"
    return str(val).strip()


def _format_aadhaar(val: Any) -> str:
    if not val:
        return "—"
    digits = "".join(c for c in str(val) if c.isdigit())[:12]
    if len(digits) == 12:
        return f"{digits[0:4]} {digits[4:8]} {digits[8:12]}"
    return digits or "—"


def _format_date(val: Any) -> str:
    if not val:
        return datetime.now().strftime("%d/%m/%Y")
    s = str(val).strip()
    try:
        if "T" in s:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt.strftime("%d/%m/%Y")
        dt = datetime.strptime(s[:10], "%Y-%m-%d")
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return s[:10] if len(s) >= 10 else s


COURSES_LIST = [
    ("aids", "ARTIFICIAL INTELLIGENCE & DATA SCIENCE"),
    ("cse", "COMPUTER SCIENCE & ENGG"),
    ("ece", "ELECTRONICS AND COMMUNICATION ENGG"),
    ("mech", "MECHANICAL ENGG"),
    ("biomed", "BIO - MEDICAL ENGG"),
    ("cyber", "CSE- CYBER SECURITY"),
    ("eee", "ELECTRICAL AND ELECTRONICS ENGG"),
    ("aiml", "ARTIFICIAL INTELLIGENCE & MACHINE LEARNING"),
]


def _is_course_chosen(course_id: str, label: str, chosen: str) -> bool:
    if not chosen:
        return False
    c = chosen.lower().strip()
    l = label.lower()
    if c == l:
        return True
    if course_id == "cyber" and "cyber" in c:
        return True
    if course_id == "aiml" and ("machine" in c or "aiml" in c):
        return True
    if course_id == "aids" and ("data" in c or "aids" in c):
        return True
    if course_id == "cse" and "computer" in c and "cyber" not in c:
        return True
    if course_id == "ece" and "communication" in c:
        return True
    if course_id == "eee" and "electrical" in c:
        return True
    if course_id == "biomed" and "bio" in c:
        return True
    if course_id == "mech" and "mech" in c:
        return True
    return False


FEE_STRUCTURE_ROWS = [
    ("ADMISSION FEES (one time)", "5000"),
    ("CONSORTIUM FEES (one time)", "550"),
    ("RRA AMOUNT – ONE TIME (ANNA UNIVERSITY)", "2500"),
    ("SPORTS FEES– ONE TIME (ANNA UNIVERSITY) (Four Years)", "625"),
    ("GROUP INSURANCE – ONE TIME", "100"),
    ("SYLLABUS FEES ONE TIME (ANNA UNIVERSITY)", "200"),
    ("NSS FEES (ANNAUNIVERSITY)", "25"),
    ("LAB COAT", "500"),
    ("ID CARD", "100"),
    ("BOOK FEES & EXAM PAPER FEES (IN EVERY SEMESTER)", "—"),
    ("TUITION FEES – FIRST GRADUATE (OC/BC/BC(M)/MBC & DNC)", "Category based"),
    ("TUITION FEES – NON-FIRST GRADUATE (OC/BC/BC(M)/MBC& DNC)", "Category based"),
    ("TUITION FEES – SC/SC(A)/ST/SCC", "Category based"),
    ("HOSTEL FEES – (OC/BC/BC(M)/MBC& DNC)", "Category based"),
    ("HOSTEL FEES – SC/SC(A)/ST/SCC", "Category based"),
    ("HOSTEL / TRANSPORT APPLICATION FORM", "50"),
    ("TRANSPORT FEES (PER YEAR)", "—"),
]


def render_full_admission_email_html(
    application_id: str,
    status: str,
    student_name: str,
    course_name: str,
    details: dict[str, Any] | None,
    form_link: str = "",
    college_email: str = "",
) -> str:
    """Renders the complete, authentic admission preview form inside the email body."""
    details = details or {}
    norm_status = (status or "Enquiring").strip()
    is_confirmed = norm_status.lower() in ["confirm", "confirmed"]

    student_display = student_name or details.get("studentName") or "Student"
    course_display = course_name or "Selected Programme"

    # Status notice banner configuration
    if is_confirmed:
        notice_bg = "#f0fdf4"
        notice_border = "#006747"
        status_badge_bg = "#dcfce7"
        status_badge_color = "#15803d"
        status_label = "Confirmed"
        headline = "Admission Confirmed"
        message_intro = "Congratulations! Your admission at CMS College of Engineering has been officially <strong>CONFIRMED</strong>. Below is your official filled admission application form for your records."
    else:
        notice_bg = "#fffbeb"
        notice_border = "#d97706"
        status_badge_bg = "#fef3c7"
        status_badge_color = "#92400e"
        status_label = "Enquiring"
        headline = "Application Enquiry Received"
        message_intro = "Thank you for your interest in CMS College of Engineering. Your admission enquiry has been successfully registered. Below is the complete copy of your admission application preview."

    # Admission Category check
    adm_cat = str(details.get("admissionCategory") or details.get("category") or "").upper()
    is_gq = "GQ" in adm_cat or "COUNSELL" in adm_cat or "GOVERNMENT" in adm_cat
    is_mq = "MQ" in adm_cat or "MANAGEMENT" in adm_cat

    # First Graduate check
    fg = str(details.get("firstGraduate") or "").lower()
    is_fg_yes = fg in ["yes", "true", "1"]
    is_fg_no = fg in ["no", "false", "0"] or (not is_fg_yes and fg != "")

    # Gender check
    gender = str(details.get("gender") or "").upper()
    is_male = "MALE" in gender and "FE" not in gender
    is_female = "FEMALE" in gender

    # Accommodation
    accom = str(details.get("accommodation") or "")
    is_hostel = "hostel" in accom.lower()
    is_day_scholar = "day" in accom.lower() or not is_hostel

    # Route / pickup
    route = details.get("pickupPoint") or details.get("busRoute") or ("Hosteller" if is_hostel else "Day Scholar")

    # Dates
    app_date = _format_date(details.get("applicationDate") or details.get("submittedAt"))
    dob = _format_date(details.get("dateOfBirth"))

    # Parents mobile
    father_mob = details.get("fatherMobile") or details.get("parentMobile")
    mother_mob = details.get("motherMobile")

    # Cutoff
    cutoff = details.get("cutOffMarks")
    cutoff_display = f"{float(cutoff):.2f}" if cutoff not in [None, "", "—"] else "—"

    # Signatures
    student_sig = details.get("studentSignature") or details.get("signature")
    if isinstance(student_sig, dict):
        student_sig_data = student_sig.get("dataUrl")
    elif isinstance(student_sig, str) and student_sig.startswith("data:"):
        student_sig_data = student_sig
    else:
        student_sig_data = None

    parent_sig = details.get("parentSignature")
    if isinstance(parent_sig, dict):
        parent_sig_data = parent_sig.get("dataUrl")
    elif isinstance(parent_sig, str) and parent_sig.startswith("data:"):
        parent_sig_data = parent_sig
    else:
        parent_sig_data = None

    # Documents submitted check
    docs = details.get("documents") or {}
    has_sslc = "✓" if docs.get("SSLC") else "—"
    has_hsc = "✓" if docs.get("HSC") else "—"
    has_tc = "✓" if docs.get("TC") else "—"
    has_cc = "✓" if (docs.get("CommunityCertificate") or docs.get("CC")) else "—"
    has_nativity = "✓" if docs.get("NativityCertificate") else "—"
    has_income = "✓" if docs.get("IncomeCertificate") else "—"
    has_aadhaar = "✓" if docs.get("AadhaarCard") else "—"
    has_fg = "✓" if (docs.get("FirstGraduateCertificate") or docs.get("FG")) else "—"
    photo_count = "4" if docs.get("PassportSizePhotographs") else "—"

    # Selected course resolution
    pref = details.get("coursePreference")
    if isinstance(pref, dict):
        selected_course = pref.get("firstPreference") or course_display
    else:
        selected_course = str(pref or course_display)

    # Consultant fields
    consultant_name = _display(details.get("consultantName"))
    org_name = _display(details.get("organizationName"))
    form_no = details.get("formNumber") or "1888"

    # Build courses HTML grid
    courses_html = ""
    for cid, clabel in COURSES_LIST:
        is_chosen = _is_course_chosen(cid, clabel, selected_course)
        bg = "#e6f4ea" if is_chosen else "#ffffff"
        border = "#006747" if is_chosen else "#cbd5e1"
        font_weight = "bold" if is_chosen else "normal"
        check_symbol = "[✓]" if is_chosen else "[ &nbsp; ]"
        courses_html += f"""
        <td style="width: 50%; padding: 6px 10px; border: 1px solid #cbd5e1; background: {bg}; font-size: 11px; font-weight: {font_weight};">
          <span style="color: {'#006747' if is_chosen else '#64748b'}; font-weight: bold; margin-right: 6px;">{check_symbol}</span>
          <span style="color: {'#006747' if is_chosen else '#1e293b'};">{clabel}</span>
        </td>
        """
        # Pair into 2 columns per row
        if cid in ["mech", "aiml"]:
            pass  # rows handled below

    # Pair courses in 4 rows of 2 columns
    left_c = COURSES_LIST[:4]
    right_c = COURSES_LIST[4:]
    courses_table_rows = ""
    for i in range(4):
        lc_id, lc_label = left_c[i]
        rc_id, rc_label = right_c[i]

        lc_chosen = _is_course_chosen(lc_id, lc_label, selected_course)
        rc_chosen = _is_course_chosen(rc_id, rc_label, selected_course)

        lc_bg = "#e6f4ea" if lc_chosen else "#ffffff"
        rc_bg = "#e6f4ea" if rc_chosen else "#ffffff"
        lc_color = "#006747" if lc_chosen else "#1e293b"
        rc_color = "#006747" if rc_chosen else "#1e293b"

        courses_table_rows += f"""
        <tr>
          <td style="width: 50%; padding: 6px 10px; border: 1px solid #cbd5e1; background: {lc_bg}; font-size: 11px; font-weight: {'bold' if lc_chosen else 'normal'}; color: {lc_color};">
            <span style="font-weight: bold; margin-right: 6px;">{'[✓]' if lc_chosen else '[ &nbsp; ]'}</span>
            {lc_label}
          </td>
          <td style="width: 50%; padding: 6px 10px; border: 1px solid #cbd5e1; background: {rc_bg}; font-size: 11px; font-weight: {'bold' if rc_chosen else 'normal'}; color: {rc_color};">
            <span style="font-weight: bold; margin-right: 6px;">{'[✓]' if rc_chosen else '[ &nbsp; ]'}</span>
            {rc_label}
          </td>
        </tr>
        """

    # Build fees rows
    fees_rows_html = ""
    for item, amt in FEE_STRUCTURE_ROWS:
        fees_rows_html += f"""
        <tr>
          <td style="padding: 4px 10px; border: 1px solid #e2e8f0; font-size: 11px; color: #334155;">{item}</td>
          <td style="padding: 4px 10px; border: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; text-align: right; color: #0f172a;">{amt}</td>
        </tr>
        """

    # Student signature display
    if student_sig_data:
        student_sig_block = f"""<img src="{student_sig_data}" alt="Student Signature" style="max-height: 48px; max-width: 180px; display: block; margin: 0 auto 4px;" />"""
    else:
        student_sig_block = """<div style="height: 38px; line-height: 38px; color: #006747; font-size: 12px; font-weight: 600; font-style: italic;">✓ Digitally Signed by Student</div>"""

    # Parent signature display
    if parent_sig_data:
        parent_sig_block = f"""<img src="{parent_sig_data}" alt="Parent Signature" style="max-height: 48px; max-width: 180px; display: block; margin: 0 auto 4px;" />"""
    else:
        parent_sig_block = """<div style="height: 38px; line-height: 38px; color: #006747; font-size: 12px; font-weight: 600; font-style: italic;">✓ Digitally Signed by Parent</div>"""

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMS College of Engineering - Admission Application Form</title>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 780px; margin: 0 auto;">

    <!-- 1. NOTIFICATION BANNER -->
    <div style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06); margin-bottom: 24px;">
      <div style="background-color: #006747; color: #ffffff; padding: 20px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">CMS COLLEGE OF ENGINEERING</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">Admissions Office — {headline}</p>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 15px; margin: 0 0 14px; line-height: 1.5;">Dear <strong>{student_display}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px; color: #334155;">{message_intro}</p>

        <div style="background-color: {notice_bg}; border: 1px solid {notice_border}; border-left: 5px solid {notice_border}; padding: 14px 18px; border-radius: 6px; margin: 16px 0 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; width: 140px; color: #475569;"><strong>Application ID:</strong></td>
              <td style="padding: 4px 0;"><span style="font-size: 16px; font-weight: bold; color: #006747; letter-spacing: 0.5px;">{application_id}</span></td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475569;"><strong>Status:</strong></td>
              <td style="padding: 4px 0;"><span style="display: inline-block; background-color: {status_badge_bg}; color: {status_badge_color}; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 12px;">{status_label}</span></td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475569;"><strong>Programme:</strong></td>
              <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">{course_display}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <!-- 2. COMPLETE ADMISSION FORM PREVIEW (PRINT / PAPER FORMAT) -->
    <div style="background-color: #ffffff; border: 2px solid #006747; border-radius: 6px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); margin-bottom: 24px;">

      <!-- College Header -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #006747; padding-bottom: 12px;">
        <tr>
          <td style="width: 80px; vertical-align: top; text-align: center;">
            <img src="https://cms-admin-system-nvoj.onrender.com/cms-logo.png" alt="CMS Logo" style="width: 70px; height: auto;" />
          </td>
          <td style="vertical-align: middle; padding-left: 14px;">
            <h2 style="margin: 0; color: #006747; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">CMS COLLEGE OF ENGINEERING</h2>
            <p style="margin: 2px 0 0; font-size: 11px; font-style: italic; color: #334155; font-weight: 600;">Nurturing Minds Through Innovative Education</p>
            <p style="margin: 2px 0 0; font-size: 10px; font-weight: bold; color: #006747;">(AUTONOMOUS STATUS AWARDED BY UGC, New Delhi)</p>
            <p style="margin: 2px 0 0; font-size: 10px; color: #475569;">CMS Nagar, Ernapuram post, Near Collectorate, Namakkal - 637 003</p>
            <p style="margin: 2px 0 0; font-size: 9.5px; color: #64748b;">(Approved by the AICTE New Delhi and affiliated to Anna University)</p>
          </td>
          <td style="width: 120px; vertical-align: top; text-align: right;">
            <div style="border: 1px solid #006747; padding: 4px; font-size: 9px; font-weight: bold; color: #006747; text-align: center; border-radius: 4px;">
              20 YEARS OF<br/>EDUCATIONAL<br/>EXCELLENCE
            </div>
          </td>
        </tr>
      </table>

      <!-- Consultant & Organization Strip -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-size: 11px;">
        <tr>
          <td style="padding: 6px 12px; width: 50%;"><strong>Consultant Name:</strong> {_display(consultant_name)}</td>
          <td style="padding: 6px 12px; width: 50%;"><strong>Organization Name:</strong> {_display(org_name)}</td>
        </tr>
      </table>

      <!-- Form Title Bar -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; background: #e6f4ea; border: 1px solid #006747;">
        <tr>
          <td style="padding: 8px 12px; width: 30%; color: #006747; font-weight: bold;">Form No: # {form_no}</td>
          <td style="padding: 8px 12px; width: 40%; text-align: center; color: #006747; font-size: 14px; font-weight: 800; letter-spacing: 1px;">ADMISSION FORM</td>
          <td style="padding: 8px 12px; width: 30%; text-align: right; color: #006747; font-weight: bold;">Date: {app_date}</td>
        </tr>
      </table>

      <!-- Personal & Academic Details Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 14px; border: 1px solid #cbd5e1;">
        <tr style="background: #ffffff;">
          <th style="width: 32%; padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">CATEGORY OF ADMISSION</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">
            <span style="font-weight: {'bold' if is_gq else 'normal'}; color: {'#006747' if is_gq else '#475569'};">{'[✓]' if is_gq else '[ ]'} GQ (Counselling)</span>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <span style="font-weight: {'bold' if is_mq else 'normal'}; color: {'#006747' if is_mq else '#475569'};">{'[✓]' if is_mq else '[ ]'} MQ (Management)</span>
          </td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">FIRST GRADUATE</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">
            <span style="font-weight: {'bold' if is_fg_yes else 'normal'}; color: {'#006747' if is_fg_yes else '#475569'};">{'[✓]' if is_fg_yes else '[ ]'} YES</span>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <span style="font-weight: {'bold' if is_fg_no else 'normal'}; color: {'#006747' if is_fg_no else '#475569'};">{'[✓]' if is_fg_no else '[ ]'} NO</span>
          </td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">NAME OF THE STUDENT</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 12.5px; color: #0f172a;">{student_display.upper()}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">FATHER'S NAME &amp; OCCUPATION</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">{_display(details.get('fatherName'))} {f"&amp; {details.get('fatherOccupation')}" if details.get('fatherOccupation') else ''}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">MOTHER'S NAME &amp; OCCUPATION</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">{_display(details.get('motherName'))} {f"&amp; {details.get('motherOccupation')}" if details.get('motherOccupation') else ''}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">DATE OF BIRTH</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">{dob}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">GENDER</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">
            <span style="font-weight: {'bold' if is_male else 'normal'}; color: {'#006747' if is_male else '#475569'};">{'[✓]' if is_male else '[ ]'} MALE</span>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <span style="font-weight: {'bold' if is_female else 'normal'}; color: {'#006747' if is_female else '#475569'};">{'[✓]' if is_female else '[ ]'} FEMALE</span>
          </td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">AADHAAR NUMBER</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; letter-spacing: 1px; font-weight: 600;">{_format_aadhaar(details.get('aadhaar'))}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">STUDENT'S MOBILE NO</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">{f"+91 {details.get('studentMobile')}" if details.get('studentMobile') else '—'}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">FATHER'S &amp; MOTHER'S MOBILE</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">
            Father: <strong>{f"+91 {father_mob}" if father_mob else '—'}</strong> &nbsp;|&nbsp; Mother: <strong>{f"+91 {mother_mob}" if mother_mob else '—'}</strong>
          </td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">COMMUNITY</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>{_display(details.get('community'))}</strong> {f"({details.get('category')})" if details.get('category') else ''}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">BLOOD GROUP</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>{_display(details.get('bloodGroup'))}</strong></td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">HOSTEL ACCOMMODATION</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">
            <span style="font-weight: {'bold' if is_hostel else 'normal'}; color: {'#006747' if is_hostel else '#475569'};">{'[✓]' if is_hostel else '[ ]'} YES</span>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <span style="font-weight: {'bold' if is_day_scholar else 'normal'}; color: {'#006747' if is_day_scholar else '#475569'};">{'[✓]' if is_day_scholar else '[ ]'} NO</span>
          </td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">BOARDING PLACE – ROUTE</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">{route}</td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">ADDRESS FOR COMMUNICATION</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">
            {", ".join(filter(None, [str(details.get('communicationAddress') or ''), str(details.get('district') or ''), str(details.get('state') or ''), f"PIN: {details.get('pinCode')}" if details.get('pinCode') else ''])) or '—'}
          </td>
        </tr>
        <tr>
          <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc; color: #334155;">NAME OF THE SCHOOL &amp; ADDRESS</th>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">
            {", ".join(filter(None, [str(details.get('schoolName') or ''), str(details.get('schoolAddress') or '')])) or '—'}
            {f"<br/><span style='font-size: 10px; color: #475569;'>Group: {details.get('hscGroup')}</span>" if details.get('hscGroup') else ''}
          </td>
        </tr>
      </table>

      <!-- Marks Obtained Table -->
      <div style="background-color: #006747; color: #ffffff; padding: 6px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
        DETAILS OF MARKS OBTAINED
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; margin-bottom: 14px; border: 1px solid #cbd5e1;">
        <tr style="background: #f8fafc; font-weight: 700; color: #334155;">
          <th style="padding: 6px; border: 1px solid #cbd5e1; width: 20%;">MATHS</th>
          <th style="padding: 6px; border: 1px solid #cbd5e1; width: 25%;">PHYSICS</th>
          <th style="padding: 6px; border: 1px solid #cbd5e1; width: 25%;">CHEMISTRY</th>
          <th style="padding: 6px; border: 1px solid #cbd5e1; width: 15%; color: #006747;">CUT-OFF</th>
          <th style="padding: 6px; border: 1px solid #cbd5e1; width: 15%;">TOTAL</th>
        </tr>
        <tr style="font-weight: 700; font-size: 12px;">
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">{_display(details.get('mathematics'))}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">{_display(details.get('physicsMarks'))}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">{_display(details.get('chemistryMarks'))}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1; color: #006747; font-size: 13px;">{cutoff_display}</td>
          <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">{_display(details.get('hscMarks'))}</td>
        </tr>
      </table>

      <!-- Preferred Courses Table -->
      <div style="background-color: #006747; color: #ffffff; padding: 6px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
        COURSES (B.E / B.TECH) PREFERRED
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #cbd5e1;">
        {courses_table_rows}
      </table>

      <!-- Fees Structure Table -->
      <div style="background-color: #006747; color: #ffffff; padding: 6px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
        FEES STRUCTURE
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #cbd5e1;">
        <tr style="background: #f8fafc; font-weight: 700;">
          <th style="padding: 5px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: left;">Particulars</th>
          <th style="padding: 5px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: right; width: 120px;">Amount (₹)</th>
        </tr>
        {fees_rows_html}
      </table>

      <!-- Digital Signatures Row -->
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0 14px; border: 1px solid #e2e8f0; background: #fafafa;">
        <tr>
          <td style="width: 50%; padding: 14px; text-align: center; border-right: 1px solid #e2e8f0; vertical-align: bottom;">
            {student_sig_block}
            <div style="border-top: 1px dashed #64748b; padding-top: 4px; font-size: 11px; font-weight: bold; color: #334155; text-transform: uppercase;">
              SIGNATURE OF THE STUDENT
            </div>
          </td>
          <td style="width: 50%; padding: 14px; text-align: center; vertical-align: bottom;">
            {parent_sig_block}
            <div style="border-top: 1px dashed #64748b; padding-top: 4px; font-size: 11px; font-weight: bold; color: #334155; text-transform: uppercase;">
              SIGNATURE OF THE PARENT
            </div>
          </td>
        </tr>
      </table>

      <!-- Certificates Submitted Table (Office Use) -->
      <div style="text-align: center; font-weight: bold; font-size: 11px; color: #334155; margin: 12px 0 4px; text-transform: uppercase;">
        FOR OFFICE USE ONLY &nbsp;—&nbsp; <u>CERTIFICATES SUBMITTED</u>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: center; margin-bottom: 14px; border: 1px solid #cbd5e1;">
        <tr style="background: #f8fafc; font-weight: 700; color: #334155;">
          <th style="padding: 5px; border: 1px solid #cbd5e1; width: 14%; text-align: left;">TYPE</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">SSLC</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">HSC</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">TC</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">CC</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">NATIVITY</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">INCOME</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">AADHAAR</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">F.G</th>
          <th style="padding: 5px; border: 1px solid #cbd5e1;">PHOTO</th>
        </tr>
        <tr>
          <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc;">ORIGINAL</th>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_sslc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_hsc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_tc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_cc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_nativity}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_income}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_aadhaar}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_fg}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{photo_count}</td>
        </tr>
        <tr>
          <th style="padding: 5px; border: 1px solid #cbd5e1; text-align: left; background: #f8fafc;">XEROX</th>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_sslc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_hsc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_tc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_cc}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_nativity}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_income}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_aadhaar}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: bold; color: #006747;">{has_fg}</td>
          <td style="padding: 5px; border: 1px solid #cbd5e1;">—</td>
        </tr>
      </table>

      <!-- Bottom Reference Box & Authorities -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;">
        <tr>
          <td style="width: 50%; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1;">
            <div style="font-weight: bold; color: #006747; margin-bottom: 2px;">REFERENCE</div>
            <div>Consultant Name: <strong>{consultant_name}</strong></div>
            <div>Organization Name: <strong>{org_name}</strong></div>
          </td>
          <td style="width: 50%; padding: 8px 12px; vertical-align: bottom; text-align: right;">
            <span style="display: inline-block; width: 120px; text-align: center; border-top: 1px solid #475569; padding-top: 4px; font-weight: bold; font-size: 10.5px; color: #334155;">ADMISSION OFFICER</span>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <span style="display: inline-block; width: 120px; text-align: center; border-top: 1px solid #475569; padding-top: 4px; font-weight: bold; font-size: 10.5px; color: #334155;">VICE-CHAIRMAN</span>
          </td>
        </tr>
      </table>

    </div>

    <!-- 3. FOOTER -->
    <div style="text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; padding: 10px 0;">
      <p style="margin: 0;">CMS College of Engineering Admissions Office</p>
      <p style="margin: 2px 0;">Phone: +91 427 244 5566 &nbsp;|&nbsp; Email: {college_email}</p>
      <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">This is an automated official admission system confirmation from CMS College of Engineering.</p>
    </div>

  </div>
</body>
</html>"""
