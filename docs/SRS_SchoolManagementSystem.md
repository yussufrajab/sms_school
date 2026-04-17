# Software Requirements Specification (SRS)
## School Management System (SMS)

---

| Field | Details |
|---|---|
| **Document Version** | 1.0.0 |
| **Status** | Draft |
| **Date** | March 01, 2026 |
| **Prepared By** | Software Engineering Team |
| **Standard** | IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018 |

---

## Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 0.1 | 2026-03-01 | Engineering Team | Initial Draft |
| 1.0 | 2026-03-01 | Engineering Team | Full SRS Release |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [User Roles and Characteristics](#3-user-roles-and-characteristics)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [System Architecture & Technology Stack](#6-system-architecture--technology-stack)
7. [External Interface Requirements](#7-external-interface-requirements)
8. [Database Design Considerations](#8-database-design-considerations)
9. [Assumptions and Dependencies](#9-assumptions-and-dependencies)
10. [Appendices](#10-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document describes the complete requirements for the **School Management System (SMS)**. It is intended to serve as the authoritative reference for all stakeholders including developers, testers, project managers, system administrators, and school administrators. The document follows the IEEE Std 830-1998 format and covers functional requirements, non-functional requirements, system constraints, and external interface specifications.

### 1.2 Scope

The School Management System (SMS) is a comprehensive web-based platform designed to digitize and centralize the management of all academic, administrative, financial, and communicative operations of a school. The system enables multi-role access for school administrators, teachers, students, parents, finance officers, librarians, and IT administrators.

The system will:
- Automate student enrollment, attendance, grading, and academic record management.
- Facilitate real-time communication between parents, teachers, and school administrators.
- Handle financial operations including fee collection, payroll processing, and reporting.
- Manage library inventory, transport routing, and staff HR workflows.
- Provide an analytics dashboard with insights on academic and operational performance.
- Store documents and media securely via MinIO object storage.

The system will **not** cover:
- Third-party learning management systems (LMS) such as Moodle or Google Classroom (integration points only).
- Standalone mobile applications (responsive web app only in v1.0).

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| SMS | School Management System |
| SRS | Software Requirements Specification |
| IEEE | Institute of Electrical and Electronics Engineers |
| API | Application Programming Interface |
| ORM | Object Relational Mapper |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| MFA | Multi-Factor Authentication |
| S3 | Simple Storage Service (Amazon), used as protocol by MinIO |
| CRUD | Create, Read, Update, Delete |
| UI | User Interface |
| UX | User Experience |
| NFR | Non-Functional Requirement |
| FR | Functional Requirement |
| SSR | Server-Side Rendering |
| ISR | Incremental Static Regeneration |
| CSR | Client-Side Rendering |
| ER | Entity Relationship |
| DB | Database |
| TLS | Transport Layer Security |
| WCAG | Web Content Accessibility Guidelines |
| GDPR | General Data Protection Regulation |
| FERPA | Family Educational Rights and Privacy Act |

### 1.4 References

- IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications
- ISO/IEC/IEEE 29148:2018: Systems and software engineering — Requirements engineering
- Next.js 15 Documentation: https://nextjs.org/docs
- Auth.js v5 Documentation: https://authjs.dev
- Prisma ORM Documentation: https://www.prisma.io/docs
- MinIO Documentation: https://min.io/docs
- shadcn/ui Documentation: https://ui.shadcn.com
- Radix UI Documentation: https://www.radix-ui.com
- Zustand Documentation: https://zustand-demo.pmnd.rs
- WCAG 2.1 Guidelines: https://www.w3.org/TR/WCAG21/

### 1.5 Overview

This document is structured as follows:
- **Section 2** provides an overall description of the product, its context, and constraints.
- **Section 3** defines all user roles and their characteristics.
- **Section 4** details all functional requirements organized by module.
- **Section 5** covers all non-functional requirements.
- **Section 6** describes the system architecture and chosen technology stack.
- **Section 7** covers external interface requirements.
- **Section 8** discusses database design considerations.
- **Section 9** lists assumptions and dependencies.
- **Section 10** includes appendices with supporting material.

---

## 2. Overall Description

### 2.1 Product Perspective

The School Management System is a **standalone, web-based, full-stack application** built using the Next.js 15 App Router framework. It is designed as a centralized platform that replaces fragmented manual or semi-digital school processes with an integrated digital solution.

The system interacts with:
- **PostgreSQL** as the primary relational database (managed through Prisma ORM).
- **MinIO** as the object storage backend for files, documents, and media.
- **Auth.js v5 (NextAuth)** for authentication and session management.
- **External email/SMS gateways** for notifications.
- **Payment gateways** (e.g., Stripe, Paystack) for online fee collection.

The system operates in a **client-server architecture**, where:
- The Next.js frontend renders UI on both server (SSR/ISR) and client (CSR) as appropriate.
- Next.js API Routes serve as the backend, handling all business logic and data access.
- Prisma ORM abstracts all database interactions with type-safe query builders.

### 2.2 Product Functions (Summary)

The SMS provides the following high-level capabilities:

1. **Authentication & Access Control** — Secure login, session management, RBAC.
2. **Student Management** — Registration, profiles, enrollment, transfers.
3. **Academic Management** — Classes, subjects, timetables, assignments, exams, results.
4. **Attendance Management** — Daily tracking, reporting, parent notifications.
5. **Fee & Finance Management** — Fee structure, invoicing, payments, payroll.
6. **Staff & HR Management** — Staff profiles, leave management, performance.
7. **Communication** — Announcements, messaging, notifications, events.
8. **Library Management** — Catalog, borrowing, returns, fines.
9. **Transport Management** — Routes, vehicles, student allocation.
10. **Reporting & Analytics** — Dashboards, custom reports, data exports.
11. **Document & File Management** — Secure file upload and retrieval via MinIO.

### 2.3 User Classes and Interactions

The system serves 9 distinct user classes (detailed in Section 3). Each user class interacts with a specific subset of modules based on RBAC policies.

### 2.4 Operating Environment

| Component | Environment |
|---|---|
| **Runtime** | Node.js 20+ (LTS) |
| **Frontend Framework** | Next.js 15 (App Router), React 19 |
| **Styling** | Tailwind CSS v3+ |
| **Backend** | Next.js API Routes (RESTful) |
| **Database** | PostgreSQL 15+ |
| **ORM** | Prisma ORM 6.19.1 |
| **Object Storage** | MinIO (S3-compatible) |
| **Authentication** | Auth.js v5 (NextAuth) |
| **State Management** | Zustand 4.5.4 |
| **UI Library** | shadcn/ui + Radix UI |
| **Hosting** | Docker / Cloud (AWS, Azure, DigitalOcean, or On-Premise) |
| **OS (Server)** | Ubuntu 22.04 LTS or equivalent Linux distribution |
| **Browser Support** | Chrome 120+, Firefox 120+, Edge 120+, Safari 17+ |

### 2.5 Design and Implementation Constraints

- All API routes must be implemented within the Next.js App Router's `/app/api` directory.
- All database migrations must be managed exclusively through Prisma migrations.
- File uploads must be routed through the Next.js API layer before being stored in MinIO — direct client-to-MinIO uploads are not permitted.
- Authentication must use Auth.js v5 session strategy with JWT tokens stored in secure, HTTP-only cookies.
- All UI components must be built with shadcn/ui primitives wrapping Radix UI, customized with Tailwind CSS utility classes.
- Global client-side state (e.g., current user, notifications, sidebar state) must be managed through Zustand stores.
- The application must be fully responsive and functional on viewports from 320px (mobile) to 1920px+ (large desktop).
- Environment secrets (database URLs, MinIO credentials, OAuth secrets) must never be committed to source control and must be injected via environment variables.

### 2.6 Assumptions and Dependencies

Refer to **Section 9** for full details.

---

## 3. User Roles and Characteristics

### 3.1 Super Administrator

**Description:** The highest-privilege user with unrestricted access to all modules, configurations, and data across the entire system. Typically an IT or senior management representative.

**Responsibilities:**
- Create and manage school profiles, branches, and academic years.
- Create, activate, deactivate, and delete user accounts of all roles.
- Configure system-wide settings (branding, timezone, grading scales, fee categories).
- Access all reports, logs, and analytics.
- Manage integrations and external service configurations.
- Review system audit logs and security events.

**Technical Proficiency:** High — comfortable with administrative dashboards and system configuration panels.

**Frequency of Use:** Daily during setup; periodic thereafter.

---

### 3.2 School Administrator

**Description:** Manages the day-to-day operations of the school. Typically a school principal or administrative officer.

**Responsibilities:**
- Manage student enrollment, class assignments, and academic calendars.
- Oversee staff records and HR workflows.
- Approve leave requests and monitor attendance.
- Send school-wide announcements and communications.
- View financial summaries and generate reports.
- Manage events, timetables, and academic configurations.

**Technical Proficiency:** Medium — comfortable with web-based dashboards.

**Frequency of Use:** Daily.

---

### 3.3 Teacher / Faculty

**Description:** Academic staff responsible for teaching specific subjects and managing their assigned classes.

**Responsibilities:**
- Record daily student attendance for their assigned classes.
- Create, assign, and grade assignments and homework.
- Create and manage exams, enter and publish grades.
- View class timetables and student profiles.
- Communicate with students and parents through the messaging module.
- Upload class materials and resources.

**Technical Proficiency:** Low to Medium.

**Frequency of Use:** Daily.

---

### 3.4 Student

**Description:** Currently enrolled learners in the school.

**Responsibilities:**
- View personal timetable, attendance records, and grades.
- Submit assignments and access study materials.
- View exam schedules and results.
- Check fee payment status and download fee receipts.
- Receive and read announcements and notifications.
- Access the library catalog and check borrowing history.

**Technical Proficiency:** Low to Medium — may include children as young as 10 years old, so UI must be simple and intuitive.

**Frequency of Use:** Daily.

---

### 3.5 Parent / Guardian

**Description:** Legal guardians of enrolled students who require visibility into their child's academic and administrative progress.

**Responsibilities:**
- Monitor their child's attendance, grades, and academic reports.
- Receive notifications about absences, results, and school events.
- View and pay outstanding fee invoices online.
- Communicate with teachers and school administration.
- Access term report cards and transcripts.

**Technical Proficiency:** Low — must be accessible without technical knowledge.

**Frequency of Use:** Weekly or upon notifications.

---

### 3.6 Accountant / Finance Officer

**Description:** Manages all financial transactions, invoicing, and reporting for the school.

**Responsibilities:**
- Configure fee structures, categories, and discount policies.
- Generate and send fee invoices to students/parents.
- Record manual payments and reconcile online payments.
- Process staff payroll and generate payslips.
- Generate financial reports (income, expenditure, defaulters).
- Manage petty cash and expense records.

**Technical Proficiency:** Medium — familiar with financial software.

**Frequency of Use:** Daily.

---

### 3.7 Librarian

**Description:** Manages the school library's physical and digital resources.

**Responsibilities:**
- Add, edit, and remove book and resource records in the catalog.
- Issue and return books; track due dates and overdue items.
- Calculate and collect fines for late returns.
- Generate borrowing reports and popular titles analysis.
- Manage digital resource links and e-book entries.

**Technical Proficiency:** Low to Medium.

**Frequency of Use:** Daily.

---

### 3.8 Receptionist / Front Desk Staff

**Description:** Manages incoming communications, visitor registration, and general enquiries.

**Responsibilities:**
- Register and manage visitor logs.
- Handle student admission enquiries.
- Record and forward incoming messages.
- Manage appointment scheduling.
- Assist in distributing announcements.

**Technical Proficiency:** Low.

**Frequency of Use:** Daily.

---

### 3.9 IT Administrator

**Description:** Manages the technical infrastructure of the system.

**Responsibilities:**
- Monitor server health, database performance, and storage usage.
- Manage user accounts, reset passwords, and review audit logs.
- Perform and verify database and storage backups.
- Configure integrations, API keys, and environment settings.
- Handle system updates and deployment pipelines.

**Technical Proficiency:** High.

**Frequency of Use:** Daily or on-demand.

---

## 4. Functional Requirements

> Each requirement is identified with a unique ID using the format: `FR-[MODULE]-[NUMBER]`

---

### 4.1 Authentication & Access Control Module

#### 4.1.1 User Authentication

**FR-AUTH-001:** The system shall allow users to register with an email address, full name, and a password that meets the defined complexity policy (minimum 8 characters, at least one uppercase letter, one number, and one special character).

**FR-AUTH-002:** The system shall authenticate users via email and password, using Auth.js v5 (NextAuth) with a credentials provider. Passwords must be hashed using **bcrypt** with a minimum cost factor of 12 before storage in PostgreSQL.

**FR-AUTH-003:** The system shall support OAuth 2.0 login via Google and Microsoft providers through Auth.js v5 for staff and administrator accounts.

**FR-AUTH-004:** The system shall implement session management using JWT tokens stored in secure, HTTP-only, SameSite=Strict cookies with a configurable expiry (default: 8 hours for standard sessions, 30 days for "remember me" sessions).

**FR-AUTH-005:** The system shall provide a "Forgot Password" workflow that sends a time-limited, single-use password reset link to the user's registered email address. Reset tokens must expire after 30 minutes.

**FR-AUTH-006:** The system shall support Multi-Factor Authentication (MFA) via Time-based One-Time Passwords (TOTP), using applications like Google Authenticator or Authy. MFA enrollment shall be optional for standard users but mandatory for Super Admin and IT Administrator roles.

**FR-AUTH-007:** The system shall lock a user account for 15 minutes after 5 consecutive failed login attempts and shall notify the account owner via email.

**FR-AUTH-008:** The system shall allow users to view and manage their active sessions (device, IP address, last activity) and remotely revoke any session from their profile settings page.

#### 4.1.2 Role-Based Access Control (RBAC)

**FR-AUTH-009:** The system shall enforce Role-Based Access Control (RBAC) where each user is assigned exactly one primary role from the set: `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`, `ACCOUNTANT`, `LIBRARIAN`, `RECEPTIONIST`, `IT_ADMIN`.

**FR-AUTH-010:** The system shall enforce route-level protection on all Next.js pages and API routes, verifying the user's session and role before granting access. Unauthenticated requests to protected routes shall be redirected to the login page with a 302 redirect.

**FR-AUTH-011:** The system shall enforce API-level authorization checks on every API route handler, returning HTTP 403 Forbidden for requests from users who lack the required role or permission.

**FR-AUTH-012:** The Super Admin shall be able to create custom permission sets and assign them to specific roles, overriding or extending default role permissions for granular access control.

**FR-AUTH-013:** The system shall maintain a permission matrix defining which roles can `CREATE`, `READ`, `UPDATE`, and `DELETE` records in each module. This matrix shall be configurable by the Super Admin.

#### 4.1.3 Audit Logging

**FR-AUTH-014:** The system shall log all authentication events (login success, login failure, logout, password reset, MFA setup/bypass) with a timestamp, user ID, IP address, and user agent.

**FR-AUTH-015:** The system shall log all data modification events (CREATE, UPDATE, DELETE) on critical entities (students, staff, fees, grades) with the actor's user ID, timestamp, entity type, entity ID, and a diff of changed fields.

**FR-AUTH-016:** Audit logs shall be immutable — no user, including Super Admin, shall be able to delete or modify audit log records through the application interface.

---

### 4.2 Student Management Module

**FR-STU-001:** The system shall allow school administrators to create a new student profile capturing the following mandatory fields: First Name, Last Name, Date of Birth, Gender, Nationality, Blood Group, Address (street, city, state, country), Phone Number, Emergency Contact Name and Phone, Enrollment Date, Assigned Class, and Section.

**FR-STU-002:** The system shall automatically generate a unique, sequential Student ID (e.g., `SMS-2026-00123`) upon student registration, following a configurable format set by the Super Admin.

**FR-STU-003:** The system shall allow uploading a student profile photograph, which is stored in MinIO under the `student-photos` bucket. Supported formats: JPEG, PNG, WebP. Maximum file size: 5 MB.

**FR-STU-004:** The system shall support attaching documents to a student's profile (e.g., birth certificate, immunization records, transfer certificate). Documents shall be stored in MinIO under the `student-documents` bucket with access restricted to authorized roles. Supported formats: PDF, JPEG, PNG. Maximum file size per document: 10 MB.

**FR-STU-005:** The system shall allow searching and filtering students by name, student ID, class, section, enrollment status (active, graduated, transferred, suspended, expelled), and academic year.

**FR-STU-006:** The system shall support student promotion — moving a batch of students from one class/grade to the next at the end of an academic year — with the option to selectively exclude students who failed or are repeating the year.

**FR-STU-007:** The system shall support student transfer — recording the transfer of a student out of the school (including transfer destination details) or into the school (including transfer origin details and previous academic records).

**FR-STU-008:** The system shall allow administrators to assign up to two parents/guardians to a student profile and link them to a parent portal account.

**FR-STU-009:** The system shall maintain a full academic history for each student across multiple academic years, including class, section, attendance summary, and grade summary per year.

**FR-STU-010:** The system shall allow administrators to set a student's status: `ACTIVE`, `GRADUATED`, `TRANSFERRED`, `SUSPENDED`, or `EXPELLED`. Suspended and expelled students shall not be able to log in to their portal.

---

### 4.3 Academic Management Module

#### 4.3.1 Class & Subject Configuration

**FR-ACAD-001:** The system shall allow administrators to define academic classes (e.g., Grade 1, Grade 2, Form 1) and sections (e.g., Section A, Section B) with a configurable maximum student capacity per section.

**FR-ACAD-002:** The system shall allow administrators to define subjects, including subject name, code, description, type (Core / Elective), credit hours, and the eligible classes for the subject.

**FR-ACAD-003:** The system shall allow assigning one or more teachers to a subject-class-section combination, forming a teaching assignment record.

**FR-ACAD-004:** The system shall allow administrators to define academic years with a defined start date, end date, and a list of terms/semesters within the year. Only one academic year can be marked as `CURRENT` at a time.

#### 4.3.2 Timetable Management

**FR-ACAD-005:** The system shall provide a visual timetable builder interface where administrators can create weekly schedules for each class and section, assigning periods to subjects, teachers, and classrooms.

**FR-ACAD-006:** The system shall detect and prevent scheduling conflicts — e.g., the same teacher assigned to two different classes at the same time, or the same classroom double-booked — and display a descriptive error to the administrator.

**FR-ACAD-007:** The system shall display a personalized timetable to each teacher (showing only their assigned periods) and each student (showing their class's timetable).

**FR-ACAD-008:** The system shall support substitute teacher assignment for a specific date/period when the assigned teacher is absent, without modifying the master timetable.

#### 4.3.3 Assignment & Homework Management

**FR-ACAD-009:** Teachers shall be able to create assignments with the following fields: title, description, subject, assigned class/section, due date, maximum marks, and optional file attachments (stored in MinIO under `assignment-files` bucket).

**FR-ACAD-010:** Students shall be able to view all assignments assigned to their class/section, submit text-based responses or file uploads (PDF, DOCX, images — max 20 MB per submission), and view the submission deadline countdown.

**FR-ACAD-011:** The system shall prevent students from submitting assignments after the due date has passed, unless the teacher explicitly enables late submissions for that assignment with a configurable late submission penalty.

**FR-ACAD-012:** Teachers shall be able to view all submissions for an assignment, grade each submission (numeric marks and written feedback), and return grades to students.

**FR-ACAD-013:** The system shall send an automated notification to students and their linked parents 24 hours before an assignment is due, via the in-app notification system and email.

#### 4.3.4 Examination & Results Management

**FR-ACAD-014:** Administrators and teachers shall be able to create exam records with the following fields: exam name, academic year, term, start date, end date, and the list of subjects included in the exam.

**FR-ACAD-015:** For each exam-subject combination, teachers shall be able to configure the maximum marks, passing marks, exam date, start time, duration (in minutes), and venue/room.

**FR-ACAD-016:** Teachers shall be able to enter and save student marks for each subject in an exam via a marks entry interface displaying the class roster, maximum marks, and passing marks.

**FR-ACAD-017:** The system shall automatically calculate: total marks obtained, percentage, grade (based on configurable grading scale), and rank within the class for each student after all marks are entered.

**FR-ACAD-018:** The system shall support a configurable grading scale (e.g., A+ = 90-100, A = 80-89, etc.) that can be set per academic level by the Super Admin.

**FR-ACAD-019:** The system shall generate a printable/downloadable PDF report card for each student per exam, displaying: student details, subject-wise marks, grade, total, percentage, class rank, and teacher/principal signature fields. Report cards shall be stored in MinIO and accessible to students and parents.

**FR-ACAD-020:** Administrators shall be able to publish or unpublish exam results. Students and parents shall only see results after they are published.

---

### 4.4 Attendance Management Module

**FR-ATT-001:** Teachers shall be able to mark daily attendance for each student in their assigned class/section via a date-selectable roster interface showing: student photo, name, and attendance status buttons (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`).

**FR-ATT-002:** The system shall default attendance status to `ABSENT` until marked, and shall prevent marking attendance for a future date.

**FR-ATT-003:** The system shall allow teachers to edit attendance records for the current day up to a configurable cutoff time (e.g., 2:00 PM). Post-cutoff edits shall require School Admin or Super Admin approval.

**FR-ATT-004:** The system shall automatically send an in-app notification and email to the parent/guardian of a student marked `ABSENT` or `LATE` on the same day by 10:00 AM (school local time, configurable).

**FR-ATT-005:** The system shall support staff attendance marking by school administrators or the IT Admin, capturing: staff member, date, check-in time, check-out time, and status (`PRESENT`, `ABSENT`, `ON_LEAVE`, `HALF_DAY`).

**FR-ATT-006:** The system shall generate attendance reports at multiple levels: per student (daily/monthly/term), per class (daily/monthly), per teacher, and school-wide. Reports shall be exportable as PDF and CSV.

**FR-ATT-007:** The system shall display an attendance summary on the student's and parent's dashboard showing: total school days, days present, days absent, attendance percentage, and a monthly calendar heatmap visualization.

**FR-ATT-008:** The system shall flag students whose attendance falls below a configurable threshold (e.g., 75%) and alert the school administrator and the student's parent via email and in-app notification.

---

### 4.5 Fee & Finance Management Module

#### 4.5.1 Fee Structure Configuration

**FR-FIN-001:** The Finance Officer and School Admin shall be able to define fee categories (e.g., Tuition Fee, Library Fee, Transport Fee, Sports Fee, Examination Fee) with a name, description, and whether it is recurring (term/yearly) or one-time.

**FR-FIN-002:** The system shall allow defining fee structures per class/grade and academic year, specifying the amount for each applicable fee category.

**FR-FIN-003:** The system shall support fee discounts — configurable as a fixed amount or percentage — applicable to individual students (e.g., scholarship discount) or groups (e.g., sibling discount, staff ward discount).

**FR-FIN-004:** The system shall support late payment penalty rules — a fixed amount or percentage added to overdue invoices after a configurable grace period.

#### 4.5.2 Invoice Generation & Payment

**FR-FIN-005:** The system shall auto-generate fee invoices for all active students at the start of each term/semester based on the applicable fee structure, with a configurable due date.

**FR-FIN-006:** Each invoice shall display: invoice number, student details, fee breakdown (category, amount, discount, net amount), total amount due, due date, and payment status (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).

**FR-FIN-007:** The system shall allow the Finance Officer to manually record cash or bank transfer payments against an invoice, updating the payment status accordingly.

**FR-FIN-008:** The system shall integrate with a payment gateway (configurable: Stripe or Paystack) to allow parents and students to pay fees online via credit/debit card or mobile money. Payment status shall update automatically upon confirmed payment via webhook.

**FR-FIN-009:** Upon full payment, the system shall automatically generate and email a PDF payment receipt to the parent/student and store it in MinIO under the `fee-receipts` bucket.

**FR-FIN-010:** The system shall send automated payment reminders to parents/students with outstanding invoices: 7 days before the due date, on the due date, and every 3 days after the due date until the invoice is paid or marked as escalated.

**FR-FIN-011:** The system shall generate a defaulters list — a report of all students with unpaid or overdue invoices — filterable by class, term, and academic year. Exportable as PDF and CSV.

#### 4.5.3 Payroll Management

**FR-FIN-012:** The Finance Officer shall be able to define salary structures for each staff category (e.g., Teacher, Administrative Staff) with components: basic salary, housing allowance, transport allowance, and configurable deductions (tax, pension, health insurance).

**FR-FIN-013:** The system shall generate monthly payroll for all active staff, applying the applicable salary structure, and accounting for leave deductions (unpaid leave days).

**FR-FIN-014:** The Finance Officer shall be able to review, adjust, and approve the monthly payroll before processing. An approved payroll shall be locked and non-editable.

**FR-FIN-015:** Upon payroll processing, the system shall generate individual payslips in PDF format for each staff member, stored in MinIO under the `payslips` bucket and accessible to the respective staff member from their profile.

#### 4.5.4 Financial Reporting

**FR-FIN-016:** The system shall provide a financial dashboard showing: total fee income collected (current term/year), outstanding fee balances, total payroll expenses, and net balance — visualized with Recharts bar and line charts.

**FR-FIN-017:** The system shall generate the following financial reports, exportable as PDF and Excel:
  - Fee Collection Report (by class, term, or academic year)
  - Outstanding Fees Report
  - Payroll Summary Report (monthly/yearly)
  - Expense Report
  - Income vs. Expenditure Report

---

### 4.6 Staff & HR Management Module

**FR-HR-001:** Administrators shall be able to create staff profiles capturing: full name, employee ID (auto-generated), date of birth, gender, nationality, contact information, address, emergency contact, employment start date, department, designation, employment type (`FULL_TIME`, `PART_TIME`, `CONTRACT`), and qualifications.

**FR-HR-002:** The system shall generate a unique Employee ID (e.g., `EMP-2026-0045`) automatically upon staff registration.

**FR-HR-003:** Staff members shall be able to apply for leave through the system, specifying: leave type (`ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `UNPAID`, `EMERGENCY`), start date, end date, reason, and optional supporting document (stored in MinIO).

**FR-HR-004:** Leave applications shall follow a configurable approval workflow: submitted by staff → reviewed by department head or School Admin → approved or rejected by School Admin. Each state transition shall trigger an email and in-app notification to the applicant.

**FR-HR-005:** The system shall maintain a leave balance record per staff member, tracking: total entitled days per leave type per year, days used, and days remaining. Leave balance shall update automatically when a leave application is approved.

**FR-HR-006:** Administrators shall be able to record and view staff performance evaluations per academic term, including: evaluation criteria (configurable), numeric scores, written comments, and overall rating.

**FR-HR-007:** The system shall generate a staff directory listing all active staff with their name, photo, designation, department, and contact information, searchable and filterable by department and designation.

---

### 4.7 Communication & Notification Module

**FR-COM-001:** Administrators and teachers shall be able to post announcements targeting: all users, all staff, all students, a specific class, a specific role, or an individual user. Announcements shall support rich text content and optional file attachments.

**FR-COM-002:** The system shall maintain an in-app notification center accessible from the top navigation bar, showing unread notification count as a badge. Notifications shall be marked as read individually or all at once.

**FR-COM-003:** The system shall support direct messaging between users. Teachers and School Admins shall be able to initiate conversations with any user. Students and parents shall be able to initiate conversations with their assigned teachers and school administrators only.

**FR-COM-004:** The system shall send transactional email notifications for critical events including: new user account creation (with login credentials), password reset requests, fee invoice generation, payment confirmation, attendance alerts, exam result publication, leave application status updates, and assignment due date reminders.

**FR-COM-005:** The system shall support optional SMS notification delivery for attendance alerts and fee payment reminders, via integration with a configurable SMS gateway (e.g., Twilio or Africa's Talking). SMS delivery shall be a fallback when the parent has no registered email.

**FR-COM-006:** Administrators shall be able to create and manage a school event calendar, adding events with: title, description, date, time, location, category (holiday, exam, sports, cultural, meeting), and visibility (all/staff-only/students-only).

**FR-COM-007:** Students and parents shall see upcoming school events on their dashboard with a countdown to the next event. All users shall be notified of events 3 days in advance via in-app notification.

---

### 4.8 Library Management Module

**FR-LIB-001:** The Librarian shall be able to add book records to the catalog with: ISBN, title, author(s), publisher, year of publication, edition, category/genre, number of copies available, shelf location, cover image (stored in MinIO under `library-covers`), and an optional link to a digital version.

**FR-LIB-002:** The system shall support book search and filtering by title, author, ISBN, category, and availability status (available / checked out).

**FR-LIB-003:** The Librarian shall be able to issue a book to a student or staff member, recording: book ID, borrower ID, borrow date, and expected return date (auto-calculated based on a configurable loan period, default: 14 days).

**FR-LIB-004:** The system shall track borrowing history per book and per user (student/staff), displaying: book title, borrow date, return date, and fine paid.

**FR-LIB-005:** The system shall calculate overdue fines automatically — configurable as a daily rate per book (e.g., $0.10 per day). Fines shall accrue from the day after the expected return date.

**FR-LIB-006:** The Librarian shall be able to record a book return, which shall update the book's availability status and calculate any outstanding fine.

**FR-LIB-007:** The system shall send automated overdue reminders to borrowers: 1 day before the due date, on the due date, and every 2 days after the due date until the book is returned.

**FR-LIB-008:** The system shall generate library reports including: most borrowed books, active borrowers, overdue books list, and fine collection summary. Exportable as PDF and CSV.

---

### 4.9 Transport Management Module

**FR-TRP-001:** Administrators shall be able to define transport routes with: route name/code, starting point, endpoint, list of stops (with estimated pickup/drop-off times), and assigned vehicle.

**FR-TRP-002:** Administrators shall be able to manage the vehicle fleet, recording: vehicle registration number, make, model, year, capacity, driver assigned, and current status (`ACTIVE`, `UNDER_MAINTENANCE`, `RETIRED`).

**FR-TRP-003:** Administrators shall be able to record driver profiles with: full name, license number, license expiry date, contact number, and assigned vehicle.

**FR-TRP-004:** Administrators shall be able to assign students to a specific route and stop. A student can only be assigned to one active route at a time.

**FR-TRP-005:** Students and parents shall be able to view their assigned route, stop, estimated pickup and drop-off times, vehicle registration number, and driver contact number from the transport section of their portal.

**FR-TRP-006:** The system shall alert the administrator when a driver's license is within 30 days of expiry, via the in-app notification system and email.

---

### 4.10 Reporting & Analytics Module

**FR-REP-001:** The system shall provide a role-specific dashboard for each user role displaying relevant KPIs, quick-access widgets, and recent activity feeds upon login.

**FR-REP-002:** The Super Admin and School Admin dashboards shall display: total enrollment, today's attendance rate, outstanding fees total, number of active staff, upcoming events, and recent system activity.

**FR-REP-003:** The system shall provide a report builder interface where admins can select a report type, apply filters (date range, class, academic year, etc.), preview the report, and export it as PDF or Excel.

**FR-REP-004:** All charts and graphs in the analytics module shall be rendered using **Recharts** (integrated within the React/Next.js frontend), and shall support interactive tooltips, legends, and responsive sizing.

**FR-REP-005:** The system shall support data export in the following formats from any data table in the application: CSV, Excel (XLSX), and PDF.

---

### 4.11 Document & File Management Module

**FR-DOC-001:** All file uploads in the system (student documents, assignment files, report cards, payslips, library covers, etc.) shall be stored in MinIO using the S3-compatible API. Each bucket shall correspond to a specific document category with appropriate access policies.

**FR-DOC-002:** Files shall be organized within MinIO buckets using a structured key naming convention: `{bucket}/{entity_type}/{entity_id}/{year}/{filename}`.

**FR-DOC-003:** The system shall generate pre-signed URLs with a configurable expiry time (default: 15 minutes) for all file downloads, preventing unauthorized direct access to MinIO objects.

**FR-DOC-004:** The system shall enforce file type whitelisting and maximum file size limits (configurable by Super Admin, with per-bucket defaults) at the API route level before uploading to MinIO. Rejected files shall return a descriptive error message.

**FR-DOC-005:** Administrators shall be able to view, download, and delete files associated with any entity through the relevant module's document management panel.

---

## 5. Non-Functional Requirements

> Each requirement is identified with the format: `NFR-[CATEGORY]-[NUMBER]`

---

### 5.1 Performance Requirements

**NFR-PERF-001:** The application's initial page load (Largest Contentful Paint — LCP) shall be under **3 seconds** on a standard broadband connection (25 Mbps) for 95% of page loads, as measured by Google Lighthouse.

**NFR-PERF-002:** All Next.js API route responses for data queries shall return within **2 seconds** under normal load (up to 200 concurrent users), as measured by server-side response time logs.

**NFR-PERF-003:** The system shall support a minimum of **500 concurrent active users** without degradation in response times beyond the thresholds defined in NFR-PERF-001 and NFR-PERF-002.

**NFR-PERF-004:** Database queries generated by Prisma ORM shall be optimized — using indexed columns for all filter and sort operations — and shall complete within **500ms** for 95% of queries under normal load.

**NFR-PERF-005:** File uploads to MinIO shall stream via the Next.js API layer and shall not block the main application thread. Upload progress shall be displayed to the user in real time using client-side progress indicators.

**NFR-PERF-006:** The system shall implement server-side and client-side caching strategies:
  - Next.js Route Cache and Full Route Cache for static and semi-static pages (ISR with configurable revalidation intervals).
  - Zustand stores shall cache frequently accessed client-side state to minimize redundant API calls.
  - PostgreSQL query results for heavy reports shall be cached in memory (via Next.js `unstable_cache` or equivalent) with a configurable TTL (default: 5 minutes).

---

### 5.2 Scalability Requirements

**NFR-SCAL-001:** The system shall be deployable in a horizontally scalable architecture — multiple Next.js application instances behind a load balancer — without any session affinity (sticky sessions) requirement, as Auth.js JWT-based sessions are stateless.

**NFR-SCAL-002:** The database connection pool (managed by Prisma) shall be configurable (default: 10 connections per instance) and shall use **PgBouncer** or equivalent connection pooling middleware when deployed at scale to prevent connection exhaustion.

**NFR-SCAL-003:** The MinIO storage layer shall be configurable to operate in distributed mode (multiple MinIO nodes in an erasure-coded cluster) to support storage scaling without data loss risk.

**NFR-SCAL-004:** The system architecture shall support multi-school (multi-tenant) deployment through database-level tenant isolation using a `school_id` foreign key on all tenant-scoped entities, ensuring strict data separation between schools on a shared deployment.

---

### 5.3 Availability & Reliability Requirements

**NFR-AVAIL-001:** The system shall maintain a minimum uptime of **99.9%** (excluding scheduled maintenance windows), equivalent to no more than 8.7 hours of unplanned downtime per year.

**NFR-AVAIL-002:** The system shall implement automated database backups via PostgreSQL `pg_dump` scheduled daily, with retention of the last 30 daily backups and the last 12 weekly backups. Backup files shall be stored in a dedicated MinIO bucket (`db-backups`) separate from application data.

**NFR-AVAIL-003:** MinIO object storage shall be configured with erasure coding or replication to ensure **data durability of 99.999999999% (11 nines)**, preventing data loss from hardware failure.

**NFR-AVAIL-004:** The system shall implement health-check endpoints (`/api/health` and `/api/health/db`) that return system status including: database connectivity, MinIO connectivity, and application version. These endpoints shall be used by load balancers and monitoring tools for liveness and readiness probes.

**NFR-AVAIL-005:** The system shall implement graceful error handling on all API routes — returning structured JSON error responses with an HTTP status code, error code, and human-readable message. Unhandled server errors shall be caught by a global error boundary and logged without exposing stack traces to the client.

---

### 5.4 Security Requirements

**NFR-SEC-001:** All data transmitted between the client browser and the Next.js server shall be encrypted using **TLS 1.2 or higher** (HTTPS). HTTP traffic shall be redirected to HTTPS automatically. The server's TLS certificate shall be a valid, CA-signed certificate (e.g., Let's Encrypt).

**NFR-SEC-002:** All user passwords shall be hashed using **bcrypt** with a minimum cost factor of 12. The system shall never store, log, or transmit plaintext passwords.

**NFR-SEC-003:** The system shall implement protection against the **OWASP Top 10** web vulnerabilities, including:
  - **SQL Injection:** Prevented by Prisma's parameterized queries (no raw SQL with user input).
  - **Cross-Site Scripting (XSS):** Prevented by React's automatic output encoding and Content Security Policy (CSP) headers.
  - **Cross-Site Request Forgery (CSRF):** Prevented by Auth.js CSRF token validation on all mutating requests.
  - **Broken Access Control:** Mitigated by RBAC enforcement at both route and API levels (FR-AUTH-010, FR-AUTH-011).
  - **Security Misconfiguration:** Mitigated by enforcing security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) via Next.js `next.config.js`.

**NFR-SEC-004:** All sensitive configuration values (database URL, MinIO credentials, OAuth client secrets, JWT secrets, payment gateway API keys) shall be stored exclusively as environment variables and shall never be hardcoded in source code or committed to version control. The `.env` file shall be listed in `.gitignore`.

**NFR-SEC-005:** MinIO bucket policies shall be configured to **deny public access** to all buckets by default. All file access shall occur through pre-signed URLs generated by the application server (FR-DOC-003).

**NFR-SEC-006:** The system shall implement **rate limiting** on authentication endpoints (`/api/auth/signin`, `/api/auth/forgot-password`) to prevent brute-force attacks. Rate limits: maximum 10 requests per IP per minute on login, maximum 5 requests per IP per 15 minutes on password reset.

**NFR-SEC-007:** The system shall comply with applicable data protection regulations (**GDPR** for EU-based deployments, **FERPA** for US-based deployments). This includes: the right to access personal data, the right to request data deletion, data minimization in collection, and clear privacy policy disclosure.

**NFR-SEC-008:** Personally identifiable information (PII) fields in the database (e.g., national ID numbers, medical information) shall be encrypted at the application layer using **AES-256** before storage, in addition to the database-level encryption.

---

### 5.5 Usability Requirements

**NFR-USE-001:** The user interface shall be fully responsive, correctly rendering and functioning on screen widths from **320px (mobile)** to **1920px (large desktop)**. Breakpoints shall follow Tailwind CSS's default responsive breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px).

**NFR-USE-002:** The application shall comply with **WCAG 2.1 Level AA** accessibility standards, including: sufficient color contrast ratios (minimum 4.5:1 for normal text), keyboard navigability of all interactive elements, ARIA labels on all icon-only buttons, and focus management in modals and dialogs.

**NFR-USE-003:** All Radix UI primitives and shadcn/ui components used in the application shall preserve their built-in accessibility features (keyboard navigation, focus trapping in dialogs, ARIA attributes) and shall not be overridden in a way that reduces accessibility.

**NFR-USE-004:** The system shall display user-friendly, actionable error messages for all form validation failures, API errors, and permission denials. Error messages shall be presented inline in forms (using shadcn/ui `FormMessage` component) or as toast notifications for non-form errors.

**NFR-USE-005:** The system shall support **dark mode and light mode** theming, controlled by a user preference setting stored in the user's profile. The theme preference shall persist across sessions. Theming shall be implemented using Tailwind CSS's `dark:` variant and CSS custom properties.

**NFR-USE-006:** A new school administrator shall be able to complete the initial school setup (create school profile, configure academic year, add a class, and enroll the first student) within **30 minutes** without requiring external documentation, guided by an onboarding wizard.

**NFR-USE-007:** The application shall support **internationalization (i18n)** for UI text using `next-intl` or equivalent, with initial support for English (en) and a language switcher in the UI for future language additions.

---

### 5.6 Maintainability Requirements

**NFR-MAINT-001:** The codebase shall follow a consistent directory structure based on Next.js 15 App Router conventions:
  - `/app` — Pages, layouts, and API routes.
  - `/components` — Reusable React components organized by feature module.
  - `/lib` — Utility functions, Prisma client singleton, MinIO client, auth configuration.
  - `/store` — Zustand store definitions.
  - `/prisma` — Prisma schema file and migration history.
  - `/types` — TypeScript type definitions and interfaces.
  - `/hooks` — Custom React hooks.

**NFR-MAINT-002:** All source code shall be written in **TypeScript (strict mode enabled)**. No `any` types shall be used without explicit justification in a code review. Prisma-generated types shall be used for all database entity interfaces.

**NFR-MAINT-003:** All database schema changes shall be managed exclusively through **Prisma migrations** (`prisma migrate dev` for development, `prisma migrate deploy` for production). Direct manual schema changes to the PostgreSQL database are prohibited.

**NFR-MAINT-004:** The system shall achieve a minimum of **70% unit test coverage** on all API route handlers and utility functions, using **Jest** and **React Testing Library**.

**NFR-MAINT-005:** All Zustand stores shall be modularized — one store per feature domain (e.g., `useAuthStore`, `useStudentStore`, `useNotificationStore`) — to prevent a single monolithic global state object.

**NFR-MAINT-006:** All environment-specific configuration shall be centralized in `.env.local` (development) and `.env.production` (production) files, with a `.env.example` file committed to source control documenting all required environment variable keys (without values).

---

### 5.7 Portability Requirements

**NFR-PORT-001:** The application shall be fully containerized using **Docker**. A `Dockerfile` for the Next.js application and a `docker-compose.yml` file orchestrating the Next.js app, PostgreSQL, and MinIO services shall be provided.

**NFR-PORT-002:** The `docker-compose.yml` shall allow a developer to start the full development environment (app + database + storage) with a single `docker-compose up` command, with no additional manual configuration required beyond copying `.env.example` to `.env.local`.

**NFR-PORT-003:** The system shall be deployable on any Linux-based cloud provider (AWS, Azure, GCP, DigitalOcean) or on-premise server running Ubuntu 22.04 LTS or later, without platform-specific code modifications.

---

### 5.8 Compliance Requirements

**NFR-COMP-001:** The system shall comply with **GDPR** requirements where applicable, including: providing a mechanism for users to export all their personal data (Data Subject Access Request — DSAR), providing a mechanism for account deletion and data anonymization, and maintaining a record of data processing activities.

**NFR-COMP-002:** Student academic records, attendance data, and personal information shall be retained per configurable data retention policies. Records for graduated or departed students shall be archived (read-only access) for a configurable number of years (default: 7 years) before scheduled deletion.

**NFR-COMP-003:** The system shall log all data export and deletion activities in the audit log (FR-AUTH-015) to maintain a compliance trail.

---

## 6. System Architecture & Technology Stack

### 6.1 Architecture Overview

The SMS follows a **monolithic full-stack architecture** using Next.js 15, where:
- **Frontend rendering** is handled by Next.js Server Components (for SSR/ISR) and Client Components (for interactive UI).
- **Backend logic** is implemented in Next.js API Routes (`/app/api/...`) following RESTful conventions.
- **Data access** is abstracted through the Prisma ORM layer, which generates type-safe query builders for PostgreSQL.
- **File storage** is handled by a MinIO S3-compatible server, accessed exclusively through the Next.js API layer.
- **Authentication** state is managed by Auth.js v5, with JWT sessions in HTTP-only cookies.
- **Client-side global state** is managed by Zustand stores hydrated from server-fetched data.

### 6.2 Technology Stack Details

#### 6.2.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 15 (App Router) | Full-stack React framework, SSR, ISR, routing |
| **React** | 19 | UI rendering, Server/Client Component model |
| **Tailwind CSS** | 3.x | Utility-first CSS styling |
| **shadcn/ui** | Latest | Pre-built, customizable React component library |
| **Radix UI** | Latest | Accessible, headless UI primitives used by shadcn/ui |
| **Zustand** | 4.5.4 | Lightweight client-side global state management |
| **Recharts** | Latest | Chart/graph components for analytics dashboards |
| **React Hook Form** | Latest | Performant form state management with validation |
| **Zod** | Latest | Schema validation for forms and API inputs |
| **next-intl** | Latest | Internationalization (i18n) support |

#### 6.2.2 Backend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js API Routes** | 15 | RESTful backend endpoints within the Next.js framework |
| **Prisma ORM** | 6.19.1 | Type-safe database access, migrations, schema management |
| **Auth.js (NextAuth)** | v5 | Authentication: credentials, OAuth, JWT sessions |
| **Zod** | Latest | Input validation on all API routes |
| **bcrypt** | Latest | Password hashing |
| **Nodemailer / Resend** | Latest | Transactional email delivery |

#### 6.2.3 Database & Storage

| Technology | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 15+ | Primary relational database |
| **MinIO** | Latest | S3-compatible object storage for all file uploads |
| **PgBouncer** | Latest | PostgreSQL connection pooling (production) |

#### 6.2.4 DevOps & Infrastructure

| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Containerization and local dev environment |
| **GitHub Actions** | CI/CD pipeline for automated testing and deployment |
| **Jest + React Testing Library** | Unit and integration testing |
| **ESLint + Prettier** | Code quality and formatting |
| **Husky + lint-staged** | Pre-commit hooks for linting and formatting |

### 6.3 Data Flow Diagram (Textual)

```
Browser (React 19 / Next.js Client Components)
        │
        ▼ HTTP/HTTPS (TLS)
Next.js Server (App Router)
  ├── Server Components (SSR/ISR) ──────────────┐
  ├── Client Components (CSR via Zustand) ──────┤
  └── API Routes (/app/api/*)                   │
        │                                        │
        ├── Auth.js v5 (Session Validation)      │
        ├── Zod (Input Validation)               │
        ├── Prisma ORM ──────────────────────────┤──► PostgreSQL 15+
        └── MinIO SDK ───────────────────────────┤──► MinIO Object Storage
                                                 │
                                          Nodemailer/Resend
                                          SMS Gateway (Twilio)
                                          Payment Gateway (Stripe/Paystack)
```

---

## 7. External Interface Requirements

### 7.1 User Interface Requirements

**UI-001:** The application shall use a consistent layout shell: a fixed top navigation bar (with global search, notification bell, and user avatar menu) and a collapsible left sidebar with role-appropriate navigation links.

**UI-002:** All data tables shall use shadcn/ui `DataTable` (built on TanStack Table) with support for: server-side pagination, column sorting, column filtering, row selection, and row actions dropdown menus.

**UI-003:** All modal dialogs shall use Radix UI `Dialog` primitives wrapped by shadcn/ui `Dialog` components, with focus trapping and ESC key dismissal.

**UI-004:** All form inputs shall use shadcn/ui `Form`, `Input`, `Select`, `Checkbox`, `RadioGroup`, `DatePicker`, and `Textarea` components with integrated React Hook Form validation and Zod schemas.

**UI-005:** All file upload inputs shall display an upload progress bar and a preview/file name confirmation after successful upload.

### 7.2 Hardware Interfaces

The system does not have direct hardware interface requirements in version 1.0. Future versions may integrate with:
- Biometric devices (fingerprint scanners for attendance) via a hardware bridge API.
- RFID card readers for library book checkout.
- GPS tracking devices for transport management.

### 7.3 Software Interfaces

**SI-001 — PostgreSQL:** The system interfaces with PostgreSQL exclusively through the Prisma ORM client. Direct database connections from the application layer without Prisma are not permitted.

**SI-002 — MinIO:** The system interfaces with MinIO using the AWS S3 SDK (with `endpoint` overridden to MinIO's address), through a centralized MinIO client utility (`/lib/minio.ts`).

**SI-003 — Email Gateway:** The system interfaces with an SMTP server (via Nodemailer) or the Resend API for transactional email delivery. The email provider is configurable via environment variables.

**SI-004 — SMS Gateway:** The system interfaces with Twilio or Africa's Talking via their REST API SDKs for SMS delivery. The SMS provider is configurable via environment variables.

**SI-005 — Payment Gateway:** The system interfaces with Stripe or Paystack for online fee payments. Payment gateway selection is configurable per school. Webhook handlers shall be implemented for payment confirmation events.

**SI-006 — OAuth Providers:** The system interfaces with Google and Microsoft identity providers via Auth.js v5 OAuth adapters for social login.

### 7.4 Communication Interfaces

- All client-server communication shall occur over **HTTPS (TLS 1.2+)**.
- API responses shall be in **JSON** format with consistent structure: `{ success: boolean, data?: any, error?: { code: string, message: string } }`.
- Real-time notifications shall be implemented using **Server-Sent Events (SSE)** via a Next.js API route (`/api/notifications/stream`), providing a lightweight push mechanism without requiring a separate WebSocket server.
- Payment webhook payloads from Stripe/Paystack shall be received over HTTPS POST and shall be verified using the respective gateway's signature verification mechanism.

---

## 8. Database Design Considerations

### 8.1 Core Entities (Prisma Schema Modules)

The Prisma schema shall be organized into the following logical entity groups:

#### Identity & Access
- `User` — Core authentication entity with role, email, hashed password, and status.
- `Session`, `Account`, `VerificationToken` — Auth.js required tables.
- `AuditLog` — Immutable system event log.

#### School Configuration
- `School` — School profile (name, logo, address, contact, timezone).
- `AcademicYear` — Academic year with start/end dates and active flag.
- `Term` — Academic terms/semesters within a year.
- `Class` — Grade/class definition.
- `Section` — Section within a class (linked to a class teacher).
- `Subject` — Subject definition with type and credit hours.

#### People
- `Student` — Student profile with FK to `User`, `Section`, and `School`.
- `Parent` — Parent/guardian profile with FK to `User` and linked `Student`s.
- `Staff` — Staff profile with FK to `User`, designation, and department.

#### Academic
- `TeachingAssignment` — Links `Staff` (teacher) to `Subject`, `Class`, `Section`.
- `Timetable` — Timetable slot with day, period, subject, teacher, room, and section.
- `Assignment` — Assignment with due date, max marks, and FK to `Subject`, `Section`.
- `AssignmentSubmission` — Student submission with file URL and grade.
- `Exam` — Exam event with FK to `AcademicYear` and `Term`.
- `ExamSubject` — Exam-subject configuration with marks and venue.
- `ExamResult` — Student marks per exam-subject with grade and rank.

#### Attendance
- `StudentAttendance` — Daily record per student per section.
- `StaffAttendance` — Daily record per staff member.

#### Finance
- `FeeCategory` — Fee type definition.
- `FeeStructure` — Fee amount per class and academic year.
- `FeeDiscount` — Discount rule per student or group.
- `Invoice` — Fee invoice per student per term.
- `InvoiceItem` — Line items per invoice.
- `Payment` — Payment record with method, amount, and status.
- `SalaryStructure` — Salary component definition per staff category.
- `Payroll` — Monthly payroll batch record.
- `PayrollItem` — Individual staff payroll calculation.

#### Communication
- `Announcement` — Rich text announcement with target audience.
- `Notification` — In-app notification per user.
- `Message` — Direct message between two users.
- `Event` — School calendar event.

#### Library
- `Book` — Book catalog record.
- `BookCopy` — Individual copy of a book (allows tracking multiple copies).
- `BorrowRecord` — Borrowing transaction with return date and fine.

#### Transport
- `Route` — Transport route with stops.
- `Vehicle` — Fleet vehicle record.
- `Driver` — Driver profile.
- `StudentTransport` — Assignment of student to route and stop.

#### Storage
- `FileRecord` — Metadata record for every file stored in MinIO (bucket, key, size, MIME type, uploader, upload date, linked entity).

### 8.2 Key Design Principles
- Every tenant-scoped entity shall include a `schoolId` field (FK to `School`) to support multi-tenancy.
- All tables shall include `createdAt` and `updatedAt` timestamp fields managed by Prisma's `@updatedAt` attribute.
- Soft deletion shall be implemented for critical entities (Student, Staff, Invoice) using a `deletedAt` nullable timestamp instead of physical deletion.
- All foreign key relationships shall enforce referential integrity at the database level via Prisma's `@relation` directive.
- Frequently queried columns (e.g., `email`, `studentId`, `schoolId`, `status`, `academicYearId`) shall be indexed using Prisma's `@@index` directive.

---

## 9. Assumptions and Dependencies

### 9.1 Assumptions

**A-001:** It is assumed that the school deploying this system has access to a reliable internet connection with minimum bandwidth of 10 Mbps for server-side operations and 5 Mbps for end-user clients.

**A-002:** It is assumed that all end users (staff, parents, students) have access to a modern web browser (Chrome 120+, Firefox 120+, Edge 120+, or Safari 17+) on a device capable of rendering responsive web applications.

**A-003:** It is assumed that the school provides valid email addresses for all staff and parent accounts, as email is the primary channel for critical transactional notifications.

**A-004:** It is assumed that the server infrastructure is managed and maintained by the school's IT department or a contracted hosting provider. The development team is responsible for the application code and deployment configuration only.

**A-005:** It is assumed that the initial school configuration (class structure, academic year, fee structure) will be performed by a trained School Administrator or Super Admin during the onboarding phase.

**A-006:** It is assumed that third-party services (email gateway, SMS gateway, payment gateway) are independently procured and configured by the school, and that valid API credentials are provided as environment variables.

### 9.2 Dependencies

**D-001:** The system is dependent on **Node.js 20 LTS** being available in the deployment environment. Changes to Node.js LTS support schedules may require application updates.

**D-002:** The system is dependent on **Prisma ORM 6.19.1** for all database interactions. Prisma's API stability is assumed; major version upgrades shall require a dedicated migration and testing cycle.

**D-003:** The system is dependent on **Auth.js v5** for authentication. Auth.js is in active development; patch updates shall be applied regularly, and breaking changes shall be assessed before upgrading.

**D-004:** The system is dependent on **MinIO** for object storage. If MinIO is replaced with a different S3-compatible service (e.g., AWS S3), only the MinIO client configuration in `/lib/minio.ts` and relevant environment variables shall need to be updated.

**D-005:** The system is dependent on the availability of external services (email, SMS, payment gateways). Downtime of these services will degrade but not break core system functionality (all features except real-time notifications and online payments will continue to function).

**D-006:** The system's UI components are dependent on the **shadcn/ui** component registry and **Radix UI** primitives. UI component updates shall be evaluated and applied selectively.

---

## 10. Appendices

### Appendix A: Requirement Traceability Matrix (RTM) — Summary

| Module | FR Count | NFR Count |
|---|---|---|
| Authentication & Access Control | 16 | 10 |
| Student Management | 10 | — |
| Academic Management | 20 | — |
| Attendance Management | 8 | — |
| Fee & Finance Management | 17 | — |
| Staff & HR Management | 7 | — |
| Communication & Notifications | 7 | — |
| Library Management | 8 | — |
| Transport Management | 6 | — |
| Reporting & Analytics | 5 | — |
| Document & File Management | 5 | — |
| **Performance** | — | 6 |
| **Scalability** | — | 4 |
| **Availability & Reliability** | — | 5 |
| **Security** | — | 8 |
| **Usability** | — | 7 |
| **Maintainability** | — | 6 |
| **Portability** | — | 3 |
| **Compliance** | — | 3 |
| **TOTAL** | **109 FRs** | **52 NFRs** |

---

### Appendix B: Glossary of System Statuses

| Entity | Status Values |
|---|---|
| Student | `ACTIVE`, `GRADUATED`, `TRANSFERRED`, `SUSPENDED`, `EXPELLED` |
| Staff | `ACTIVE`, `ON_LEAVE`, `RESIGNED`, `TERMINATED` |
| Invoice | `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `WAIVED` |
| Leave Application | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| Assignment Submission | `PENDING`, `SUBMITTED`, `LATE_SUBMISSION`, `GRADED` |
| Exam Results | `DRAFT`, `PUBLISHED` |
| Vehicle | `ACTIVE`, `UNDER_MAINTENANCE`, `RETIRED` |
| Book Copy | `AVAILABLE`, `BORROWED`, `LOST`, `DAMAGED` |
| User Account | `ACTIVE`, `INACTIVE`, `LOCKED`, `PENDING_VERIFICATION` |

---

### Appendix C: Default Configuration Values

| Configuration | Default Value | Configurable By |
|---|---|---|
| Session expiry (standard) | 8 hours | Super Admin |
| Session expiry (remember me) | 30 days | Super Admin |
| Password reset token expiry | 30 minutes | Super Admin |
| Account lockout threshold | 5 failed attempts | Super Admin |
| Account lockout duration | 15 minutes | Super Admin |
| Login rate limit | 10 requests/min/IP | IT Admin |
| Attendance cutoff for teacher edits | 2:00 PM (school local time) | School Admin |
| Attendance minimum threshold alert | 75% | School Admin |
| Library loan period | 14 days | Librarian |
| Library overdue fine rate | $0.10 per day | Librarian |
| Pre-signed URL expiry | 15 minutes | IT Admin |
| Report cache TTL | 5 minutes | IT Admin |
| DB backup retention (daily) | 30 days | IT Admin |
| DB backup retention (weekly) | 12 weeks | IT Admin |
| Student data archive period | 7 years | Super Admin |
| Payment reminder frequency (post-due) | Every 3 days | Finance Officer |
| Max file size (general upload) | 10 MB | Super Admin |
| Max file size (assignment submission) | 20 MB | Super Admin |
| Max file size (profile photo) | 5 MB | Super Admin |

---

*End of Software Requirements Specification — School Management System v1.0.0*

*This document is subject to revision. All changes must be reviewed and approved by the project's technical lead and recorded in the Revision History table.*
