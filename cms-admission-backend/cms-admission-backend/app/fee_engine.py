import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30), name="IST")

DEFAULT_ACADEMIC_YEAR = "2026-2027"

# Standard department mapping to canonical codes
DEPT_CANONICAL_MAP = {
    "BE CSE": "CSE",
    "CSE": "CSE",
    "COMPUTER SCIENCE & ENGG": "CSE",
    "COMPUTER SCIENCE & ENGINEERING": "CSE",
    "COMPUTER SCIENCE": "CSE",
    "CSE AI & ML": "AIML",
    "AIML": "AIML",
    "ARTIFICIAL INTELLIGENCE & MACHINE LEARNING": "AIML",
    "ECE": "ECE",
    "ELECTRONICS AND COMMUNICATION ENGG": "ECE",
    "ELECTRONICS & COMMUNICATION ENGINEERING": "ECE",
    "CSE CYBER SECURITY": "CYBER",
    "CYBER": "CYBER",
    "CS": "CYBER",
    "BME": "BME",
    "BIO - MEDICAL ENGG": "BME",
    "BIO-MEDICAL ENGINEERING": "BME",
    "B.TECH AIDS": "AIDS",
    "AIDS": "AIDS",
    "AI&DS": "AIDS",
    "ARTIFICIAL INTELLIGENCE & DATA SCIENCE": "AIDS",
    "EEE": "EEE",
    "ELECTRICAL AND ELECTRONICS ENGG": "EEE",
    "ELECTRICAL & ELECTRONICS ENGINEERING": "EEE",
    "MECH": "MECH",
    "MECHANICAL ENGG": "MECH",
    "MECHANICAL ENGINEERING": "MECH",
}


def normalize_dept(dept_str: str | None) -> str:
    if not dept_str:
        return "CSE"
    clean = str(dept_str).strip().upper()
    for key, code in DEPT_CANONICAL_MAP.items():
        if key in clean or clean in key:
            return code
    return "CSE"


def is_pmss_eligible(community_str: str | None) -> bool:
    if not community_str:
        return False
    c = str(community_str).strip().upper()
    return any(sc in c for sc in ["SC", "SCA", "SCC", "ST", "SC(A)"])


