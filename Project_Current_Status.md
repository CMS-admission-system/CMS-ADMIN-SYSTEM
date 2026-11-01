# Project Current Status
### CMS COLLEGE OF ENGINEERING
**AUTONOMOUS INSTITUTION — AFFILIATED TO ANNA UNIVERSITY & APPROVED BY AICTE**  
*CMS Nagar, Ernapuram Post, Near Collectorate, Namakkal - 637 003, Tamil Nadu*

---

| Parameter | Current Status / Value |
| :--- | :--- |
| **Project Title** | **Project Current Status** |
| **System Name** | CMS Digital Admission & Administrative Management Portal |
| **System Version** | `v2.4.0 (Production Live)` |
| **Last Updated** | November 1, 2026 |
| **Operational Condition** | 🟢 **100% OPERATIONAL & VERIFIED LIVE** |
| **Live Production Web URL** | [https://cms-admin-system-nvoj.onrender.com](https://cms-admin-system-nvoj.onrender.com) |
| **Source Code Repository** | [cmsadsystem-ai / CMS-ADMIN-PORTAL](https://github.com/cmsadsystem-ai/CMS-ADMIN-PORTAL) (`main` branch) |
| **Central Database** | **TiDB Cloud Serverless MySQL** (Permanent Free Forever) |
| **Hosting Platform** | **Render Cloud Platform** (Singapore Unified Web Service) |
| **Real-time Live Engine** | **Socket.IO ASGI + WebSockets** (Zero-Refresh Synchronization) |

---

## TABLE OF CONTENTS

1. [1. Executive Summary](#1-executive-summary)
2. [2. Hosting & Deployment Ecosystem (Render)](#2-hosting--deployment-ecosystem-render)
3. [3. Central Database Status (Permanent Free TiDB Cloud MySQL)](#3-central-database-status-permanent-free-tidb-cloud-mysql)
4. [4. Real-Time Multi-User Synchronization Status (Socket.IO)](#4-real-time-multi-user-synchronization-status-socketio)
5. [5. Email Automation & Application Preview Status](#5-email-automation--application-preview-status)
6. [6. Core Admission Modules & Features Status](#6-core-admission-modules--features-status)
7. [7. Data Security & Encryption Status](#7-data-security--encryption-status)
8. [8. Cost & Lifetime Hosting Efficiency](#8-cost--lifetime-hosting-efficiency)
9. [9. Master Credentials & Access Reference Directory](#9-master-credentials--access-reference-directory)
10. [10. Operational Runbooks & Live Verification](#10-operational-runbooks--live-verification)

---

## 1. Executive Summary

The **CMS College of Engineering Admission & Admin Portal** is an autonomous web platform providing digitized admission registration, instant Anna University engineering cutoff computations, real-time multi-device administrative review dashboards, print-accurate digital paper application emails, and centralized cloud persistence.

All temporary trial limitations (such as the 30-day Aiven MySQL trial) have been permanently resolved by deploying **TiDB Cloud Serverless MySQL**, ensuring a **100% life-time free, stable, and multi-user synchronized operational status**.

---

## 2. Hosting & Deployment Ecosystem (Render)

The application is deployed as a high-efficiency **Unified Web Service** on Render's Singapore region:

```mermaid
graph TD
    Client([Student / Parent / Staff Device]) -->|HTTPS / WSS| Edge[Cloudflare / Render Global Edge]
    Edge --> WebService[Render Service: cms-admin-system]
    
    subgraph Container [Render Unified Web Service Container]
        WebService --> SPA[Vite React Production Distribution]
        WebService --> ASGI[FastAPI + Socket.IO ASGI Server]
        ASGI --> Routers[Backend Micro-Routers]
        ASGI --> SocketEngine[Socket.IO Real-time Hub]
    end
    
    Routers -->|SSL Encrypted Port 4000| TiDB[(TiDB Serverless: cms_admission)]
    Routers -->|SMTP TLS Port 587| Gmail[Gmail Relay: cmsadsystem@gmail.com]
    
    SocketEngine <-->|Instant Event Push| OfficerPortal[Officer Dashboard Live]
    SocketEngine <-->|Instant Event Push| VCPortal[Vice-Chairman Dashboard Live]
    Gmail -->|Digital Application Preview| EmailRecipient([Student / Parent / Desk Inbox])
```

* **Service Identifier:** `cms-admin-system`
* **Region:** Singapore (`ap-southeast-1` — optimized for South India latency)
* **Build Command:** `bash build.sh` (Builds Vite React frontend into static assets & configures Python 3.11 FastAPI)
* **Start Command:** `cd cms-admission-backend/cms-admission-backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
* **Automated CI/CD:** Auto-deploys via GitHub `origin main` webhooks.

---

## 3. Central Database Status (Permanent Free TiDB Cloud MySQL)

The system is permanently connected to **TiDB Cloud Serverless MySQL**:

### Connection Parameters

```text
Host: gateway01.ap-southeast-1.prod.aws.tidbcloud.com
Port: 4000
Database: cms_admission
Username: 2dqhC13C1WmSRUJ.root
Password: NNCSNv5IG4Gz2ipP
SSL Mode: Required (TLS enabled)
Connection String: mysql+pymysql://2dqhC13C1WmSRUJ.root:NNCSNv5IG4Gz2ipP@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/cms_admission
```

### Verified Relational Tables

1. **`portal_applications`**: Stores all admission records with individual columns (`id`, `student_name`, `course_name`, `status`, `submitted_at`) and the complete 100% form data inside `data_json`.
2. **`staff_users`**: Manages user accounts for System Admin, Admission Officer, and Vice Chairman with bcrypt hashed passwords.
3. **`courses`**: Approved engineering programmes (AI&DS, CSE, CSE-CS, BME, EEE, ECE, MECH, AI&ML, M.E).
4. **`fee_structures`**: Approved community and scholarship fee templates (OC, BC, BCM, MBC, SC, ST).
5. **`portal_settings`**: Key-value JSON storage for portal banners, background image assets, and payment options.
6. **`application_sequences`**: Atomic sequential counter for application IDs formatted as `YYNNNN` (e.g., `260001`, `260002`).

*Status: 11 existing application records successfully migrated and verified live.*

---

## 4. Real-Time Multi-User Synchronization Status (Socket.IO)

* **Protocol:** WebSockets with HTTP long-polling fallback.
* **Channels:** `staff_channel`, `vc_channel`.
* **Zero-Refresh User Experience:**
  * When a student submits a registration form, the server broadcasts an `application_created` event.
  * All connected Officer and VC dashboards automatically insert the new row at the top of their screen within **1 second without pressing F5 or refreshing**.
* **Live Connection Indicator:** Displays **`● Live Sync Active`** on the top navigation bar.
* **Auto-Reconciliation:** Automatically synchronizes against the central TiDB database whenever network connectivity drops and reconnects.
* **Optimistic Concurrency Control:** Application edits track integer `version` numbers; simultaneous conflicting edits trigger an **HTTP 409 Conflict** prompt to prevent data overwrites.

---

## 5. Email Automation & Application Preview Status

* **Relay Gateway:** Gmail SMTP (`smtp.gmail.com:587` with TLS).
* **Sender Identity:** `cmsadsystem@gmail.com`.
* **Triggers:** Dispatched automatically upon application submission (`Enquiring`) and upon seat confirmation (`Confirmed`).
* **Authentic Digital Paper Replica:**
  * Official College Header, Autonomous Status, and 20 Years Excellence insignia.
  * Category of Admission (GQ / MQ), First Graduate indicator (Yes/No).
  * Personal, Academic, Parent, and Address details.
  * Anna University Cut-off marks and total marks table.
  * 8 approved engineering programmes priority selection grid.
  * Approved tuition and hostel fee schedule.
  * High-resolution digital signature captures of Student and Parent.
  * Office-use certificate verification checklist (Original & Xerox).
  * Signatory lines for Admission Officer and Vice-Chairman.
* **Refinement:** The external `"View / Complete Application Portal →"` button has been completely removed to preserve official paper format authenticity.

---

## 6. Core Admission Modules & Features Status

| Module | Route / File | Operational Status | Key Highlights |
| :--- | :--- | :---: | :--- |
| **Student Registration Portal** | `/register` | 🟢 **ACTIVE** | Multi-step form, live validation, digital signature canvas |
| **Anna University Cutoff Engine** | `app/cutoff.py` | 🟢 **ACTIVE** | Formula: $\text{Maths} + \frac{\text{Physics}}{2} + \frac{\text{Chemistry}}{2}$ |
| **Admission Officer Portal** | `/` (Officer login) | 🟢 **ACTIVE** | Real-time intake table, certificate verification, audit notes |
| **Vice-Chairman Portal** | `/` (VC login) | 🟢 **ACTIVE** | Quota overview, scholarship allocation, final approval |
| **Kiosk Mobile Upload Bridge** | `/kiosk`, `/upload` | 🟢 **ACTIVE** | QR code session generation for mobile document ingest |
| **Real-time Terminal Watcher** | `watch_live_db.py` | 🟢 **ACTIVE** | Live terminal streaming of new TiDB Cloud submissions |

---

## 7. Data Security & Encryption Status

* **Aadhaar Encryption:** Sensitive Aadhaar identification numbers are encrypted at rest using **Fernet 256-bit AES encryption** (`AADHAAR_ENC_KEY`).
* **Password Hashing:** Passwords use salted **bcrypt** cryptographic hashes.
* **Session Tokens:** Signed using **HS256 JWT** with configurable session lifespans.
* **Transport Encryption:** All endpoints enforce **HTTPS (TLS 1.3)** and database traffic enforces **SSL**.

---

## 8. Cost & Lifetime Hosting Efficiency

| Component | Platform | Resource Allocation | Monthly Cost | Permanence Guarantee |
| :--- | :--- | :--- | :---: | :--- |
| **Web Service Application** | Render Free | 512 MB RAM / 0.1 CPU | **$0.00** | Active / Permanent |
| **Relational Cloud Database** | TiDB Serverless | 5,000 MB (5 GB) | **$0.00** | **Permanent Free Forever (No 30-Day Limit)** |
| **Email SMTP Service** | Google Gmail | 500 emails / day | **$0.00** | Standard Free Quota |
| **Source Code Control** | GitHub | 1 GB storage | **$0.00** | Free Tier |
| **Total Operating Cost** | — | — | **$0.00 / mo** | **100% Free Lifetime Operation** |

---

## 9. Master Credentials & Access Reference Directory

### Staff Portals Login

| Role | Username | Password | Direct Portal URL |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `change-this-password` | [https://cms-admin-system-nvoj.onrender.com/](https://cms-admin-system-nvoj.onrender.com/) |
| **Admission Officer** | `officer` | `CMSdemo1!` | [https://cms-admin-system-nvoj.onrender.com/](https://cms-admin-system-nvoj.onrender.com/) |
| **Vice-Chairman** | `vc` | `CMSdemo2!` | [https://cms-admin-system-nvoj.onrender.com/](https://cms-admin-system-nvoj.onrender.com/) |

### TiDB Cloud Database Credentials

* **Web Console:** [https://tidbcloud.com/](https://tidbcloud.com/)
* **Cluster:** `cms-admission-db`
* **Host:** `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
* **Port:** `4000`
* **Username:** `2dqhC13C1WmSRUJ.root`
* **Password:** `NNCSNv5IG4Gz2ipP`
* **Database:** `cms_admission`

### Gmail SMTP Credentials

* **Host:** `smtp.gmail.com:587` (TLS)
* **Username & From:** `cmsadsystem@gmail.com`
* **App Password:** `ohhl usqb hwso fjco`

---

## 10. Operational Runbooks & Live Verification

### Runbook A: Real-Time Database Terminal Monitor
To observe database submissions live without opening any browser:
```powershell
cd "c:\College Projects\CMS-Admin-portal\cms-admission-backend\cms-admission-backend"
.venv\Scripts\python watch_live_db.py
```

### Runbook B: Querying Detailed Records in TiDB SQL Editor
Log in to [tidbcloud.com](https://tidbcloud.com/) &rarr; `cms-admission-db` &rarr; **SQL Editor**:
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
    submitted_at AS `Submission Time`
FROM portal_applications
ORDER BY submitted_at DESC;
```

---

*Report certified as the authoritative technical status reference for the CMS Admission & Admin Portal.*
