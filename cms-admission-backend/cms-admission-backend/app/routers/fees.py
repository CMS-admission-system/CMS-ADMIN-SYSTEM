import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_role
from ..enums import Community, StaffRole
from ..fee_engine import (
    calculate_student_fee,
    seed_dynamic_fees,
    DEFAULT_ACADEMIC_YEAR,
)

router = APIRouter(prefix="/fees", tags=["fees"])
portal_fees_router = APIRouter(prefix="/portal/fees", tags=["portal-fees"])


class FeeCalculationRequest(BaseModel):
    department: str | None = None
    course: str | None = None
    coursePreference: dict[str, Any] | None = None
    community: str | None = None
    firstGraduate: Any | None = None
    cutoff_mark: float | None = None
    cutoffMarks: float | None = None
    cutOffMarks: float | None = None
    accommodation: str | None = None
    transportRequired: str | None = None
    transport_required: str | None = None
    pickupPoint: str | None = None
    transport_location: str | None = None
    busRoute: str | None = None
    scholarshipCategory: str | None = None
    academic_year: str | None = DEFAULT_ACADEMIC_YEAR
    calculation_mode: str | None = None
    application_id: str | None = None
    studentName: str | None = None
    formNumber: str | None = None
    id: str | None = None


class ScholarshipApprovalRequest(BaseModel):
    approved_amount: float
    status: str = "Approved"
    notes: str | None = None


class FeeConfigUpdateRequest(BaseModel):
    academic_year: str = DEFAULT_ACADEMIC_YEAR
    calculation_mode: str = "department"
    admission_fee: float = 5000.0
    hostel_fee: float = 45000.0
    apply_cutoff_in_package_mode: bool = False
    allow_hostel_transport: bool = False
    departments: list[dict[str, Any]] | None = None
    community_packages: list[dict[str, Any]] | None = None
    cutoff_slabs: list[dict[str, Any]] | None = None
    transport_fees: list[dict[str, Any]] | None = None


# ---- Dynamic Fee Calculation Endpoint ----
@router.post("/calculate")
@portal_fees_router.post("/calculate")
def calculate_fee_endpoint(payload: FeeCalculationRequest, db: Session = Depends(get_db)):
    """Centralized dynamic student fee calculation engine.
    Calculates exact validated breakdown for 2026-2027."""
    data = payload.model_dump()
    app_id = payload.application_id or payload.id or payload.formNumber
    return calculate_student_fee(data, db, save_snapshot=False, application_id=app_id)


# ---- Get Active Fee Configuration ----
@router.get("/config")
@portal_fees_router.get("/config")
def get_fee_config(year: str = DEFAULT_ACADEMIC_YEAR, db: Session = Depends(get_db)):
    """Retrieve complete 2026-2027 fee configuration from MySQL."""
    seed_dynamic_fees(db)
    master = db.scalar(select(models.DynamicFeeConfig).where(models.DynamicFeeConfig.academic_year == year))
    if not master:
        master = db.scalar(select(models.DynamicFeeConfig))

    depts = db.scalars(
        select(models.DepartmentFeeConfig)
        .where(models.DepartmentFeeConfig.academic_year == year, models.DepartmentFeeConfig.is_active.is_(True))
    ).all()

    pkgs = db.scalars(
        select(models.CommunityPackageConfig)
        .where(models.CommunityPackageConfig.academic_year == year, models.CommunityPackageConfig.is_active.is_(True))
    ).all()

    slabs = db.scalars(
        select(models.CutoffConcessionSlab)
        .where(models.CutoffConcessionSlab.academic_year == year, models.CutoffConcessionSlab.is_active.is_(True))
        .order_by(models.CutoffConcessionSlab.sort_order.asc())
    ).all()

    transports = db.scalars(
        select(models.TransportFeeConfig).where(models.TransportFeeConfig.is_active.is_(True))
    ).all()

    return {
        "master": {
            "academic_year": master.academic_year if master else year,
            "version": master.version if master else 1,
            "calculation_mode": master.calculation_mode if master else "department",
            "admission_fee": master.admission_fee if master else 5000.0,
            "hostel_fee": master.hostel_fee if master else 45000.0,
            "apply_cutoff_in_package_mode": master.apply_cutoff_in_package_mode if master else False,
            "allow_hostel_transport": master.allow_hostel_transport if master else False,
            "package_included_components": json.loads(master.package_included_components) if (master and master.package_included_components) else ["tuition", "hostel"],
        },
        "departments": [
            {
                "code": d.department_code,
                "name": d.department_name,
                "nfg_fee": d.nfg_fee,
                "fg_fee": d.fg_fee,
            }
            for d in depts
        ],
        "community_packages": [
            {
                "community_group": p.community_group,
                "hostel_package": p.hostel_package,
                "dayscholar_package": p.dayscholar_package,
            }
            for p in pkgs
        ],
        "cutoff_slabs": [
            {
                "id": s.id,
                "min_cutoff": s.min_cutoff,
                "max_cutoff": s.max_cutoff,
                "concession_type": s.concession_type,
                "concession_value": s.concession_value,
                "label": s.label,
                "sort_order": s.sort_order,
            }
            for s in slabs
        ],
        "transport_fees": [
            {
                "category_name": t.category_name,
                "amount": t.amount,
            }
            for t in transports
        ],
    }