def seed_dynamic_fees(db: Session) -> None:
    """Ensure standard 2026-2027 fee configuration is seeded in MySQL."""
    # 1. Master Config
    master = db.scalar(
        select(models.DynamicFeeConfig).where(models.DynamicFeeConfig.academic_year == DEFAULT_ACADEMIC_YEAR)
    )
    if not master:
        master = models.DynamicFeeConfig(
            academic_year=DEFAULT_ACADEMIC_YEAR,
            version=1,
            is_active=True,
            calculation_mode="department",  # Mode A default
            admission_fee=5000.0,
            hostel_fee=45000.0,
            apply_cutoff_in_package_mode=False,
            allow_hostel_transport=False,
            package_included_components=json.dumps(["tuition", "hostel"]),
            concession_rules_json=json.dumps({"cutoff_applies_to": "tuition_only"}),
        )
        db.add(master)

    # 2. Department Tuition Fees (2026-2027)
    dept_defaults = [
        ("CSE", "BE CSE", 80000.0, 55000.0),
        ("AIML", "CSE AI & ML", 80000.0, 55000.0),
        ("ECE", "ECE", 80000.0, 55000.0),
        ("CYBER", "CSE Cyber Security", 80000.0, 55000.0),
        ("BME", "BME", 80000.0, 55000.0),
        ("AIDS", "B.Tech AIDS", 80000.0, 55000.0),
        ("EEE", "EEE", 60000.0, 35000.0),
        ("MECH", "MECH", 60000.0, 35000.0),
    ]
    for code, name, nfg, fg in dept_defaults:
        existing_dept = db.scalar(
            select(models.DepartmentFeeConfig).where(
                models.DepartmentFeeConfig.academic_year == DEFAULT_ACADEMIC_YEAR,
                models.DepartmentFeeConfig.department_code == code,
            )
        )
        if not existing_dept:
            db.add(
                models.DepartmentFeeConfig(
                    academic_year=DEFAULT_ACADEMIC_YEAR,
                    department_code=code,
                    department_name=name,
                    nfg_fee=nfg,
                    fg_fee=fg,
                    is_active=True,
                )
            )

    # 3. Community Packages (Mode B)
    pkg_defaults = [
        ("SC/SCC/SCA", 63500.0, 57000.0),
        ("ST", 62000.0, 55500.0),
        ("BC/MBC (FG)", 25000.0, 25000.0),
    ]
    for grp, hostel_p, day_p in pkg_defaults:
        existing_pkg = db.scalar(
            select(models.CommunityPackageConfig).where(
                models.CommunityPackageConfig.academic_year == DEFAULT_ACADEMIC_YEAR,
                models.CommunityPackageConfig.community_group == grp,
            )
        )
        if not existing_pkg:
            db.add(
                models.CommunityPackageConfig(
                    academic_year=DEFAULT_ACADEMIC_YEAR,
                    community_group=grp,
                    hostel_package=hostel_p,
                    dayscholar_package=day_p,
                    is_active=True,
                )
            )

    # 4. Cut-off Concession Slabs (Highest Eligible Slabs)
    cutoff_defaults = [
        (170.0, 200.0, "percent", 100.0, "100% Tuition Concession", 1),
        (160.0, 169.99, "percent", 75.0, "75% Tuition Concession", 2),
        (150.0, 159.99, "percent", 50.0, "50% Tuition Concession", 3),
        (140.0, 149.99, "percent", 25.0, "25% Tuition Concession", 4),
        (130.0, 139.99, "amount", 10000.0, "₹10,000 Cut-off Concession", 5),
        (125.0, 129.99, "amount", 5000.0, "₹5,000 Cut-off Concession", 6),
        (0.0, 124.99, "amount", 0.0, "Nil (Below 125)", 7),
    ]
    for min_c, max_c, c_type, c_val, lbl, sort_o in cutoff_defaults:
        existing_slab = db.scalar(
            select(models.CutoffConcessionSlab).where(
                models.CutoffConcessionSlab.academic_year == DEFAULT_ACADEMIC_YEAR,
                models.CutoffConcessionSlab.min_cutoff == min_c,
            )
        )
        if not existing_slab:
            db.add(
                models.CutoffConcessionSlab(
                    academic_year=DEFAULT_ACADEMIC_YEAR,
                    min_cutoff=min_c,
                    max_cutoff=max_c,
                    concession_type=c_type,
                    concession_value=c_val,
                    label=lbl,
                    sort_order=sort_o,
                    is_active=True,
                )
            )

    # 5. Transport Fee Slabs
    trans_defaults = [
        ("Namakkal Local", 5000.0),
        ("Within 25 KM", 7500.0),
        ("Above 25 KM", 12500.0),
        ("Transport No", 0.0),
    ]
    for cat_name, amt in trans_defaults:
        existing_t = db.scalar(
            select(models.TransportFeeConfig).where(models.TransportFeeConfig.category_name == cat_name)
        )
        if not existing_t:
            db.add(models.TransportFeeConfig(category_name=cat_name, amount=amt, is_active=True))

    db.commit()


def get_transport_amount(
    transport_required: str | None,
    location_desc: str | None,
    bus_route: str | None,
    db: Session,
) -> tuple[float, str]:
    if not transport_required or str(transport_required).strip().lower() != "yes":
        return 0.0, "Transport Not Required (₹0)"

    search_text = f"{location_desc or ''} {bus_route or ''}".lower()

    if any(k in search_text for k in ["local", "namakkal local", "namakkal", "city", "within local"]):
        cat = "Namakkal Local"
    elif any(k in search_text for k in ["above 25", "> 25", ">25", "long distance", "outer"]):
        cat = "Above 25 KM"
    elif any(k in search_text for k in ["within 25", "<= 25", "25 km", "25km", "suburb"]):
        cat = "Within 25 KM"
    else:
        cat = "Namakkal Local"

    row = db.scalar(select(models.TransportFeeConfig).where(models.TransportFeeConfig.category_name == cat))
    amount = float(row.amount) if row else 5000.0
    return amount, f"{cat} (₹{int(amount):,})"


