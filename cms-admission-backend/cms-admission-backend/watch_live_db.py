"""Live Database Real-Time Watcher. Monitors the configured database."""

import time
from datetime import datetime

from app.database import SessionLocal
from app.models import PortalApplication


def clear_and_banner(count):
    print("\033[H\033[J", end="")  # Clear terminal
    print("=" * 80)
    print("  CMS COLLEGE OF ENGINEERING — LIVE DATABASE MONITOR")
    print(f"  Status: CONNECTED & MONITORING REAL-TIME | Total Records: {count}")
    print(f"  Last Checked: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print(f"{'APP ID':<10} | {'STUDENT NAME':<24} | {'STATUS':<12} | {'COURSE':<26}")
    print("-" * 80)

def main():
    print("Connecting to configured database...")
    seen_ids = set()

    db = SessionLocal()
    initial_apps = db.query(PortalApplication).order_by(PortalApplication.submitted_at.desc()).all()
    for a in initial_apps:
        seen_ids.add(a.id)

    clear_and_banner(len(initial_apps))
    for a in initial_apps[:10]:
        course = (a.course_name or "-")[:25]
        name = (a.student_name or "-")[:23]
        print(f"{a.id:<10} | {name:<24} | {a.status:<12} | {course:<26}")
    print("-" * 80)
    print(">> Listening for new submissions in real-time... (Press Ctrl+C to stop)")
    db.close()

    while True:
        time.sleep(2)  # Check every 2 seconds
        db = SessionLocal()
        try:
            latest_apps = db.query(PortalApplication).order_by(PortalApplication.submitted_at.desc()).all()
            new_found = False
            for a in latest_apps:
                if a.id not in seen_ids:
                    seen_ids.add(a.id)
                    new_found = True
                    print(f"\n🔔 [NEW SUBMISSION DETECTED IN CLOUD DATABASE!]")
                    print(f"   Application ID : {a.id}")
                    print(f"   Student Name   : {a.student_name}")
                    print(f"   Course         : {a.course_name}")
                    print(f"   Status         : {a.status}")
                    print(f"   Timestamp      : {a.submitted_at}")
                    print("-" * 80)

            if new_found:
                print(f"Total Applications: {len(latest_apps)}")
                print(">> Listening for next submission...")
        except Exception as e:
            print(f"Transient connection notice: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    main()
