# School Management System (SMS) - Application Guide

## Table of Contents

- [Technologies Used](#technologies-used)
- [Database Configuration](#database-configuration)
- [User Roles & Credentials](#user-roles--credentials)
- [Login Methods](#login-methods)
- [Role Permissions Matrix](#role-permissions-matrix)
- [Database Schema Overview](#database-schema-overview)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Management Scripts (manage.sh)](#management-scripts-managesh)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)

---

## Technologies Used

### Core Framework & Runtime
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 15.5.12 | Full-stack React framework (App Router) |
| **React** | 19.1.0 | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Node.js** | 20+ | Server runtime |

### Database & ORM
| Technology | Version | Purpose |
|---|---|---|
| **PostgreSQL** | - | Primary relational database |
| **Prisma** | 7.4.2 | ORM & database client |
| **@prisma/adapter-pg** | 7.4.2 | PostgreSQL adapter for Prisma |
| **pg** | 8.19.0 | PostgreSQL driver |

### Authentication & Security
| Technology | Version | Purpose |
|---|---|---|
| **NextAuth.js (Auth.js)** | 5.0.0-beta.30 | Authentication framework |
| **@auth/prisma-adapter** | 2.11.1 | Prisma adapter for Auth.js |
| **bcryptjs** | 3.0.3 | Password hashing |

### UI & Styling
| Technology | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Radix UI** | 1.4.3 | Headless accessible UI primitives |
| **shadcn/ui** | 3.8.5 | Pre-built UI component library |
| **Lucide React** | 0.575.0 | Icon library |
| **next-themes** | 0.4.6 | Dark/light theme toggling |
| **class-variance-authority** | 0.7.1 | Component variant management |
| **cmdk** | 1.1.1 | Command palette component |

### Data Handling & Forms
| Technology | Version | Purpose |
|---|---|---|
| **React Hook Form** | 7.71.2 | Form state management |
| **Zod** | 4.3.6 | Schema validation |
| **@hookform/resolvers** | 5.2.2 | Zod resolver for RHF |
| **@tanstack/react-table** | 8.21.3 | Table component logic |
| **zustand** | 5.0.11 | Lightweight state management |

### Data Visualization & Export
| Technology | Version | Purpose |
|---|---|---|
| **Recharts** | 3.7.0 | Chart library |
| **jsPDF** | 4.2.0 | PDF generation |
| **jsPDF-AutoTable** | 5.0.7 | PDF table plugin |
| **xlsx** | 0.18.5 | Excel export/import |
| **date-fns** | 4.1.0 | Date manipulation |

### File Storage
| Technology | Version | Purpose |
|---|---|---|
| **MinIO (via AWS S3 SDK)** | 3.1000.0 | S3-compatible object storage |
| **@aws-sdk/s3-request-presigner** | 3.1000.0 | Presigned URL generation |
| **react-dropzone** | 15.0.0 | File upload UI |

### Communication
| Technology | Version | Purpose |
|---|---|---|
| **Nodemailer** | 7.0.13 | Email sending |
| **sonner** | 2.0.7 | Toast notifications |

### Internationalization
| Technology | Version | Purpose |
|---|---|---|
| **next-intl** | 4.8.3 | Internationalization support |

### Image Processing
| Technology | Version | Purpose |
|---|---|---|
| **sharp** | 0.34.5 | Server-side image processing |

### Development Tools
| Technology | Version | Purpose |
|---|---|---|
| **ESLint** | 9.x | Linting |
| **tsx** | 4.21.0 | TypeScript execution (seed script) |
| **tailwindcss/postcss** | 4.x | PostCSS plugin |
| **tw-animate-css** | 1.4.0 | Tailwind animation utilities |

---

## Database Configuration

| Setting | Value |
|---|---|
| **DBMS** | PostgreSQL |
| **Host** | localhost |
| **Port** | 5432 |
| **Database Name** | prizdb |
| **User** | yusuf |
| **Password** | esek |
| **Connection String** | `postgres://yusuf:esek@localhost:5432/prizdb` |
| **ORM** | Prisma 7.4.2 with `@prisma/adapter-pg` |
| **Adapter** | PrismaPg (pg Pool-based adapter) |

### Prisma Configuration
- **Provider**: `postgresql`
- **Client Generator**: `prisma-client-js`
- **Adapter**: `PrismaPg` (driver adapter using `pg.Pool`)
- **Development logging**: query, error, warn
- **Production logging**: error only
- **Singleton pattern**: Prisma client is cached on `globalThis` in development to prevent hot-reload connection exhaustion

---

## User Roles & Credentials

### Available Roles (UserRole Enum)

| Role | Description |
|---|---|
| `SUPER_ADMIN` | System-wide administrator with full access to all schools |
| `SCHOOL_ADMIN` | School-level administrator |
| `IT_ADMIN` | IT administrator for system configuration |
| `TEACHER` | Teaching staff member |
| `STUDENT` | Enrolled student |
| `PARENT` | Parent/guardian of a student |
| `ACCOUNTANT` | Finance/accounts staff |
| `LIBRARIAN` | Library management staff |
| `RECEPTIONIST` | Front office/reception staff |

### Test User Credentials

All test users share the password: **`Test@123456`**

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | `superadmin@baraka.sc.tz` | Test@123456 |
| SCHOOL_ADMIN | `admin@baraka.sc.tz` | Test@123456 |
| IT_ADMIN | `itadmin@baraka.sc.tz` | Test@123456 |
| TEACHER | `teacher1@baraka.sc.tz` | Test@123456 |
| STUDENT | `student1@baraka.sc.tz` | Test@123456 |
| PARENT | `parent1@baraka.sc.tz` | Test@123456 |
| ACCOUNTANT | `accountant@baraka.sc.tz` | Test@123456 |
| LIBRARIAN | `librarian@baraka.sc.tz` | Test@123456 |
| RECEPTIONIST | `receptionist@baraka.sc.tz` | Test@123456 |

**Login URL**: `http://localhost:3000/login`

---

## Login Methods

### Primary: Credentials (Email + Password)
- **Provider**: NextAuth.js Credentials Provider
- **Flow**: Email and password submitted via login form
- **Password hashing**: bcrypt with 12 salt rounds
- **Session strategy**: JWT (stateless, no server-side sessions stored)
- **JWT token includes**: `sub` (user ID), `role`, `schoolId`

### Account Security Features
| Feature | Detail |
|---|---|
| **Failed login tracking** | `failedLogins` counter on User model |
| **Account lockout** | After 5 failed attempts, account locked for 15 minutes (`lockedUntil` field) |
| **Auto-unlock** | Lockout expires after 15 minutes; successful login resets counter |
| **Last login tracking** | `lastLoginAt` and `lastLoginIp` fields recorded |
| **MFA support** | `mfaEnabled` and `mfaSecret` fields on User model (infrastructure present, not yet active in UI) |
| **Soft delete** | `deletedAt` field on User, Staff, Student models |

### Configured OAuth Providers (Optional)
The `.env` files include placeholders for the following OAuth providers, but they are not currently active:
- **Google OAuth** (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
- **Microsoft Entra ID** (`AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`)

### Session & Token Configuration
- **Strategy**: JWT-based sessions
- **Auth pages**: Sign-in at `/login`, errors redirect to `/login`
- **Middleware**: Edge-based JWT verification for route protection
- **Public paths** (no auth required): `/login`, `/api/auth/*`, `/api/health`, `/_next/*`, `/favicon.ico`, `/public`

---

## Role Permissions Matrix

### Route-Level Access (Middleware Enforcement)

| Dashboard Route | SUPER_ADMIN | SCHOOL_ADMIN | IT_ADMIN | TEACHER | STUDENT | PARENT | ACCOUNTANT | LIBRARIAN | RECEPTIONIST |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/dashboard/admin` | Yes | Yes | Yes | No | No | No | No | No | No |
| `/dashboard/teacher` | Yes | Yes | No | Yes | No | No | No | No | No |
| `/dashboard/student` | No | No | No | No | Yes | No | No | No | No |
| `/dashboard/parent` | No | No | No | No | No | Yes | No | No | No |
| `/dashboard/finance` | Yes | Yes | No | No | No | No | Yes | No | No |
| `/dashboard/library` | Yes | Yes | No | No | No | No | No | Yes | No |
| `/dashboard/reception` | Yes | Yes | No | No | No | No | No | No | Yes |

### API-Level Permissions

| Resource | Create | Read | Update | Delete | Allowed Roles |
|---|---|---|---|---|---|
| **Students** | POST | GET | PATCH/PUT | DELETE | SUPER_ADMIN, SCHOOL_ADMIN, RECEPTIONIST (create); All authenticated (read) |
| **Staff** | POST | GET | PATCH/PUT | DELETE | SUPER_ADMIN, SCHOOL_ADMIN |
| **Announcements** | POST | GET | PATCH | DELETE | SUPER_ADMIN, SCHOOL_ADMIN, IT_ADMIN (create/publish); All authenticated (read) |
| **Finance/Invoices** | POST | GET | PATCH | - | SUPER_ADMIN, SCHOOL_ADMIN, ACCOUNTANT |
| **Exams** | POST | GET | PATCH | DELETE | SUPER_ADMIN, SCHOOL_ADMIN, TEACHER |
| **Attendance** | POST | GET | - | - | SUPER_ADMIN, SCHOOL_ADMIN, TEACHER |
| **Library** | POST | GET | PATCH | DELETE | SUPER_ADMIN, SCHOOL_ADMIN, LIBRARIAN |
| **Transport** | POST | GET | PATCH | DELETE | SUPER_ADMIN, SCHOOL_ADMIN |
| **HR/Payroll** | POST | GET | PATCH | - | SUPER_ADMIN, SCHOOL_ADMIN, ACCOUNTANT |
| **Timetable** | POST | GET | PATCH | DELETE | SUPER_ADMIN, SCHOOL_ADMIN, TEACHER |
| **Messages** | POST | GET | PATCH | DELETE | All authenticated |
| **Notifications** | - | GET | PATCH | DELETE | All authenticated (own) |
| **Audit Logs** | - | GET | - | - | SUPER_ADMIN, IT_ADMIN |
| **Settings** | - | GET | PATCH | - | SUPER_ADMIN, IT_ADMIN |
| **Profile** | - | GET | PATCH | - | All authenticated (own) |

---

## Database Schema Overview

### Entity Relationship Summary

```
School (root entity)
  ├── AcademicYear → Term → Exam → ExamSubject → ExamResult
  ├── Class → Section → Student, Timetable, TeachingAssignment
  ├── Subject → ExamSubject, Assignment, TeachingAssignment, Timetable
  ├── User → Account, Session, Notification, Message, AuditLog, Announcement
  │     ├── Student → StudentAttendance, Invoice, BorrowRecord, AssignmentSubmission
  │     ├── Staff → StaffAttendance, LeaveApplication, SalaryStructure, PayrollItem
  │     └── Parent → StudentParent
  ├── FeeCategory → FeeStructure → InvoiceItem
  ├── Vehicle → Route → StudentTransport
  ├── Book → BookCopy → BorrowRecord
  └── Event, Announcement
```

### All Models (37 models + 13 enums)

| Model | Description | Key Fields |
|---|---|---|
| **School** | Root tenant entity | name, code (unique), timezone, currency, isActive |
| **User** | Authentication & authorization | email (unique), password, role, isActive, mfaEnabled, failedLogins, lockedUntil |
| **Account** | OAuth account linking | provider, providerAccountId, tokens |
| **Session** | User session tracking | sessionToken (unique), deviceInfo, ipAddress, lastActivity |
| **Student** | Enrolled student | studentId (unique), firstName, lastName, dateOfBirth, gender, sectionId, status |
| **Staff** | School staff member | employeeId (unique), department, designation, employmentType, isActive |
| **Parent** | Student parent/guardian | relationship, phone, occupation |
| **StudentParent** | Student-Parent junction | studentId + parentId (composite PK), isPrimary |
| **Class** | Grade/class level | name, level, schoolId |
| **Section** | Class section | name, maxCapacity, classId |
| **Subject** | Academic subject | code (unique per school), type (CORE/ELECTIVE), creditHours |
| **AcademicYear** | Academic year | name, startDate, endDate, isCurrent |
| **Term** | Term within academic year | name, startDate, endDate |
| **Section** | Class section with capacity | name, maxCapacity |
| **TeachingAssignment** | Teacher-subject-section mapping | staffId + subjectId + sectionId (unique) |
| **Timetable** | Weekly schedule entry | sectionId, subjectId, staffId, dayOfWeek, periodNo, startTime, endTime |
| **Exam** | Examination session | name, startDate, endDate, isPublished |
| **ExamSubject** | Subject within an exam | maxMarks, passMark, examDate, duration, venue |
| **ExamResult** | Student exam score | marksObtained, grade, rank |
| **StudentAttendance** | Daily student attendance | status (PRESENT/ABSENT/LATE/EXCUSED), markedBy |
| **StaffAttendance** | Daily staff attendance | checkIn, checkOut, status (PRESENT/ABSENT/ON_LEAVE/HALF_DAY) |
| **FeeCategory** | Fee type classification | name, isRecurring |
| **FeeStructure** | Fee amount per category | amount, dueDay |
| **FeeDiscount** | Student fee discount | type, value, reason |
| **Invoice** | Student fee invoice | invoiceNumber (unique), totalAmount, paidAmount, dueDate, status |
| **InvoiceItem** | Line item on invoice | description, amount, discount, netAmount |
| **Payment** | Invoice payment record | amount, method (CASH/BANK_TRANSFER/STRIPE/PAYSTACK), receiptUrl |
| **Payroll** | Monthly payroll batch | month, year, isApproved, isLocked |
| **PayrollItem** | Individual staff payroll entry | basicSalary, allowances, deductions, netSalary, payslipUrl |
| **SalaryStructure** | Staff salary configuration | basicSalary, housingAllowance, transportAllowance, deductions |
| **LeaveApplication** | Staff leave request | type, startDate, endDate, status, reviewedBy |
| **PerformanceEvaluation** | Staff performance review | criteria (JSON), overallScore, overallRating |
| **Assignment** | Teacher assignment | title, dueDate, maxMarks, allowLate, latePenalty |
| **AssignmentSubmission** | Student submission | content, fileUrl, marks, feedback, isLate |
| **Announcement** | School announcement | targetRole, targetClass, isPublished |
| **Message** | Direct message | senderId, receiverId, subject, isRead |
| **Notification** | User notification | type (11 types), isRead, link |
| **Event** | School event | category, visibility, startDate, endDate |
| **Book** | Library book | isbn, title, authors, totalCopies |
| **BookCopy** | Individual book copy | copyNumber, isAvailable, condition |
| **BorrowRecord** | Book borrowing record | borrowDate, expectedReturn, fineAmount, finePaid |
| **Route** | Transport route | code, startPoint, endPoint, stops (JSON) |
| **Vehicle** | Transport vehicle | registration (unique), make, model, capacity, status |
| **Driver** | Vehicle driver | licenseNumber (unique), licenseExpiry |
| **StudentTransport** | Student route assignment | stopName, isActive |
| **AuditLog** | System audit trail | action (12 types), entityType, entityId, fieldDiff (JSON) |
| **FileRecord** | File storage metadata | bucket, key (unique), fileName, mimeType, size |
| **VerificationToken** | Email/token verification | identifier + token (unique), expires |

### Enums

| Enum | Values |
|---|---|
| **UserRole** | `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`, `ACCOUNTANT`, `LIBRARIAN`, `RECEPTIONIST`, `IT_ADMIN` |
| **AttendanceStatus** | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` |
| **StaffAttendanceStatus** | `PRESENT`, `ABSENT`, `ON_LEAVE`, `HALF_DAY` |
| **StudentStatus** | `ACTIVE`, `GRADUATED`, `TRANSFERRED`, `SUSPENDED`, `EXPELLED` |
| **EmploymentType** | `FULL_TIME`, `PART_TIME`, `CONTRACT` |
| **InvoiceStatus** | `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE` |
| **PaymentMethod** | `CASH`, `BANK_TRANSFER`, `STRIPE`, `PAYSTACK` |
| **LeaveStatus** | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| **LeaveType** | `ANNUAL`, `SICK`, `MATERNITY`, `PATERNITY`, `UNPAID`, `EMERGENCY` |
| **SubjectType** | `CORE`, `ELECTIVE` |
| **EventCategory** | `HOLIDAY`, `EXAM`, `SPORTS`, `CULTURAL`, `MEETING`, `OTHER` |
| **EventVisibility** | `ALL`, `STAFF_ONLY`, `STUDENTS_ONLY` |
| **NotificationType** | `INFO`, `WARNING`, `SUCCESS`, `ERROR`, `ATTENDANCE`, `ASSIGNMENT`, `EXAM`, `FEE`, `LEAVE`, `ANNOUNCEMENT`, `MESSAGE`, `EVENT` |
| **AuditAction** | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_RESET`, `MFA_ENABLED`, `MFA_DISABLED`, `SESSION_REVOKED`, `FILE_UPLOAD`, `FILE_DELETE`, `EXPORT` |
| **VehicleStatus** | `ACTIVE`, `UNDER_MAINTENANCE`, `RETIRED` |

---

## Project Structure

```
sms/
├── prisma/
│   ├── schema.prisma              # Database schema (37 models, 13 enums)
│   └── seed.ts                    # Database seed script (test data)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── globals.css            # Global styles
│   │   ├── favicon.ico            # App favicon
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx       # Login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard layout (sidebar, auth check)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx       # Main dashboard redirect
│   │   │   │   ├── admin/        # Admin dashboard
│   │   │   │   ├── teacher/       # Teacher dashboard
│   │   │   │   ├── student/       # Student dashboard
│   │   │   │   ├── parent/        # Parent dashboard
│   │   │   │   └── finance/       # Finance dashboard
│   │   │   ├── students/          # Student management
│   │   │   ├── staff/             # Staff management
│   │   │   ├── academic/
│   │   │   │   ├── classes/       # Class management
│   │   │   │   ├── subjects/      # Subject management
│   │   │   │   ├── years/         # Academic year management
│   │   │   │   ├── terms/         # Term management
│   │   │   │   ├── assignments/   # Assignment management
│   │   │   │   ├── exams/         # Exam management
│   │   │   │   ├── timetable/     # Timetable management
│   │   │   │   └── teaching-assignments/
│   │   │   ├── attendance/        # Attendance management
│   │   │   ├── examinations/      # Exam & results
│   │   │   ├── fees/              # Fee structures & payments
│   │   │   ├── finance/
│   │   │   │   ├── fees/          # Fee management
│   │   │   │   └── invoices/      # Invoice management
│   │   │   ├── transport/         # Transport management
│   │   │   ├── library/
│   │   │   │   ├── books/         # Book management
│   │   │   │   └── borrow/        # Borrow/return books
│   │   │   ├── communication/
│   │   │   │   ├── announcements/ # Announcements
│   │   │   │   ├── messages/      # Direct messaging
│   │   │   │   └── events/        # Events calendar
│   │   │   ├── hr/
│   │   │   │   ├── leave/         # Leave management
│   │   │   │   ├── payroll/       # Payroll processing
│   │   │   │   └── salary/        # Salary structures
│   │   │   ├── timetable/         # Timetable view
│   │   │   └── reports/           # Reports
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # Auth.js handler
│   │       ├── health/route.ts              # Health check endpoint
│   │       ├── students/                    # Student CRUD
│   │       ├── staff/                       # Staff CRUD
│   │       ├── academic/                     # Academic resources
│   │       │   ├── classes/
│   │       │   ├── sections/
│   │       │   ├── subjects/
│   │       │   ├── years/
│   │       │   ├── terms/
│   │       │   └── teaching-assignments/
│   │       ├── attendance/                  # Attendance APIs
│   │       ├── exams/                        # Exam APIs
│   │       ├── finance/                      # Finance APIs
│   │       │   ├── fee-structures/
│   │       │   ├── fee-categories/
│   │       │   ├── invoices/
│   │       │   ├── payments/
│   │       │   └── reports/
│   │       ├── hr/                          # HR APIs
│   │       │   ├── leave/
│   │       │   ├── payroll/
│   │       │   └── salary/
│   │       ├── library/                     # Library APIs
│   │       │   ├── books/
│   │       │   └── borrow/
│   │       ├── transport/                   # Transport APIs
│   │       │   ├── routes/
│   │       │   ├── vehicles/
│   │       │   ├── drivers/
│   │       │   └── assignments/
│   │       ├── assignments/                 # Assignment APIs
│   │       ├── announcements/                # Announcements API
│   │       ├── events/                       # Events API
│   │       ├── messages/                     # Messaging API
│   │       ├── notifications/                # Notifications API
│   │       ├── timetable/                    # Timetable API
│   │       ├── audit-logs/                   # Audit log API
│   │       ├── settings/                     # Settings API
│   │       └── profile/                      # User profile API
│   ├── components/
│   │   ├── layout/
│   │   │   ├── navbar.tsx              # Navigation bar
│   │   │   └── theme-provider.tsx       # Dark/light theme provider
│   │   ├── ui/                         # shadcn/ui components (30+)
│   │   │   ├── button.tsx, input.tsx, card.tsx, dialog.tsx,
│   │   │   ├── table.tsx, form.tsx, select.tsx, tabs.tsx,
│   │   │   ├── badge.tsx, avatar.tsx, calendar.tsx, etc.
│   │   ├── students/                   # Student feature components
│   │   ├── academic/                    # Academic feature components
│   │   ├── attendance/                  # Attendance components
│   │   ├── examinations/               # Exam components
│   │   ├── fees/                        # Fee components
│   │   ├── library/                    # Library components
│   │   ├── transport/                   # Transport components
│   │   ├── hr/                          # HR components
│   │   ├── communication/              # Messaging & events
│   │   ├── assignments/                # Assignment components
│   │   ├── timetable/                  # Timetable components
│   │   ├── staff/                      # Staff components
│   │   └── reports/                     # Reports components
│   ├── lib/
│   │   ├── auth.ts                     # NextAuth configuration
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   ├── minio.ts                    # MinIO/S3 file storage
│   │   ├── utils.ts                    # Utility functions
│   │   ├── export-pdf.ts              # PDF export helper
│   │   ├── export-excel.ts            # Excel export helper
│   │   ├── export.ts                  # General export utilities
│   │   └── import.ts                  # Data import utilities
│   ├── types/
│   │   └── next-auth.d.ts             # NextAuth type extensions
│   └── middleware.ts                    # Route protection & role-based access
├── public/                             # Static assets
├── docs/                               # Documentation
├── manage.sh                           # Management CLI script
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── .env                                # Environment variables (active)
├── .env.example                        # Environment variables template
└── .env.local                          # Local overrides
```

---

## Environment Variables

### Database
| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://yusuf:esek@localhost:5432/prizdb` |

### Authentication (Auth.js / NextAuth v5)
| Variable | Description | Default |
|---|---|---|
| `AUTH_SECRET` | JWT signing secret | `your-super-secret-auth-key-change-in-production` |
| `AUTH_URL` | Application base URL | `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID | *(empty - optional)* |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret | *(empty - optional)* |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Microsoft Entra ID Client ID | *(empty - optional)* |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Microsoft Entra ID Secret | *(empty - optional)* |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Microsoft Entra ID Issuer URL | *(empty - optional)* |

### MinIO Object Storage
| Variable | Description | Default |
|---|---|---|
| `MINIO_ENDPOINT` | MinIO server host | `localhost` |
| `MINIO_PORT` | MinIO server port | `9000` |
| `MINIO_USE_SSL` | Enable SSL for MinIO | `false` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `MINIO_REGION` | MinIO region | `us-east-1` |

### Email
| Variable | Description | Default |
|---|---|---|
| `EMAIL_PROVIDER` | Email provider (`nodemailer` or `resend`) | `nodemailer` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | *(empty)* |
| `SMTP_PASS` | SMTP password | *(empty)* |
| `SMTP_FROM` | Sender email address | `SMS System <noreply@baraka.sc.tz>` |
| `RESEND_API_KEY` | Resend API key | *(empty)* |

### SMS Notifications (Optional)
| Variable | Description | Default |
|---|---|---|
| `SMS_PROVIDER` | SMS provider (`twilio` or `africas_talking`) | *(empty)* |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | *(empty)* |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | *(empty)* |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | *(empty)* |
| `AT_API_KEY` | Africa's Talking API key | *(empty)* |
| `AT_USERNAME` | Africa's Talking username | *(empty)* |

### Payment Processing (Optional)
| Variable | Description | Default |
|---|---|---|
| `PAYMENT_PROVIDER` | Payment gateway (`stripe` or `paystack`) | *(empty)* |
| `STRIPE_SECRET_KEY` | Stripe secret key | *(empty)* |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | *(empty)* |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | *(empty)* |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack webhook secret | *(empty)* |

### Application
| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Application display name | `School Management System` |
| `NODE_ENV` | Node environment | `development` |

---

## Management Scripts (manage.sh)

The `manage.sh` script is an interactive CLI tool for managing the SMS application.

### Usage

```bash
./manage.sh <command> [service]
```

Or run without arguments for an interactive menu:
```bash
./manage.sh
```

### Commands

| Command | Description |
|---|---|
| `start [service]` | Start service(s): `frontend`, `prisma-studio`, or `all` (default) |
| `stop [service]` | Stop service(s): `frontend`, `prisma-studio`, or `all` (default) |
| `restart [service]` | Restart service(s): `frontend`, `prisma-studio`, or `all` (default) |
| `status` | Check status of all services |
| `logs [service]` | View logs: `frontend`, `prisma-studio`, or `all` (default) |
| `tail-logs [service]` | Tail logs in real-time |
| `db-seed` | Seed database with test data |
| `db-migrate` | Run Prisma migrations |
| `db-generate` | Generate Prisma client |
| `db-reset` | Reset database (deletes all data, with confirmation) |
| `db-studio` | Open Prisma Studio GUI on port 5555 |
| `users` | Show test user credentials |
| `install` | Install npm dependencies |
| `build` | Build for production |
| `clean` | Clean build artifacts (`.next`, `node_modules/.cache`) |
| `help` | Show help message |

### Configuration
- **Frontend port**: 3000
- **Prisma Studio port**: 5555
- **App directory**: `/home/yusuf/sms`
- **Log directory**: `/tmp/sms/`
- **Frontend log**: `/tmp/sms/frontend.log`
- **Prisma Studio log**: `/tmp/sms/prisma-studio.log`

### Key Features
- Automatic port conflict detection and cleanup
- Process health monitoring (port listening + HTTP response check)
- Log state parsing (ready, compiling, error states)
- Colored terminal output for status reporting
- Interactive menu with 25 numbered options

---

## Running the Application

### Prerequisites

1. **Node.js** 20+ and npm
2. **PostgreSQL** running on `localhost:5432`
3. **MinIO** (optional, for file uploads) on `localhost:9000`

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Generate Prisma client
npm run db:generate

# 4. Push database schema
npm run db:push

# 5. Seed with test data
npm run db:seed
```

### Development Mode

```bash
# Start using manage.sh (recommended)
./manage.sh start

# Or directly with npm
npm run dev
```

The application will be available at **http://localhost:3000**

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Using manage.sh (Recommended)

```bash
# First-time setup
./manage.sh install       # Install dependencies
./manage.sh db-generate   # Generate Prisma client
./manage.sh db-migrate    # Run migrations
./manage.sh db-seed       # Seed test data

# Daily operations
./manage.sh start         # Start all services
./manage.sh status        # Check service status
./manage.sh logs          # View logs
./manage.sh stop          # Stop all services

# Database management
./manage.sh db-studio     # Open Prisma Studio GUI

# Troubleshooting
./manage.sh clean          # Clean build artifacts
./manage.sh restart       # Restart all services
```

### NPM Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start development server (port 3000) |
| `build` | `next build` | Build for production |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |
| `db:generate` | `prisma generate` | Generate Prisma client |
| `db:push` | `prisma db push` | Push schema to database |
| `db:migrate` | `prisma migrate dev` | Run migrations |
| `db:studio` | `prisma studio` | Open Prisma Studio GUI |
| `db:seed` | `tsx prisma/seed.ts` | Seed database with test data |

---

## API Endpoints

All API endpoints are under `/api` and require authentication unless noted.

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/[...nextauth]` | NextAuth.js auth handler (login, logout, session) | Public |

### Health Check
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | Public |

### Students
| Method | Endpoint | Description | Allowed Roles |
|---|---|---|---|
| `GET` | `/api/students` | List students (paginated, filterable) | All authenticated |
| `POST` | `/api/students` | Create a new student | SUPER_ADMIN, SCHOOL_ADMIN, RECEPTIONIST |
| `GET` | `/api/students/[id]` | Get student by ID | All authenticated |
| `PATCH` | `/api/students/[id]` | Update student | SUPER_ADMIN, SCHOOL_ADMIN, RECEPTIONIST |
| `DELETE` | `/api/students/[id]` | Soft-delete student | SUPER_ADMIN, SCHOOL_ADMIN |

### Staff
| Method | Endpoint | Description | Allowed Roles |
|---|---|---|---|
| `GET` | `/api/staff` | List staff members | All authenticated |
| `POST` | `/api/staff` | Create staff member | SUPER_ADMIN, SCHOOL_ADMIN |
| `GET` | `/api/staff/[id]` | Get staff member | All authenticated |
| `PATCH` | `/api/staff/[id]` | Update staff member | SUPER_ADMIN, SCHOOL_ADMIN |
| `DELETE` | `/api/staff/[id]` | Soft-delete staff | SUPER_ADMIN, SCHOOL_ADMIN |

### Academic
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/academic/classes` | List/create classes |
| `GET/POST` | `/api/academic/sections` | List/create sections |
| `GET/POST` | `/api/academic/subjects` | List/create subjects |
| `GET/POST` | `/api/academic/years` | List/create academic years |
| `GET/POST` | `/api/academic/terms` | List/create terms |
| `GET/POST` | `/api/academic/teaching-assignments` | List/create teaching assignments |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/attendance` | List/mark student attendance |
| `GET` | `/api/attendance/reports` | Attendance reports |
| `GET/POST` | `/api/attendance/staff` | List/mark staff attendance |

### Examinations
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/exams` | List/create exams |
| `GET/PATCH/DELETE` | `/api/exams/[id]` | Get/update/delete exam |
| `GET/POST` | `/api/exams/[id]/subjects` | List/add exam subjects |
| `PATCH` | `/api/exams/[id]/subjects/[subjectId]` | Update exam subject |
| `GET` | `/api/exams/[id]/results` | Get exam results |
| `GET` | `/api/exams/[id]/report` | Get exam report card |

### Assignments
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/assignments` | List/create assignments |
| `GET/PATCH/DELETE` | `/api/assignments/[id]` | Get/update/delete assignment |
| `GET/POST` | `/api/assignments/[id]/submissions` | List/submit assignment work |
| `GET/PATCH` | `/api/assignments/[id]/submissions/[studentId]` | Get/grade submission |

### Finance
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/finance/fee-structures` | List/create fee structures |
| `GET/POST` | `/api/finance/fee-categories` | List/create fee categories |
| `GET/POST` | `/api/finance/invoices` | List/create invoices |
| `GET/PATCH` | `/api/finance/invoices/[id]` | Get/update invoice |
| `GET/POST` | `/api/finance/payments` | List/record payments |
| `GET` | `/api/finance/reports` | Financial reports |

### HR
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/hr/leave` | List/apply for leave |
| `PATCH` | `/api/hr/leave/[id]` | Update leave status (approve/reject) |
| `GET/POST` | `/api/hr/payroll` | List/create payroll |
| `GET/PATCH` | `/api/hr/payroll/[id]` | Get/update payroll |
| `GET` | `/api/hr/payroll/[id]/payslip` | Generate payslip |
| `GET/POST` | `/api/hr/salary` | List/create salary structures |
| `PATCH` | `/api/hr/salary/[id]` | Update salary structure |

### Library
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/library/books` | List/add books |
| `GET/POST` | `/api/library/borrow` | List/create borrow records |

### Transport
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/transport/routes` | List/create routes |
| `PATCH/DELETE` | `/api/transport/routes/[id]` | Update/delete route |
| `GET/POST` | `/api/transport/vehicles` | List/create vehicles |
| `PATCH/DELETE` | `/api/transport/vehicles/[id]` | Update/delete vehicle |
| `GET/POST` | `/api/transport/drivers` | List/create drivers |
| `PATCH/DELETE` | `/api/transport/drivers/[id]` | Update/delete driver |
| `GET/POST` | `/api/transport/assignments` | List/create transport assignments |

### Timetable
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/timetable` | List/create timetable entries |
| `PATCH/DELETE` | `/api/timetable/[id]` | Update/delete timetable entry |

### Communication
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST` | `/api/announcements` | List/create announcements |
| `GET/POST` | `/api/messages` | List/send messages |
| `PATCH` | `/api/messages/mark-read` | Mark message as read |
| `GET/POST` | `/api/events` | List/create events |
| `PATCH/DELETE` | `/api/events/[id]` | Update/delete event |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | List user notifications |
| `GET` | `/api/notifications/stream` | SSE notification stream |
| `GET/PATCH` | `/api/notifications/preferences` | Get/update notification preferences |

### User Profile & Settings
| Method | Endpoint | Description |
|---|---|---|
| `GET/PATCH` | `/api/profile` | Get/update current user profile |
| `GET/PATCH` | `/api/settings` | Get/update system settings |

### Audit
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/audit-logs` | List audit logs (SUPER_ADMIN, IT_ADMIN) |

### Query Parameters (Common)
Most `GET` list endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search term
- Additional filters vary by endpoint (e.g., `status`, `sectionId`)

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### MinIO Storage Buckets
| Bucket Name | Purpose |
|---|---|
| `student-photos` | Student profile photos |
| `student-documents` | Student documents |
| `assignment-files` | Assignment attachments |
| `fee-receipts` | Payment receipts |
| `payslips` | Staff payslips |
| `library-covers` | Book cover images |
| `db-backups` | Database backups |
| `staff-documents` | Staff documents |
| `general` | General file storage |