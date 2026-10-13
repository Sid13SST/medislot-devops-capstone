from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Doctor
from ..schemas import DoctorCreate, DoctorOut

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


@router.get("", response_model=list[DoctorOut])
def list_doctors(db: Session = Depends(get_db)):
    return list(db.scalars(select(Doctor).where(Doctor.active.is_(True)).order_by(Doctor.department, Doctor.name)))


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.post("", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if db.scalars(select(Doctor.id).where(Doctor.name == name)).first():
        raise HTTPException(status_code=409, detail="A doctor with this name already exists")
    doctor = Doctor(name=name, department=payload.department, room=payload.room.strip())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor
