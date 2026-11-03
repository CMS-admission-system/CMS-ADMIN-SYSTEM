import json
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..email_template import render_full_admission_email_html
from ..realtime import emit_realtime_event
from ..security import create_staff_token, verify_password

# Indian Standard Time (IST) UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30), name="IST")

router = APIRouter(prefix="/portal", tags=["portal"])


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str | None = None


class UpdateAppRequest(BaseModel):
    updates: dict[str, Any]
    comment: str | None = None
    actor: str | None = None
    expected_version: int | None = None


@router.post("/auth/login")
def portal_login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(models.StaffUser).where(models.StaffUser.username == payload.username))
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")

    # Map backend enum role to frontend string if needed
    role_str = user.role.value
    if "officer" in role_str:
        client_role = "officer"
    elif "vice" in role_str:
        client_role = "vc"
    else:
        client_role = "admin"

    token = create_staff_token(user.id, user.role.value)
    return {
        "ok": True,
        "token": token,
        "role": client_role,
        "username": user.username,
        "fullName": user.full_name,
    }


@router.get("/applications")
def list_portal_applications(
    status: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(models.PortalApplication).order_by(models.PortalApplication.submitted_at.desc())
    if status:
        stmt = stmt.where(models.PortalApplication.status == status)

    records = db.scalars(stmt).all()
    results = []
    for r in records:
        try:
            data = json.loads(r.data_json)
        except Exception:
            data = {}
        # Ensure latest state from indexed columns is synced with reliable IST timestamps
        data["id"] = r.id
        data["status"] = r.status
        if r.confirmed_at:
            data["confirmedAt"] = r.confirmed_at.strftime("%Y-%m-%dT%H:%M:%S+05:30")
        if r.forwarded_at:
            data["forwardedAt"] = r.forwarded_at.strftime("%Y-%m-%dT%H:%M:%S+05:30")
        if r.submitted_at:
            data["submittedAt"] = r.submitted_at.strftime("%Y-%m-%dT%H:%M:%S+05:30")
        data["version"] = int(data.get("version") or 1)
        results.append(data)
    return results


import logging

logger = logging.getLogger(__name__)


def generate_yearly_application_id(db: Session, target_year: int | None = None) -> str:
    """Auto-generate a unique Application ID in format YYNNNN (e.g. 260001 for 2026, 270001 for 2027).
    - YY = current admission year (last 2 digits)
    - NNNN = sequential application number starting at 0001 each year
    - Automatically switches prefix when the year changes
    - Atomic row lock with_for_update() in MySQL/PostgreSQL prevents race conditions and collisions
    - Checks portal_applications to guarantee no duplicate IDs or overwrites
    """
    if target_year is None:
        target_year = datetime.now().year

    yy = target_year % 100
    prefix = f"{yy:02d}"

    try:
        models.ApplicationSequence.__table__.create(bind=db.get_bind(), checkfirst=True)
    except Exception:
        pass

    bind = db.get_bind()
    is_sqlite = bind and bind.dialect.name == "sqlite"

    stmt = select(models.ApplicationSequence).where(models.ApplicationSequence.year == target_year)
    if not is_sqlite:
        stmt = stmt.with_for_update()

    seq_record = db.scalar(stmt)

    if not seq_record:
        existing_ids = db.scalars(
            select(models.PortalApplication.id).where(models.PortalApplication.id.like(f"{prefix}%"))
        ).all()
        max_num = 0
        for aid in existing_ids:
            if len(aid) == 6 and aid.startswith(prefix) and aid[2:].isdigit():
                try:
                    val = int(aid[2:])
                    if val > max_num:
                        max_num = val
                except ValueError:
                    pass

        try:
            seq_record = models.ApplicationSequence(year=target_year, last_number=max_num)
            db.add(seq_record)
            db.flush()
        except Exception:
            db.rollback()
            stmt = select(models.ApplicationSequence).where(models.ApplicationSequence.year == target_year)
            if not is_sqlite:
                stmt = stmt.with_for_update()
            seq_record = db.scalar(stmt)

    while True:
        seq_record.last_number += 1
        candidate_id = f"{prefix}{seq_record.last_number:04d}"
        if not db.get(models.PortalApplication, candidate_id):
            db.flush()
            return candidate_id


def dispatch_status_email(
    to_email: str,
    student_name: str,
    application_id: str,
    status: str,
    course: str | None = None,
    application_details: dict[str, Any] | None = None,
    enquiring_email: str | None = None,
) -> tuple[bool, str]:
    """Sends status notification email (Enquiring or Confirmed) via SMTP.
    - Enquiring: Includes status, application ID, next steps, and link to complete the full admission form.
    - Confirm: Includes confirmation status, application ID, and next steps.
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from ..config import Settings, settings

    # Read latest settings to dynamically capture updated credentials from .env
    active_settings = Settings()

    if not to_email:
        return False, "Recipient email is required"

    if not active_settings.SMTP_HOST:
        logger.warning(
            f"SMTP email service is not configured (SMTP_HOST is empty). Skipping email to {to_email} for status '{status}'."
        )
        return False, "SMTP_NOT_CONFIGURED"

    norm_status = (status or "Enquiring").strip()
    is_confirmed = norm_status.lower() in ["confirm", "confirmed"]
    student_display = student_name or "Student"
    course_display = course or "Selected Programme"
    frontend_url = active_settings.FRONTEND_BASE_URL.rstrip("/")
    form_link = f"{frontend_url}/register"

    if is_confirmed:
        subject = f"CMS College of Engineering - Admission Confirmed: {application_id}"
    else:
        subject = f"CMS College of Engineering - Admission Application Enquiring: {application_id}"

    body_html = render_full_admission_email_html(
        application_id=application_id,
        status=norm_status,
        student_name=student_display,
        course_name=course_display,
        details=application_details,
        form_link=form_link,
        college_email=enquiring_email or active_settings.SMTP_FROM,
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = active_settings.SMTP_FROM
    msg["To"] = to_email
    if not is_confirmed and enquiring_email:
        msg["Cc"] = enquiring_email

    msg.attach(MIMEText(body_html, "html"))

    try:
        if active_settings.SMTP_TLS:
            with smtplib.SMTP(active_settings.SMTP_HOST, active_settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                if active_settings.SMTP_USER and active_settings.SMTP_PASSWORD:
                    server.login(active_settings.SMTP_USER, active_settings.SMTP_PASSWORD)
                recipients = [to_email]
                if not is_confirmed and enquiring_email:
                    recipients.append(enquiring_email)
                server.sendmail(active_settings.SMTP_FROM, recipients, msg.as_string())
        else:
            with smtplib.SMTP(active_settings.SMTP_HOST, active_settings.SMTP_PORT, timeout=10) as server:
                if active_settings.SMTP_USER and active_settings.SMTP_PASSWORD:
                    server.login(active_settings.SMTP_USER, active_settings.SMTP_PASSWORD)
                recipients = [to_email]
                if not is_confirmed and enquiring_email:
                    recipients.append(enquiring_email)
                server.sendmail(active_settings.SMTP_FROM, recipients, msg.as_string())
        return True, f"Email delivered to {to_email}"
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
        return False, str(e)


@router.post("/applications")
def create_portal_application(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    app_id = payload.get("id")
    existing = db.get(models.PortalApplication, str(app_id)) if app_id else None

    # Check if app_id is in official YYNNNN format (6-digit numeric)
    is_valid_yearly_id = bool(app_id and len(str(app_id)) == 6 and str(app_id).isdigit())

    # Generate new atomic YYNNNN ID if:
    # 1. New application without existing record in DB, AND
    # 2. app_id is missing, starts with 'CMS-', or not in valid YYNNNN format
    if not existing and (not app_id or str(app_id).startswith("CMS-") or not is_valid_yearly_id):
        app_id = generate_yearly_application_id(db)
        payload["id"] = app_id
    elif not app_id:
        app_id = generate_yearly_application_id(db)
        payload["id"] = app_id
    else:
        app_id = str(app_id)
        payload["id"] = app_id

    # Authoritative current local time in Indian Standard Time (IST)
    now_ist = datetime.now(IST)
    ist_naive = now_ist.replace(tzinfo=None)
    ist_iso = now_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30")

    if not payload.get("status"):
        payload["status"] = "Enquiring"
    if not payload.get("submittedAt"):
        payload["submittedAt"] = ist_iso
    if not payload.get("updatedAt"):
        payload["updatedAt"] = ist_iso
    if not payload.get("version"):
        payload["version"] = 1

    student_name = payload.get("studentName")
    emis_id = payload.get("emisId")
    category = payload.get("admissionCategory") or payload.get("category")
    course_pref = payload.get("coursePreference")
    course_name = course_pref.get("firstPreference") if isinstance(course_pref, dict) else str(course_pref or "")

    if existing:
        existing.student_name = student_name
        existing.emis_id = emis_id
        existing.admission_category = category
        existing.course_name = course_name
        existing.status = payload.get("status", "Enquiring")
        existing.updated_at = ist_naive
        if not existing.submitted_at:
            existing.submitted_at = ist_naive
        existing.data_json = json.dumps(payload)
        record = existing
    else:
        record = models.PortalApplication(
            id=app_id,
            student_name=student_name,
            emis_id=emis_id,
            admission_category=category,
            course_name=course_name,
            status=payload.get("status", "Enquiring"),
            submitted_at=ist_naive,
            updated_at=ist_naive,
            data_json=json.dumps(payload),
        )
        db.add(record)

    # 1. Database update is committed successfully first
    db.commit()
    db.refresh(record)

    # 2. Automatically email registered email on status Enquiring / Confirmed, preventing duplicates
    current_status = record.status or "Enquiring"
    last_emailed = payload.get("last_emailed_status")
    student_email = payload.get("email") or payload.get("studentEmail") or payload.get("parentEmail")

    if student_email and last_emailed != current_status and current_status in ["Enquiring", "Confirmed", "Confirm"]:
        payload["last_emailed_status"] = current_status
        record.data_json = json.dumps(payload)
        record.updated_at = ist_naive
        db.commit()
        background_tasks.add_task(
            dispatch_status_email,
            to_email=student_email,
            student_name=student_name or "Student",
            application_id=app_id,
            status=current_status,
            course=course_name,
            application_details=payload,
        )

    # 3. Broadcast real-time creation event to all connected staff & dashboards
    emit_realtime_event("application_created", payload)

    return payload


@router.put("/applications/{app_id}")
def update_portal_application(
    app_id: str,
    payload: UpdateAppRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    record = db.get(models.PortalApplication, app_id)
    if not record:
        raise HTTPException(404, "Application not found")

    try:
        data = json.loads(record.data_json)
    except Exception:
        data = {}

    current_version = int(data.get("version") or 1)
    if payload.expected_version is not None and payload.expected_version < current_version:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "conflict",
                "message": f"Application {app_id} was modified by another user. Current server version: {current_version}, your version: {payload.expected_version}.",
                "server_version": current_version,
            },
        )
    data["version"] = current_version + 1

    old_status = record.status
    updates = payload.updates
    for k, v in updates.items():
        data[k] = v

    # Also keep indexed SQL columns synchronized if corresponding fields were updated
    if "studentName" in updates:
        record.student_name = updates["studentName"]
    if "emisId" in updates:
        record.emis_id = updates["emisId"]
    if "admissionCategory" in updates or "category" in updates:
        record.admission_category = updates.get("admissionCategory") or updates.get("category")
    if "coursePreference" in updates:
        cp = updates["coursePreference"]
        record.course_name = cp.get("firstPreference") if isinstance(cp, dict) else str(cp or "")

    now_ist = datetime.now(IST)
    ist_naive = now_ist.replace(tzinfo=None)
    ist_iso = now_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30")
    record.updated_at = ist_naive
    data["updatedAt"] = ist_iso

    new_status = updates.get("status", old_status)
    if "status" in updates:
        record.status = new_status
        if new_status in ["Confirmed", "Confirm"]:
            record.confirmed_at = ist_naive
            data["confirmedAt"] = ist_iso
        elif new_status == "Sent to VC":
            record.forwarded_at = ist_naive
            data["forwardedAt"] = ist_iso

    if payload.comment:
        history_entry = {
            "id": f"{app_id}-{int(now_ist.timestamp() * 1000)}",
            "applicationId": app_id,
            "note": payload.comment,
            "actor": payload.actor or "Admission Officer",
            "createdAt": ist_iso,
        }
        history = data.get("correctionHistory", [])
        data["correctionHistory"] = [history_entry] + history

    record.data_json = json.dumps(data)
    # 1. Database update is committed successfully first
    db.commit()
    db.refresh(record)

    # 2. Automatically email student on status change, preventing duplicate emails
    last_emailed = data.get("last_emailed_status")
    student_email = data.get("email") or data.get("studentEmail") or data.get("parentEmail")

    if student_email and new_status in ["Enquiring", "Confirmed", "Confirm"]:
        if (new_status != old_status or last_emailed != new_status) and last_emailed != new_status:
            course_pref = data.get("coursePreference")
            course_name = course_pref.get("firstPreference") if isinstance(course_pref, dict) else str(course_pref or "")
            data["last_emailed_status"] = new_status
            record.data_json = json.dumps(data)
            db.commit()
            background_tasks.add_task(
                dispatch_status_email,
                to_email=student_email,
                student_name=data.get("studentName") or "Student",
                application_id=app_id,
                status=new_status,
                course=course_name,
                application_details=data,
            )

    # 3. Broadcast real-time update event to all connected dashboards and views
    emit_realtime_event("application_updated", data)

    return data


@router.delete("/applications/{app_id}")
def delete_portal_application(
    app_id: str,
    db: Session = Depends(get_db),
):
    record = db.get(models.PortalApplication, app_id)
    if not record:
        raise HTTPException(404, "Application not found")
    db.delete(record)
    db.commit()
    emit_realtime_event("application_deleted", {"id": app_id})
    return {"ok": True, "id": app_id}


class EmailSendRequest(BaseModel):
    to: str
    studentName: str
    applicationId: str
    status: str
    course: str | None = None
    enquiringEmail: str | None = None
    applicationDetails: dict[str, Any] | None = None


@router.post("/email/send")
def send_portal_email(payload: EmailSendRequest):
    from ..config import Settings, settings

    active_settings = Settings()
    if not active_settings.SMTP_HOST:
        raise HTTPException(503, "SMTP email service is not configured on the server")

    ok, msg = dispatch_status_email(
        to_email=payload.to,
        student_name=payload.studentName,
        application_id=payload.applicationId,
        status=payload.status,
        course=payload.course,
        enquiring_email=payload.enquiringEmail,
        application_details=payload.applicationDetails,
    )
    if not ok:
        raise HTTPException(502, f"Failed to send email via SMTP: {msg}")
    return {"ok": True, "message": f"Email delivered to {payload.to}"}



@router.get("/settings/{key}")
def get_portal_setting(key: str, db: Session = Depends(get_db)):
    setting = db.get(models.PortalSetting, key)
    if not setting:
        return {"key": key, "value": None}
    try:
        val = json.loads(setting.value_json)
    except Exception:
        val = setting.value_json
    return {"key": key, "value": val}


@router.put("/settings/{key}")
def save_portal_setting(key: str, payload: dict[str, Any], db: Session = Depends(get_db)):
    val_str = json.dumps(payload.get("value"))
    setting = db.get(models.PortalSetting, key)
    if setting:
        setting.value_json = val_str
    else:
        setting = models.PortalSetting(key=key, value_json=val_str)
        db.add(setting)
    db.commit()
    emit_realtime_event("setting_updated", {"key": key, "value": payload.get("value")})
    return {"key": key, "ok": True}


# ---------------------------------------------------------------------------
# Course Seat Management (Real-time tracking & VC exclusive quota updates)
# ---------------------------------------------------------------------------
DEFAULT_COURSE_SEAT_QUOTAS: dict[str, int] = {
    "AI&DS": 120,   # explicitly 120 seats
    "CSE": 120,
    "BME": 60,
    "CS": 60,
    "ECE": 60,
    "MECH": 60,
    "AIML": 60,
    "Electrical and Computer Engineering": 60,
    "EEE (Electrical and Electronics Engineering)": 60,
    "VLSI": 18,
    "ISE": 18,
    "M.E - CSE": 18,
    "M.E - BME": 18,
}


def normalize_course_name(name: str) -> str:
    if not name:
        return ""
    n = name.strip().lower()
    if "ai&ds" in n or "aids" in n or "data science" in n:
        return "AI&DS"
    if "cyber" in n or "cse-cs" in n or n == "cs":
        return "CS"
    if "ai&ml" in n or "aiml" in n or "machine learning" in n:
        return "AIML"
    if "bio" in n or "bme" in n:
        return "BME"
    if "computer" in n and "engineering" in n and "electrical" in n:
        return "Electrical and Computer Engineering"
    if "electrical" in n or "eee" in n:
        return "EEE (Electrical and Electronics Engineering)"
    if "electronics" in n or "ece" in n or "communication" in n:
        return "ECE"
    if "mech" in n:
        return "MECH"
    if "cse" in n or "computer science" in n:
        return "CSE"
    if "vlsi" in n:
        return "VLSI"
    if "ise" in n:
        return "ISE"
    return name.strip()


def get_course_seats_summary(db: Session) -> dict[str, Any]:
    quotas = dict(DEFAULT_COURSE_SEAT_QUOTAS)
    setting = db.get(models.PortalSetting, "course_seats")
    if setting and setting.value_json:
        try:
            saved = json.loads(setting.value_json)
            if isinstance(saved, dict):
                quotas.update({k: int(v) for k, v in saved.items()})
        except Exception:
            pass

    # Synchronize from courses table in TiDB
    try:
        db_courses = db.scalars(select(models.Course)).all()
        code_to_name = {
            "AIDS": "AI&DS",
            "CSE": "CSE",
            "CSE-CS": "CS",
            "BME": "BME",
            "EEE": "EEE (Electrical and Electronics Engineering)",
            "ECE": "ECE",
            "MECH": "MECH",
            "AIML": "AIML",
        }
        for c in db_courses:
            mapped_name = code_to_name.get(c.code)
            if mapped_name and c.seats:
                quotas[mapped_name] = max(quotas.get(mapped_name, 0), c.seats)
    except Exception:
        pass

    # Count filled applications
    records = db.scalars(select(models.PortalApplication)).all()
    filled_counts: dict[str, int] = {}
    for r in records:
        cname = r.course_name or ""
        if not cname:
            try:
                d = json.loads(r.data_json)
                cname = d.get("coursePreference", {}).get("firstPreference", "")
            except Exception:
                cname = ""
        norm = normalize_course_name(cname)
        if norm:
            filled_counts[norm] = filled_counts.get(norm, 0) + 1

    summary = {}
    for course, total in quotas.items():
        filled = filled_counts.get(course, 0)
        balance = max(0, total - filled)
        summary[course] = {
            "total": total,
            "filled": filled,
            "balance": balance,
        }
    return summary


class UpdateSeatsRequest(BaseModel):
    seats: dict[str, int]
    role: str | None = None


@router.get("/course-seats")
def get_course_seats(db: Session = Depends(get_db)):
    summary = get_course_seats_summary(db)
    return {"ok": True, "seats": summary}


@router.put("/course-seats")
def update_course_seats(payload: UpdateSeatsRequest, db: Session = Depends(get_db)):
    if payload.role and payload.role.lower() not in ["vc", "vice chairman", "vice_chairman"]:
        raise HTTPException(403, "Only the Vice Chairman (VC) is authorized to update course seats.")

    setting = db.get(models.PortalSetting, "course_seats")
    current_seats = dict(DEFAULT_COURSE_SEAT_QUOTAS)
    if setting and setting.value_json:
        try:
            saved = json.loads(setting.value_json)
            if isinstance(saved, dict):
                current_seats.update(saved)
        except Exception:
            pass

    for k, v in payload.seats.items():
        try:
            current_seats[k] = max(0, int(v))
        except (ValueError, TypeError):
            pass

    val_str = json.dumps(current_seats)
    if setting:
        setting.value_json = val_str
    else:
        setting = models.PortalSetting(key="course_seats", value_json=val_str)
        db.add(setting)

    # Synchronize with courses table in TiDB
    code_map = {
        "AI&DS": "AIDS",
        "CSE": "CSE",
        "CS": "CSE-CS",
        "BME": "BME",
        "EEE (Electrical and Electronics Engineering)": "EEE",
        "ECE": "ECE",
        "MECH": "MECH",
        "AIML": "AIML",
    }
    for c_name, c_code in code_map.items():
        if c_name in current_seats:
            try:
                course_record = db.scalar(select(models.Course).where(models.Course.code == c_code))
                if course_record:
                    course_record.seats = current_seats[c_name]
            except Exception:
                pass

    db.commit()

    summary = get_course_seats_summary(db)
    emit_realtime_event("course_seats_updated", summary)
    return {"ok": True, "seats": summary}
