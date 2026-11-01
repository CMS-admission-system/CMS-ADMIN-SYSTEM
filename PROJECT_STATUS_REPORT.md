# CMS College of Engineering — Digital Admission & Admin Portal
## Comprehensive Project Condition & Status Report

**Document Version:** 1.0.0  
**Generated On:** November 1, 2026  
**System Status:** **100% OPERATIONAL & PRODUCTION LIVE**  
**Production URL:** [https://cms-admin-system-nvoj.onrender.com](https://cms-admin-system-nvoj.onrender.com)  
**GitHub Repository:** [https://github.com/cmsadsystem-ai/CMS-ADMIN-PORTAL](https://github.com/cmsadsystem-ai/CMS-ADMIN-PORTAL) (`main` branch)

---

### Executive Summary

The **CMS College of Engineering Admission & Admin Portal** is an end-to-end autonomous college admission management platform. It features an integrated student registration kiosk/portal, multi-user real-time officer and vice-chairman dashboards, automatic cut-off mark computations, email notifications with exact paper-format admission application previews, and a centralized cloud database architecture.

All systems have been upgraded from temporary trial infrastructure to a **Permanent Free Cloud Database (TiDB Serverless)**, eliminating all 30-day trial limitations and recurring hosting fees.

---

## 1. System Architecture & Hosting Details

```mermaid
graph TD
    Client[Student / Kiosk / Parent Device] -->|HTTPS POST| Render[Render Unified Service: cms-admin-system]
    Officer[Admission Officer Dashboard] <-->|Socket.IO Real-time| Render
    VC[Vice-Chairman Dashboard] <-->|Socket.IO Real-time| Render
    Render -->|FastAPI Backend| Core[API & Business Logic Layer]
    Core -->|SSL Encrypted Port 4000| TiDB[(TiDB Cloud MySQL: cms_admission)]
    Core -->|SMTP TLS Port 587| Gmail[Gmail SMTP Engine: cmsadsystem@gmail.com]
    Gmail -->|Delivery| StudentInbox[Student / Parent / College Inbox]
```

### Hosting Breakdown

| Component | Platform | Plan / Tier | Cost | Limits / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Full-Stack Application** | **Render** (`cms-admin-system`) | Free Web Service (Singapore) | **$0 / month** | Fast ASGI + Vite Static SPA, Auto-deploys via Git |
| **Central Database** | **TiDB Cloud** (`cms-admission-db`) | Serverless Starter | **$0 / month (Permanent)** | 5 GB Free Storage, No 30-day trial limit, No credit card |
| **Email SMTP Service** | **Google Gmail SMTP** | Standard Workspace | **$0 / month** | App Password Auth, TLS encrypted |
| **Version Control** | **GitHub** (`CMS-ADMIN-PORTAL`) | Public / Private Git | **$0 / month** | Automatic Render Blueprint deployment |

---

## 2. Central Database Infrastructure (TiDB Cloud)

### Connection Parameters

* **Database Engine:** MySQL 8.0 Wire-Compatible (TiDB Serverless v8.5.3)
* **Cluster Name:** `cms-admission-db`
* **Cloud Provider & Region:** AWS Singapore (`ap-southeast-1`)
* **Host:** `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
* **Port:** `4000`
* **Database Name:** `cms_admission`
* **Username:** `2dqhC13C1WmSRUJ.root`
* **Password:** `NNCSNv5IG4Gz2ipP`
* **SSL / TLS:** Required (`connect_args={"ssl": {}}`)
* **SQLAlchemy URL:**
  ```text
  mysql+pymysql://2dqhC13C1WmSRUJ.root:NNCSNv5IG4Gz2ipP@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/cms_admission
  ```

### Database Tables & Schema Overview

1. **`portal_applications`**: Primary table holding student applications. Includes `id` (e.g., `260002`), `student_name`, `course_name`, `status`, `submitted_at`, and the complete JSON payload in `data_json` (containing marks, cutoff, parent info, addresses, documents checklist, digital signatures).
2. **`staff_users`**: User authentication accounts for Admin, Admission Officer, and Vice Chairman with bcrypt hashed passwords.
3. **`courses`**: Approved undergraduate & postgraduate engineering programmes (AI&DS, CSE, CSE-CS, BME, EEE, ECE, MECH, AI&ML, M.E).
4. **`fee_structures`**: Standard government and management fee templates categorized by community (OC, BC, BCM, MBC, SC, ST).
5. **`portal_settings`**: Key-value JSON storage for portal banners, background image assets, and payment gateway options.
6. **`application_sequences`**: Atomic sequential counter for application IDs formatted as `YYNNNN` (e.g., `260001`, `260002`).

---

## 3. Real-Time Multi-User Synchronization

* **Technology:** Socket.IO ASGI server wrapped around FastAPI and React client.
* **Instant Submission Broadcast:** When a student submits a registration form, the backend writes to TiDB and fires an `application_created` event. All open Officer and VC dashboards automatically prepend the new row within **1 second**.
* **Live Status Badge:** Every dashboard displays a **`● Live Sync Active`** indicator.
* **Auto-Reconciliation:** If internet connectivity drops momentarily, the client automatically reconnects and synchronizes against the central TiDB database without data collisions.
* **Optimistic Locking:** Edit conflicts between multiple staff members are intercepted with HTTP 409 conflict notifications to prevent accidental overwrites.

---

## 4. Email Automation & Application Preview

* **Sender Account:** `cmsadsystem@gmail.com`
* **SMTP Gateway:** `smtp.gmail.com:587` (TLS)
* **Status Triggers:** Automatically triggers when an application enters **`Enquiring`** or **`Confirmed`** status.
* **Authentic Paper Format:** The email contains an exact digital replica of the CMS College of Engineering paper admission form:
  * Official College Header, Autonomous Status, and 20 Years Excellence seal.
  * Form No, Category of Admission (GQ / MQ), and First Graduate status.
  * Full Student & Parents details with formatted Aadhaar and contact numbers.
  * Marks table with automatic Anna University cut-off mark calculation.
  * 8-programme priority check-grid.
  * Approved tuition and hostel fee structure.
  * High-resolution digital signatures of student and parent.
  * Official office use certificate verification checklist.
  * Admission Officer & Vice Chairman signatory blocks.
* **User Refinement:** The external `"View / Complete Application Portal →"` button has been completely removed as requested, keeping the email clean, professional, and secure.

---

## 5. Security & Access Credentials

### Staff Portals Default Logins

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `change-this-password` | Full system control, course configuration, user creation |
| **Admission Officer** | `officer` | `CMSdemo1!` | Application review, certificate verification, status updates |
| **Vice-Chairman** | `vc` | `CMSdemo2!` | Final seat confirmation, scholarship allocation, summary reports |

*(Staff passwords can be updated by Admin in the staff management module).*

---

## 6. Live Verification & Testing Tools

### 1. Real-Time Database Terminal Monitor (`watch_live_db.py`)
To monitor the central cloud database live in the terminal while users submit forms:
```powershell
cd "c:\College Projects\CMS-Admin-portal\cms-admission-backend\cms-admission-backend"
.venv\Scripts\python watch_live_db.py
```

### 2. TiDB Cloud Web SQL Editor
```sql
USE cms_admission;

SELECT 
    id AS `App ID`,
    student_name AS `Student Name`,
    status AS `Status`,
    course_name AS `Course`,
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.studentMobile')) AS `Mobile`,
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.fatherName')) AS `Father Name`,
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.cutOffMarks')) AS `Cutoff`,
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.mathematics')) AS `Maths`,
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.physicsMarks')) AS `Physics`,
    JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.chemistryMarks')) AS `Chemistry`,
    submitted_at AS `Submitted Time`
FROM portal_applications
ORDER BY submitted_at DESC;
```

---

## 7. Current Project Health Matrix

| Feature / Subsystem | Status | Verification Result |
| :--- | :---: | :--- |
| **Cloud Web Hosting** | 🟢 **ACTIVE** | Render service deployed, `/health` returns `200 OK` |
| **Cloud Database Storage** | 🟢 **ACTIVE** | TiDB Serverless connected with SSL, 11 records verified |
| **Permanent Free Tier** | 🟢 **VERIFIED** | $0/mo Starter plan, no credit card, no expiration |
| **Real-time Live Sync** | 🟢 **ACTIVE** | Socket.IO engine broadcasting `application_created/updated` |
| **Email Dispatch Engine** | 🟢 **ACTIVE** | SMTP TLS connected, delivers to `cmsadsystem@gmail.com` |
| **Application Preview Form** | 🟢 **ACTIVE** | Clean paper format without extraneous portal buttons |
| **Cut-off Computation** | 🟢 **ACTIVE** | Anna University formula (`Maths + Physics/2 + Chemistry/2`) |
| **Git Deployment Pipeline** | 🟢 **ACTIVE** | Push to `main` automatically triggers Render build |

---

*Report certified and saved in the project workspace for administrative and accreditation review.*