def calculate_student_fee(
    student_data: dict[str, Any],
    db: Session,
    save_snapshot: bool = False,
    application_id: str | None = None,
) -> dict[str, Any]:
    """Execute the complete 10-step dynamic fee calculation engine.
    - Server-side mathematical validation.
    - Zero duplicate charges.
    - Clean breakdown JSON with currency formatted displays.
    """
    # Step 1: Validate and extract student details
    year = str(student_data.get("academic_year") or DEFAULT_ACADEMIC_YEAR).strip()
    config = db.scalar(select(models.DynamicFeeConfig).where(models.DynamicFeeConfig.academic_year == year))
    if not config:
        seed_dynamic_fees(db)
        config = db.scalar(select(models.DynamicFeeConfig).where(models.DynamicFeeConfig.academic_year == year))

    # Step 2: Determine Calculation Mode (Admin Configured Mode A vs Mode B)
    # Allows admin override via payload if explicitly testing
    requested_mode = student_data.get("calculation_mode") or (config.calculation_mode if config else "department")
    calculation_mode = "package" if requested_mode == "package" else "department"

    dept_raw = (
        student_data.get("department")
        or student_data.get("course")
        or (student_data.get("coursePreference") or {}).get("firstPreference")
        or "BE CSE"
    )
    dept_code = normalize_dept(dept_raw)

    community_raw = str(student_data.get("community") or student_data.get("caste") or "OC").strip().upper()
    is_fg = str(student_data.get("firstGraduate") or "").strip().lower() in ["yes", "true", "1"]
    accommodation = (
        "Hostel" if "hostel" in str(student_data.get("accommodation") or "").strip().lower() else "Day Scholar"
    )

    # Cutoff Mark
    try:
        cutoff = float(student_data.get("cutoff_mark") or student_data.get("cutoffMarks") or student_data.get("cutOffMarks") or 0.0)
    except (ValueError, TypeError):
        cutoff = 0.0

    # PMSS Scholarship Eligibility
    pmss_eligible = is_pmss_eligible(community_raw)
    pmss_status = "Not Eligible"
    if pmss_eligible:
        # Check if already approved by admin in database
        saved_rec = None
        if application_id:
            saved_rec = db.scalar(
                select(models.StudentFeeCalculationRecord).where(
                    models.StudentFeeCalculationRecord.application_id == application_id
                )
            )
        pmss_approved_amount = float(
            student_data.get("pmss_approved_amount")
            or (saved_rec.pmss_approved_amount if saved_rec else 0.0)
            or 0.0
        )
        if pmss_approved_amount > 0:
            pmss_status = "Approved"
        else:
            pmss_status = "Eligible / Verification Pending"
    else:
        pmss_approved_amount = 0.0

    admission_fee = float(config.admission_fee if config else 5000.0)
    default_hostel_fee = float(config.hostel_fee if config else 45000.0)

    # Step 3 & 4: Retrieve Department Tuition / Community Package
    dept_cfg = db.scalar(
        select(models.DepartmentFeeConfig).where(
            models.DepartmentFeeConfig.academic_year == year,
            models.DepartmentFeeConfig.department_code == dept_code,
        )
    )
    nfg_fee = float(dept_cfg.nfg_fee if dept_cfg else 80000.0)
    fg_fee = float(dept_cfg.fg_fee if dept_cfg else 55000.0)
    dept_display_name = dept_cfg.department_name if dept_cfg else dept_raw

    original_tuition = nfg_fee
    if is_fg:
        applicable_tuition = fg_fee
        fg_reduction = max(0.0, nfg_fee - fg_fee)  # Exactly ₹25,000 for standard departments
    else:
        applicable_tuition = nfg_fee
        fg_reduction = 0.0

    # Step 5: Calculate Highest Cut-off Concession
    slabs = db.scalars(
        select(models.CutoffConcessionSlab)
        .where(models.CutoffConcessionSlab.academic_year == year, models.CutoffConcessionSlab.is_active.is_(True))
        .order_by(models.CutoffConcessionSlab.sort_order.asc())
    ).all()

    cutoff_concession_amount = 0.0
    cutoff_concession_label = "Nil (Below 125)"

    for slab in slabs:
        if slab.min_cutoff <= cutoff <= slab.max_cutoff or (slab.max_cutoff >= 200.0 and cutoff >= slab.min_cutoff):
            if slab.concession_type == "percent":
                cutoff_concession_amount = (slab.concession_value / 100.0) * applicable_tuition
            else:
                cutoff_concession_amount = min(slab.concession_value, applicable_tuition)
            cutoff_concession_label = slab.label
            break

    # Prevent negative tuition
    cutoff_concession_amount = min(cutoff_concession_amount, applicable_tuition)

    # Step 7: Accommodation & Transport Charges
    if accommodation == "Hostel":
        hostel_fee = default_hostel_fee
        # Hostel students only get transport if admin specifically enables it
        if config and config.allow_hostel_transport:
            transport_fee, transport_label = get_transport_amount(
                student_data.get("transportRequired") or student_data.get("transport_required"),
                student_data.get("pickupPoint") or student_data.get("transport_location"),
                student_data.get("busRoute"),
                db,
            )
        else:
            transport_fee = 0.0
            transport_label = "Hostel Resident (Transport ₹0)"
    else:
        hostel_fee = 0.0
        transport_fee, transport_label = get_transport_amount(
            student_data.get("transportRequired") or student_data.get("transport_required"),
            student_data.get("pickupPoint") or student_data.get("transport_location"),
            student_data.get("busRoute"),
            db,
        )

    # Package Mode Calculations (Mode B)
    community_package_amount = 0.0
    package_group_name = None

    if calculation_mode == "package":
        # Identify applicable community package group
        if any(sc in community_raw for sc in ["SC", "SCA", "SCC", "SC(A)"]):
            package_group_name = "SC/SCC/SCA"
        elif "ST" in community_raw:
            package_group_name = "ST"
        elif any(bc in community_raw for bc in ["BC", "MBC", "BCM", "DNC"]) and is_fg:
            package_group_name = "BC/MBC (FG)"

        if package_group_name:
            pkg_row = db.scalar(
                select(models.CommunityPackageConfig).where(
                    models.CommunityPackageConfig.academic_year == year,
                    models.CommunityPackageConfig.community_group == package_group_name,
                )
            )
            if pkg_row:
                community_package_amount = (
                    float(pkg_row.hostel_package) if accommodation == "Hostel" else float(pkg_row.dayscholar_package)
                )

        # In package mode, the community package ALREADY includes tuition and accommodation!
        # Do not double charge tuition or hostel!
        hostel_fee = 0.0  # Already inside package
        applicable_tuition = 0.0  # Covered by package

        # Cutoff concession in package mode only if enabled by admin
        if not (config and config.apply_cutoff_in_package_mode):
            cutoff_concession_amount = 0.0
            cutoff_concession_label = "Not applicable in Community Package mode"

    # Step 8 & 9: Final Tuition & Payable Amount
    if calculation_mode == "department":
        final_tuition = max(0.0, applicable_tuition - cutoff_concession_amount - pmss_approved_amount)
        # Admission Fee must NOT be added to Total Fees
        total_original_amount = original_tuition + (default_hostel_fee if accommodation == "Hostel" else 0.0) + transport_fee
        total_concession = fg_reduction + cutoff_concession_amount + pmss_approved_amount
        final_payable_amount = max(0.0, final_tuition + hostel_fee + transport_fee)
        pmss_pending_amount = max(0.0, applicable_tuition - cutoff_concession_amount) if pmss_eligible else 0.0
    else:
        # Package Mode
        effective_package = community_package_amount if community_package_amount > 0 else (applicable_tuition + hostel_fee)
        final_tuition = 0.0
        total_original_amount = effective_package + transport_fee
        total_concession = cutoff_concession_amount + pmss_approved_amount
        final_payable_amount = max(0.0, total_original_amount - total_concession)
        pmss_pending_amount = effective_package if pmss_eligible else 0.0

    # Step 10: Compile Detailed Breakdown
    breakdown = {
        "institution": "CMS COLLEGE OF ENGINEERING",
        "sub_heading": f"FEE STRUCTURE – {year}",
        "tnea_code": "2635",
        "academic_year": year,
        "calculation_mode": calculation_mode,
        "calculation_mode_label": "Mode A: Department-wise" if calculation_mode == "department" else "Mode B: Community Package",
        "student_details": {
            "student_name": student_data.get("studentName") or student_data.get("full_name") or "Student",
            "application_number": application_id or student_data.get("formNumber") or student_data.get("id") or "New Application",
            "department": dept_display_name,
            "department_code": dept_code,
            "community": community_raw,
            "first_graduate": "First Graduate (FG)" if is_fg else "Non-First Graduate (NFG)",
            "is_fg": is_fg,
            "cutoff_mark": round(cutoff, 2),
            "accommodation": accommodation,
            "transport_selection": transport_label,
            "scholarship_category": "Post-Matric Scholarship Scheme (PMSS)" if pmss_eligible else "General",
        },
        "fee_breakdown": {
            "original_tuition": original_tuition,
            "fg_reduction": fg_reduction,
            "applicable_tuition": applicable_tuition,
            "cutoff_concession_label": cutoff_concession_label,
            "cutoff_concession_amount": cutoff_concession_amount,
            "pmss_status": pmss_status,
            "pmss_pending_amount": pmss_pending_amount,
            "pmss_approved_amount": pmss_approved_amount,
            "final_tuition": final_tuition,
            "admission_fee": admission_fee if calculation_mode == "department" else 0.0,
            "hostel_fee": hostel_fee,
            "community_package_name": package_group_name,
            "community_package_amount": community_package_amount,
            "transport_fee": transport_fee,
            "transport_label": transport_label,
            "total_original_amount": total_original_amount,
            "total_concession": total_concession,
            "final_payable_amount": final_payable_amount,
            "total_fees": final_payable_amount,
        },
        "formatted": {
            "original_tuition": f"₹{int(original_tuition):,}",
            "fg_reduction": f"₹{int(fg_reduction):,}",
            "applicable_tuition": f"₹{int(applicable_tuition):,}",
            "cutoff_concession": f"₹{int(cutoff_concession_amount):,}",
            "pmss_approved": f"₹{int(pmss_approved_amount):,}",
            "pmss_pending": f"₹{int(pmss_pending_amount):,}",
            "final_tuition": f"₹{int(final_tuition):,}",
            "admission_fee": f"₹{int(admission_fee):,}" if calculation_mode == "department" else "Included",
            "hostel_fee": f"₹{int(hostel_fee):,}" if hostel_fee > 0 else ("Included in Package" if calculation_mode == "package" and accommodation == "Hostel" else "₹0 (Day Scholar)"),
            "community_package": f"₹{int(community_package_amount):,}" if community_package_amount > 0 else "—",
            "transport_fee": f"₹{int(transport_fee):,}",
            "total_original_amount": f"₹{int(total_original_amount):,}",
            "total_concession": f"₹{int(total_concession):,}",
            "final_payable_amount": f"₹{int(final_payable_amount):,}",
            "total_fees": f"₹{int(final_payable_amount):,}",
        },
        "calculated_at": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }

    # Step 11: Save to MySQL snapshot if requested
    if save_snapshot and application_id:
        try:
            record = db.scalar(
                select(models.StudentFeeCalculationRecord).where(
                    models.StudentFeeCalculationRecord.application_id == application_id
                )
            )
            if not record:
                record = models.StudentFeeCalculationRecord(application_id=application_id)
                db.add(record)

            record.academic_year = year
            record.calculation_mode = calculation_mode
            record.fee_version = config.version if config else 1
            record.original_amount = total_original_amount
            record.total_concession = total_concession
            record.final_payable = final_payable_amount
            record.pmss_status = pmss_status
            record.pmss_pending_amount = pmss_pending_amount
            record.pmss_approved_amount = pmss_approved_amount
            record.breakdown_json = json.dumps(breakdown)
            record.input_snapshot_json = json.dumps(student_data)
            db.commit()
            db.refresh(record)
        except Exception as e:
            logger.error("Failed to save fee calculation snapshot: %s", e)
            db.rollback()

    return breakdown
