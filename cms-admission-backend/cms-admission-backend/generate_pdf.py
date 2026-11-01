import os
import subprocess
import sys

HTML_CONTENT = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Project Current Status - CMS College of Engineering</title>
<style>
  @page {
    size: A4 portrait;
    margin: 16mm 14mm 16mm 14mm;
    @bottom-center {
      content: "Page " counter(page);
    }
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.45;
    font-size: 11pt;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }

  .header-card {
    border: 2px solid #006747;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 20px;
    background: #f0fdf4;
    text-align: center;
  }

  .header-card h1 {
    margin: 0;
    color: #006747;
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .header-card .sub-title {
    margin: 4px 0 0;
    font-size: 11pt;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: 0.5px;
  }

  .header-card .autonomous {
    margin: 4px 0 0;
    font-size: 9pt;
    font-weight: 700;
    color: #006747;
  }

  .header-card .address {
    margin: 3px 0 0;
    font-size: 8.5pt;
    color: #475569;
  }

  .badge-live {
    display: inline-block;
    background: #006747;
    color: #ffffff;
    font-weight: 700;
    font-size: 9.5pt;
    padding: 4px 12px;
    border-radius: 12px;
    margin-top: 8px;
  }

  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 9.5pt;
  }

  .meta-table th, .meta-table td {
    padding: 6px 10px;
    border: 1px solid #cbd5e1;
  }

  .meta-table th {
    background-color: #f8fafc;
    color: #334155;
    width: 25%;
    text-align: left;
    font-weight: 600;
  }

  .meta-table td {
    color: #0f172a;
  }

  h2 {
    color: #006747;
    font-size: 13.5pt;
    font-weight: 700;
    border-bottom: 2px solid #006747;
    padding-bottom: 4px;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }

  h3 {
    color: #0f172a;
    font-size: 11pt;
    font-weight: 700;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }

  p, li {
    font-size: 10pt;
    color: #334155;
    margin-top: 0;
    margin-bottom: 8px;
  }

  .status-tag {
    display: inline-block;
    background: #dcfce7;
    color: #15803d;
    font-size: 8.5pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px;
    font-size: 9pt;
    page-break-inside: avoid;
  }

  .data-table th, .data-table td {
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    text-align: left;
  }

  .data-table th {
    background-color: #006747;
    color: #ffffff;
    font-weight: 700;
  }

  .data-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }

  .code-block {
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-left: 4px solid #006747;
    padding: 8px 12px;
    font-family: Consolas, "Courier New", monospace;
    font-size: 8.5pt;
    color: #0f172a;
    border-radius: 4px;
    margin: 8px 0;
    word-break: break-all;
    white-space: pre-wrap;
  }

  .card-box {
    border: 1px solid #cbd5e1;
    background: #fdfdfd;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }

  .page-break {
    page-break-before: always;
  }

  .footer-sig {
    margin-top: 30px;
    width: 100%;
    page-break-inside: avoid;
  }

  .footer-sig td {
    border: none;
    padding: 10px;
    text-align: center;
    vertical-align: bottom;
  }

  .sig-line {
    width: 180px;
    border-top: 1px solid #475569;
    margin: 0 auto;
    padding-top: 4px;
    font-weight: 700;
    font-size: 9pt;
    color: #1e293b;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-card">
    <h1>Project Current Status</h1>
    <div class="sub-title">CMS COLLEGE OF ENGINEERING — DIGITAL ADMISSION PORTAL</div>
    <div class="autonomous">(AUTONOMOUS INSTITUTION — AFFILIATED TO ANNA UNIVERSITY & APPROVED BY AICTE)</div>
    <div class="address">CMS Nagar, Ernapuram Post, Near Collectorate, Namakkal - 637 003, Tamil Nadu</div>
    <div><span class="badge-live">● SYSTEM STATUS: 100% OPERATIONAL & PRODUCTION LIVE</span></div>
  </div>

  <!-- META OVERVIEW TABLE -->
  <table class="meta-table">
    <tr>
      <th>Project Title</th>
      <td><strong>Project Current Status</strong></td>
      <th>Report Version</th>
      <td>v2.4.0 (Production Master)</td>
    </tr>
    <tr>
      <th>Operational Condition</th>
      <td><span class="status-tag">🟢 ACTIVE & FULLY VERIFIED</span></td>
      <th>Report Compiled On</th>
      <td>November 1, 2026</td>
    </tr>
    <tr>
      <th>Live Production Web URL</th>
      <td colspan="3"><a href="https://cms-admin-system-nvoj.onrender.com" style="color: #006747; font-weight: bold;">https://cms-admin-system-nvoj.onrender.com</a></td>
    </tr>
    <tr>
      <th>Source Code Repository</th>
      <td colspan="3"><a href="https://github.com/cmsadsystem-ai/CMS-ADMIN-PORTAL" style="color: #006747;">https://github.com/cmsadsystem-ai/CMS-ADMIN-PORTAL</a> (branch: <code>main</code>)</td>
    </tr>
    <tr>
      <th>Central Cloud Database</th>
      <td colspan="3"><strong>TiDB Cloud Serverless MySQL</strong> — Permanent Free Forever ($0/month, No 30-Day Expiry)</td>
    </tr>
    <tr>
      <th>Live Real-Time Engine</th>
      <td colspan="3"><strong>Socket.IO WebSockets + ASGI</strong> — Zero-Refresh Live Dashboard Synchronization</td>
    </tr>
  </table>

  <!-- 1. EXECUTIVE SUMMARY -->
  <h2>1. Executive Summary</h2>
  <p>The <strong>CMS College of Engineering Admission & Admin Portal</strong> is a cloud-native, autonomous web management system engineered to automate student registration, calculate Anna University engineering cut-off marks in real-time, deliver synchronized administrative review dashboards for staff, dispatch official print-accurate paper application emails, and persist all admission records into a permanent central cloud database.</p>
  <p>All temporary trial limitations (such as the 30-day Aiven MySQL trial) have been completely eliminated by deploying <strong>TiDB Cloud Serverless MySQL</strong>. The software requires $0.00/month to operate and is permanently stable for institutional deployment.</p>

  <!-- 2. HOSTING & DEPLOYMENT ECOSYSTEM -->
  <h2>2. Hosting & Deployment Ecosystem (Render)</h2>
  <div class="card-box">
    <p><strong>Hosting Architecture:</strong> Deployed as a single unified web service container on <strong>Render Cloud (Singapore Region)</strong> for ultra-low latency access in Tamil Nadu and South India.</p>
    <ul>
      <li><strong>Frontend Layer:</strong> High-performance React SPA built with Vite, serving static distribution bundles.</li>
      <li><strong>Backend Layer:</strong> Python 3.11 with FastAPI ASGI and Uvicorn server.</li>
      <li><strong>Automated Pipeline:</strong> Any commit pushed to the GitHub <code>main</code> branch automatically triggers a zero-downtime production deployment via <code>render.yaml</code> Blueprint.</li>
    </ul>
  </div>

  <!-- 3. CENTRAL DATABASE STATUS -->
  <h2>3. Central Cloud Database Status (Permanent Free TiDB MySQL)</h2>
  <p>Connected to <strong>TiDB Cloud Serverless MySQL</strong> (AWS Singapore Region). It provides 5 GB of permanent free relational storage with zero recurring fees and no trial expiration.</p>
  
  <div class="code-block">Host: gateway01.ap-southeast-1.prod.aws.tidbcloud.com
Port: 4000
Database: cms_admission
User: 2dqhC13C1WmSRUJ.root
Password: NNCSNv5IG4Gz2ipP
SSL Mode: Required (TLS enabled)
Connection URI: mysql+pymysql://2dqhC13C1WmSRUJ.root:NNCSNv5IG4Gz2ipP@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/cms_admission</div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Table Name</th>
        <th style="width: 20%;">Primary Key</th>
        <th>Purpose & Managed Fields</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>portal_applications</strong></td>
        <td><code>id</code> (e.g. 260002)</td>
        <td>Stores student admission applications, marks, status, timestamps, and full 100% form data in <code>data_json</code>.</td>
      </tr>
      <tr>
        <td><strong>staff_users</strong></td>
        <td><code>id</code></td>
        <td>Manages administrative logins for System Admin, Admission Officer, and Vice Chairman (bcrypt passwords).</td>
      </tr>
      <tr>
        <td><strong>courses</strong></td>
        <td><code>id</code> / <code>code</code></td>
        <td>Approved UG & PG engineering programmes (AI&DS, CSE, CSE-CS, BME, EEE, ECE, MECH, AI&ML, M.E).</td>
      </tr>
      <tr>
        <td><strong>fee_structures</strong></td>
        <td><code>id</code></td>
        <td>Standard government & management fee rates categorized by community (OC, BC, BCM, MBC, SC, ST).</td>
      </tr>
      <tr>
        <td><strong>application_sequences</strong></td>
        <td><code>year</code> (2026)</td>
        <td>Atomic counter guaranteeing clean sequential application numbering formatted as <code>YYNNNN</code>.</td>
      </tr>
      <tr>
        <td><strong>portal_settings</strong></td>
        <td><code>key</code></td>
        <td>JSON key-value storage for payment settings, campus backgrounds, and banners.</td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK FOR CLEAN PRINTING -->
  <div class="page-break"></div>

  <!-- 4. REAL-TIME MULTI-USER SYNCHRONIZATION -->
  <h2>4. Real-Time Multi-User Synchronization Status (Socket.IO)</h2>
  <div class="card-box">
    <p><strong>Zero-Refresh Real-Time Architecture:</strong> When any applicant or staff submits an admission form:</p>
    <ol>
      <li>The application is atomically saved in the central TiDB Cloud database.</li>
      <li>The server emits a real-time <code>application_created</code> or <code>application_updated</code> WebSocket event across <code>staff_channel</code> and <code>vc_channel</code>.</li>
      <li>All open Admission Officer and Vice Chairman dashboards receive the event and <strong>instantly add or update the record within 1 second — without anyone having to press F5 or refresh the page!</strong></li>
      <li><strong>Optimistic Concurrency Control:</strong> Conflicting simultaneous edits are intercepted with HTTP 409 conflict checks to guarantee data integrity.</li>
      <li><strong>Auto-Reconciliation:</strong> When a device's internet drops and reconnects, it automatically reconciles against TiDB Cloud.</li>
    </ol>
  </div>

  <!-- 5. EMAIL AUTOMATION & APPLICATION PREVIEW -->
  <h2>5. Email Automation & Application Preview Status</h2>
  <table class="meta-table">
    <tr>
      <th>Relay Engine</th>
      <td>Google Gmail SMTP (TLS encrypted port 587)</td>
      <th>Sender Account</th>
      <td><code>cmsadsystem@gmail.com</code></td>
    </tr>
    <tr>
      <th>Triggers</th>
      <td>Dispatched on Status: <strong>Enquiring</strong> and <strong>Confirmed</strong></td>
      <th>Recipient</th>
      <td>Applicant Email + CC to Admissions Desk</td>
    </tr>
  </table>

  <p><strong>Authentic Digital Paper Application Format:</strong> The generated email body replicates the original physical CMS admission form:</p>
  <ul>
    <li>Official Autonomous College Header & 20 Years Educational Excellence Seal.</li>
    <li>Consultant & Organization identification block.</li>
    <li>Student & Parent profiles with formatted Aadhaar and contact numbers.</li>
    <li>Academic performance marks table (Maths, Physics, Chemistry, Cut-off, Total).</li>
    <li>8-programme preference check grid with official Anna University course names.</li>
    <li>Approved tuition & hostel fee breakdown table.</li>
    <li>High-resolution digital signatures of Student and Parent.</li>
    <li>Office Use verification checklist (Original & Xerox certificates).</li>
    <li>Official signatory lines for <strong>Admission Officer</strong> and <strong>Vice-Chairman</strong>.</li>
    <li><strong>Refinement:</strong> External portal view buttons have been cleanly removed for an authentic official document appearance.</li>
  </ul>

  <!-- 6. ANNA UNIVERSITY CUTOFF MARK COMPUTATION -->
  <h2>6. Academic Formula & Cut-Off Computation</h2>
  <div class="card-box">
    <p>The system enforces Anna University's official engineering cutoff formula implemented in <code>app/cutoff.py</code>:</p>
    <div style="text-align: center; font-size: 13pt; font-weight: bold; color: #006747; margin: 10px 0;">
      Cut-off = Mathematics + (Physics / 2) + (Chemistry / 2)
    </div>
    <p style="text-align: center; font-size: 9pt; color: #64748b;">(Evaluated out of 200 marks, rounded to 2 decimal places)</p>
  </div>

  <!-- 7. MASTER CREDENTIALS DIRECTORY -->
  <h2>7. Master Credentials Directory</h2>

  <h3>A. Staff Web Portal Logins</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th>Role</th>
        <th>Username</th>
        <th>Default Password</th>
        <th>Access Level</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>System Administrator</strong></td>
        <td><code>admin</code></td>
        <td><code>change-this-password</code></td>
        <td>Master system setup, courses, fees, and staff accounts.</td>
      </tr>
      <tr>
        <td><strong>Admission Officer</strong></td>
        <td><code>officer</code></td>
        <td><code>CMSdemo1!</code></td>
        <td>Intake reviews, certificate verification, and status updates.</td>
      </tr>
      <tr>
        <td><strong>Vice-Chairman (VC)</strong></td>
        <td><code>vc</code></td>
        <td><code>CMSdemo2!</code></td>
        <td>Quota tracking, scholarship approval, and final admission authorization.</td>
      </tr>
    </tbody>
  </table>

  <h3>B. Infrastructure & Services Credentials</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th>Service</th>
        <th>Host / Resource</th>
        <th>Username</th>
        <th>Credentials / Secret</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>TiDB Cloud MySQL</strong></td>
        <td><code>gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000</code></td>
        <td><code>2dqhC13C1WmSRUJ.root</code></td>
        <td><code>NNCSNv5IG4Gz2ipP</code></td>
      </tr>
      <tr>
        <td><strong>Gmail SMTP Relay</strong></td>
        <td><code>smtp.gmail.com:587</code></td>
        <td><code>cmsadsystem@gmail.com</code></td>
        <td><code>ohhl usqb hwso fjco</code> (App Password)</td>
      </tr>
      <tr>
        <td><strong>GitHub Repository</strong></td>
        <td><code>cmsadsystem-ai / CMS-ADMIN-PORTAL</code></td>
        <td><code>cmsadsystem-ai</code></td>
        <td>Personal Access Token / SSH</td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE BREAK FOR CLEAN PRINTING -->
  <div class="page-break"></div>

  <!-- 8. COST & LIFETIME HOSTING EFFICIENCY -->
  <h2>8. Cost & Lifetime Hosting Efficiency</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>Platform Component</th>
        <th>Hosting Provider</th>
        <th>Free Allocation Quota</th>
        <th>Monthly Cost</th>
        <th>Permanence Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Full-Stack Application</strong></td>
        <td>Render Cloud</td>
        <td>512 MB RAM / 0.1 CPU</td>
        <td><strong>$0.00</strong></td>
        <td>Active / Permanent Free</td>
      </tr>
      <tr>
        <td><strong>Relational Database</strong></td>
        <td>TiDB Serverless</td>
        <td>5,000 MB (5 GB Storage)</td>
        <td><strong>$0.00</strong></td>
        <td><strong>Permanent Free Forever (No 30-Day Limit)</strong></td>
      </tr>
      <tr>
        <td><strong>Email SMTP Relay</strong></td>
        <td>Google Gmail</td>
        <td>500 emails / day</td>
        <td><strong>$0.00</strong></td>
        <td>Permanent / Included</td>
      </tr>
      <tr>
        <td><strong>Source Control & CI/CD</strong></td>
        <td>GitHub</td>
        <td>Unlimited Public/Private Repos</td>
        <td><strong>$0.00</strong></td>
        <td>Permanent / Included</td>
      </tr>
      <tr style="font-weight: bold; background: #e6f4ea;">
        <td colspan="3">TOTAL MONTHLY OPERATIONAL COST</td>
        <td><strong>$0.00 / mo</strong></td>
        <td><strong>100% Free Lifetime Operation</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- 9. OPERATIONAL RUNBOOKS & VERIFICATION -->
  <h2>9. Operational Runbooks & Live Verification</h2>

  <h3>Runbook 1: Real-Time Terminal Cloud Database Watcher</h3>
  <p>To observe student registrations stream live in the terminal without opening any web browser:</p>
  <div class="code-block">cd "c:\College Projects\CMS-Admin-portal\cms-admission-backend\cms-admission-backend"
.venv\Scripts\python watch_live_db.py</div>
  <p><em>Flashes automatically on the terminal whenever a new submission is written to TiDB Cloud.</em></p>

  <h3>Runbook 2: Querying Detailed Student Records in TiDB SQL Editor</h3>
  <p>In TiDB Cloud Console (<code>tidbcloud.com</code>) &rarr; <code>cms-admission-db</code> &rarr; <strong>SQL Editor</strong>:</p>
  <div class="code-block">USE cms_admission;

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
ORDER BY submitted_at DESC;</div>

  <!-- 10. CONCLUSION & OFFICIAL SIGN-OFF -->
  <h2>10. Conclusion & Official Sign-Off</h2>
  <p>The <strong>CMS College of Engineering Admission & Admin Portal</strong> has achieved full technical and operational maturity. It eliminates physical paperwork delays, synchronizes admissions across administrative staff in real-time, guarantees zero data collision, and is backed by a robust, permanent free cloud database architecture.</p>

  <table class="footer-sig">
    <tr>
      <td style="width: 33%;">
        <div style="height: 40px;"></div>
        <div class="sig-line">SYSTEM ARCHITECT / DEVELOPER</div>
      </td>
      <td style="width: 33%;">
        <div style="height: 40px;"></div>
        <div class="sig-line">ADMISSION OFFICER</div>
      </td>
      <td style="width: 33%;">
        <div style="height: 40px;"></div>
        <div class="sig-line">VICE-CHAIRMAN</div>
      </td>
    </tr>
  </table>

</body>
</html>
"""

def generate_pdf():
    workspace = r"c:\College Projects\CMS-Admin-portal"
    html_path = os.path.join(workspace, "Project_Current_Status.html")
    pdf_path = os.path.join(workspace, "Project_Current_Status.pdf")
    
    print("Writing printable HTML...")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(HTML_CONTENT)
    print(f"HTML written to {html_path}")
    
    chrome_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]
    
    browser_exe = None
    for p in chrome_paths:
        if os.path.exists(p):
            browser_exe = p
            break
            
    if not browser_exe:
        print("ERROR: Neither Chrome nor Edge executable was found.")
        sys.exit(1)
        
    print(f"Generating PDF using {browser_exe}...")
    cmd = [
        browser_exe,
        "--headless",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        html_path
    ]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"SUCCESS: PDF created successfully at {pdf_path} ({size_kb:.1f} KB)")
    else:
        print(f"ERROR: Failed to create PDF. Stdout: {res.stdout}, Stderr: {res.stderr}")
        sys.exit(1)

if __name__ == "__main__":
    generate_pdf()
