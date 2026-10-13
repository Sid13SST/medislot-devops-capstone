#!/usr/bin/env python3
"""Fill MediSlot with realistic demo appointments through the public REST API.

Usage:
    python scripts/seed_demo_data.py                       # Docker Compose (http://localhost:3000)
    python scripts/seed_demo_data.py http://medislot.local # through the Kubernetes Ingress

Only the standard library is used, so it runs anywhere Python 3.10+ is installed.
"""

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")

PATIENTS = [
    ("Aarav Gupta", "+91 98201 11111", "Persistent cough for two weeks"),
    ("Diya Malhotra", "+91 98202 22222", "Annual cardiac check-up"),
    ("Kabir Singh", "+91 98203 33333", "Skin rash on forearm"),
    ("Ishita Banerjee", "+91 98204 44444", "Child vaccination — 18 months"),
    ("Vivaan Reddy", "+91 98205 55555", "Knee pain after running"),
    ("Saanvi Joshi", "+91 98206 66666", "Recurring migraines"),
    ("Arjun Pillai", "+91 98207 77777", "Blood pressure review"),
    ("Myra Chatterjee", "+91 98208 88888", "Follow-up on lab results"),
    ("Reyansh Kulkarni", "+91 98209 99999", "Sprained ankle"),
    ("Anika Bose", "+91 98210 10101", "Acne treatment follow-up"),
    ("Vihaan Shah", "+91 98211 12121", "ECG review"),
    ("Kiara Desai", "+91 98212 13131", "Fever and sore throat"),
]


def call(method: str, path: str, body: dict | None = None):
    request = urllib.request.Request(
        f"{BASE}/api{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:  # noqa: S310 (trusted, user-supplied URL)
        raw = response.read()
        return json.loads(raw) if raw else None


def main() -> None:
    doctors = call("GET", "/doctors")
    if not doctors:
        sys.exit("No doctors found — is the backend migrated?")

    # Start at the next full hour so every booking is in the future.
    start = (datetime.now() + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    created = []
    for i, (name, phone, reason) in enumerate(PATIENTS):
        doctor = doctors[i % len(doctors)]
        slot = start + timedelta(days=i // 6, minutes=45 * (i % 6))
        payload = {
            "patient_name": name,
            "patient_phone": phone,
            "doctor_id": doctor["id"],
            "scheduled_at": slot.strftime("%Y-%m-%dT%H:%M:00"),
            "duration_minutes": 30,
            "reason": reason,
        }
        try:
            created.append(call("POST", "/appointments", payload))
            print(f"booked  {slot:%a %H:%M}  {name:<18} -> {doctor['name']}")
        except urllib.error.HTTPError as exc:
            print(f"skipped {name}: HTTP {exc.code} {exc.read().decode()}")

    # Move a few through the lifecycle so every status shows up on the dashboard.
    transitions = [["CHECKED_IN"], ["CHECKED_IN", "COMPLETED"], ["CANCELLED"], ["NO_SHOW"]]
    for appointment, steps in zip(created, transitions, strict=False):
        for status in steps:
            call("PUT", f"/appointments/{appointment['id']}", {"status": status})

    print(json.dumps(call("GET", "/appointments/stats"), indent=2))


if __name__ == "__main__":
    main()