# ---- Admin Updates Fee Configuration ----
@router.put("/config")
@portal_fees_router.put("/config")
def update_fee_config(payload: FeeConfigUpdateRequest, db: Session = Depends(get_db)):
    """Admin updates dynamic fee configuration, department fees, community packages in MySQL."""
    year = payload.academic_year or DEFAULT_ACADEMIC_YEAR
    master = db.scalar(select(models.DynamicFeeConfig).where(models.DynamicFeeConfig.academic_year == year))
    if not master:
        master = models.DynamicFeeConfig(academic_year=year)
        db.add(master)

    master.calculation_mode = payload.calculation_mode
    master.admission_fee = payload.admission_fee
    master.hostel_fee = payload.hostel_fee
    master.apply_cutoff_in_package_mode = payload.apply_cutoff_in_package_mode
    master.allow_hostel_transport = payload.allow_hostel_transport
    master.version = (master.version or 1) + 1

    # Update Departments
    if payload.departments:
        for d in payload.departments:
            code = d.get("code") or d.get("department_code")
            if not code:
                continue
            row = db.scalar(
                select(models.DepartmentFeeConfig).where(
                    models.DepartmentFeeConfig.academic_year == year,
                    models.DepartmentFeeConfig.department_code == code,
                )
            )
            if not row:
                row = models.DepartmentFeeConfig(academic_year=year, department_code=code, department_name=d.get("name") or code)
                db.add(row)
            if "nfg_fee" in d:
                row.nfg_fee = float(d["nfg_fee"])
            if "fg_fee" in d:
                row.fg_fee = float(d["fg_fee"])
            if "name" in d:
                row.department_name = str(d["name"])

    # Update Community Packages
    if payload.community_packages:
        for p in payload.community_packages:
            grp = p.get("community_group")
            if not grp:
                continue
            row = db.scalar(
                select(models.CommunityPackageConfig).where(
                    models.CommunityPackageConfig.academic_year == year,
                    models.CommunityPackageConfig.community_group == grp,
                )
            )
            if not row:
                row = models.CommunityPackageConfig(academic_year=year, community_group=grp, hostel_package=0, dayscholar_package=0)
                db.add(row)
            if "hostel_package" in p:
                row.hostel_package = float(p["hostel_package"])
            if "dayscholar_package" in p:
                row.dayscholar_package = float(p["dayscholar_package"])

    # Update Cutoff Slabs
    if payload.cutoff_slabs:
        for s in payload.cutoff_slabs:
            slab_id = s.get("id")
            if slab_id:
                row = db.scalar(select(models.CutoffConcessionSlab).where(models.CutoffConcessionSlab.id == slab_id))
            else:
                row = db.scalar(
                    select(models.CutoffConcessionSlab).where(
                        models.CutoffConcessionSlab.academic_year == year,
                        models.CutoffConcessionSlab.min_cutoff == float(s.get("min_cutoff", 0)),
                    )
                )
            if row:
                if "concession_value" in s:
                    row.concession_value = float(s["concession_value"])
                if "concession_type" in s:
                    row.concession_type = str(s["concession_type"])
                if "label" in s:
                    row.label = str(s["label"])

    # Update Transport Fees
    if payload.transport_fees:
        for t in payload.transport_fees:
            cat = t.get("category_name")
            if not cat:
                continue
            row = db.scalar(select(models.TransportFeeConfig).where(models.TransportFeeConfig.category_name == cat))
            if not row:
                row = models.TransportFeeConfig(category_name=cat, amount=float(t.get("amount", 0)))
                db.add(row)
            else:
                row.amount = float(t.get("amount", 0))

    db.commit()
    return {"ok": True, "message": "Fee configuration updated successfully", "academic_year": year}


# ---- Student Calculation Snapshot Retrieval ----
@router.get("/calculation/{application_id}")
@portal_fees_router.get("/calculation/{application_id}")
def get_student_fee_calculation(application_id: str, db: Session = Depends(get_db)):
    """Retrieve saved student calculation snapshot."""
    record = db.scalar(
        select(models.StudentFeeCalculationRecord).where(
            models.StudentFeeCalculationRecord.application_id == application_id
        )
    )
    if not record:
        raise HTTPException(404, f"No calculation found for application {application_id}")
    try:
        breakdown = json.loads(record.breakdown_json)
    except Exception:
        breakdown = {}
    return {
        "application_id": record.application_id,
        "academic_year": record.academic_year,
        "calculation_mode": record.calculation_mode,
        "final_payable": record.final_payable,
        "pmss_status": record.pmss_status,
        "pmss_approved_amount": record.pmss_approved_amount,
        "breakdown": breakdown,
    }


# ---- Admin Scholarship Approval Endpoint ----
@router.post("/calculation/{application_id}/scholarship")
@portal_fees_router.post("/calculation/{application_id}/scholarship")
def approve_scholarship_endpoint(
    application_id: str,
    payload: ScholarshipApprovalRequest,
    db: Session = Depends(get_db),
):
    """Admin approves official PMSS or other scholarship deduction."""
    record = db.scalar(
        select(models.StudentFeeCalculationRecord).where(
            models.StudentFeeCalculationRecord.application_id == application_id
        )
    )
    # Also find corresponding portal application
    portal_app = db.scalar(
        select(models.PortalApplication).where(models.PortalApplication.id == application_id)
    )
    if not portal_app and not record:
        raise HTTPException(404, f"Application {application_id} not found")

    student_data = {}
    if portal_app:
        try:
            student_data = json.loads(portal_app.data_json)
        except Exception:
            student_data = {}

    student_data["pmss_approved_amount"] = payload.approved_amount
    new_breakdown = calculate_student_fee(student_data, db, save_snapshot=True, application_id=application_id)

    # Update in PortalApplication data_json as well
    if portal_app:
        student_data["feeCalculation"] = new_breakdown
        portal_app.data_json = json.dumps(student_data)
        db.commit()

    return {"ok": True, "message": "Scholarship updated and recalculated successfully", "breakdown": new_breakdown}


# ---- Legacy compatibility routes ----
@router.get("", response_model=list[schemas.FeeStructureOut])
def list_fees(db: Session = Depends(get_db)):
    return db.scalars(select(models.FeeStructure)).all()


@router.put("/{community}", response_model=schemas.FeeStructureOut)
def update_fee(
    community: Community,
    payload: schemas.FeeStructureUpdate,
    db: Session = Depends(get_db),
):
    row = db.scalar(select(models.FeeStructure).where(models.FeeStructure.community == community))
    if not row:
        raise HTTPException(404, "No fee row for this community")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row
