# School Management System (SMS) - Implementation Plan

**Generated:** March 2, 2026  
**Status:** In Progress  
**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui

---

## 📊 Current Implementation Status

### ✅ COMPLETE Modules (11/15)

| Module | Pages | Components | API Routes | Status |
|--------|-------|------------|------------|--------|
| **Assignments** | 1 | 2 | 2 | ✅ Complete - Create, submit, grade assignments |
| **Attendance** | 1 | 3 | 2 | ✅ Complete - Mark, reports, calendar views |
| **Communication** | 3 | 3 | 5 | ✅ Complete - Announcements, messages, events |
| **Dashboard** | 8 | 7 | 0 | ✅ Complete - All 7 role-specific dashboards |
| **Examinations** | 1 | 3 | 2 | ✅ Complete - Exams, results, report cards |
| **Fees** | 1 | 4 | 5 | ✅ Complete - Fee structures, invoices, payments |
| **HR** | 3 | 3 | 6 | ✅ Complete - Leave, payroll, salary management |
| **Library** | 2 | 2 | 2 | ✅ Complete - Books catalog, borrow/return |
| **Staff** | 1 | 1 | 2 | ✅ Complete - Staff management CRUD |
| **Students** | 1 | 2 | 2 | ✅ Complete - Student management CRUD |
| **Timetable** | 1 | 2 | 2 | ✅ Complete - Class schedules management |
| **Transport** | 1 | 4 | 5 | ✅ Complete - Routes, vehicles, drivers |

### ⚠️ PARTIAL Modules (3/15)

| Module | Status | What's Implemented | What's Missing |
|--------|--------|-------------------|----------------|
| **Academic** | PARTIAL | Classes, Subjects, Sections | Academic Years page, Terms page, Teaching Assignments page |
| **Finance** | PARTIAL | Fee structures, Invoices | Payroll page (empty directory) |
| **Reports** | PARTIAL | Basic reports landing | PDF/Excel export, Custom report builder, Dedicated report pages |

---

## 🗄️ Database Schema Coverage

The Prisma schema includes **47 models** covering:

| Category | Models |
|----------|--------|
| **Core** | School, User, Account, Session, VerificationToken |
| **Academic** | AcademicYear, Term, Class, Section, Subject, TeachingAssignment |
| **Students** | Student, StudentParent, Parent, StudentAttendance, StudentTransport |
| **Staff** | Staff, StaffAttendance, LeaveApplication, SalaryStructure, Payroll, PayrollItem, PerformanceEvaluation |
| **Examinations** | Exam, ExamSubject, ExamResult |
| **Assignments** | Assignment, AssignmentSubmission |
| **Finance** | FeeCategory, FeeStructure, FeeDiscount, Invoice, InvoiceItem, Payment |
| **Library** | Book, BookCopy, BorrowRecord |
| **Transport** | Vehicle, Driver, Route |
| **Communication** | Announcement, Message, Event, Notification |
| **Audit** | AuditLog, FileRecord |

---

## 🚀 Implementation Roadmap

### Phase 1: Complete Partial Modules (Priority: HIGH)

#### 1.1 Academic Module Enhancements

**Files to Create:**
```
src/app/(dashboard)/academic/years/page.tsx
src/app/(dashboard)/academic/terms/page.tsx
src/app/(dashboard)/academic/teaching-assignments/page.tsx
src/components/academic/academic-years-client.tsx
src/components/academic/terms-client.tsx
src/components/academic/teaching-assignments-client.tsx
src/app/api/academic/years/route.ts
src/app/api/academic/terms/route.ts
src/app/api/academic/teaching-assignments/route.ts
```

**Features:**
- [ ] Academic Years management (create, edit, set current year)
- [ ] Terms management (create terms within academic year)
- [ ] Teaching Assignments (assign teachers to subjects/classes)

#### 1.2 Finance Module Cleanup

**Actions:**
- [ ] Remove empty `/finance/payroll/` directory OR
- [ ] Create redirect to `/hr/payroll`

#### 1.3 Reports Module Enhancement

**Files to Create:**
```
src/app/(dashboard)/reports/academic/page.tsx
src/app/(dashboard)/reports/financial/page.tsx
src/app/(dashboard)/reports/attendance/page.tsx
src/app/(dashboard)/reports/staff/page.tsx
src/components/reports/academic-reports-client.tsx
src/components/reports/financial-reports-client.tsx
src/components/reports/attendance-reports-client.tsx
src/components/reports/staff-reports-client.tsx
src/lib/export-pdf.ts
src/lib/export-excel.ts
```

**Features:**
- [ ] PDF export functionality (using jspdf or pdfmake)
- [ ] Excel export functionality (using xlsx)
- [ ] Academic performance reports
- [ ] Financial reports with charts
- [ ] Attendance reports with trends
- [ ] Staff performance reports

---

### Phase 2: Missing Features (Priority: MEDIUM)

#### 2.1 Staff Attendance

**Files to Create/Modify:**
```
src/components/attendance/staff-attendance-client.tsx
src/app/api/attendance/staff/route.ts
```

**Modify:**
```
src/app/(dashboard)/attendance/page.tsx (add staff tab)
```

**Features:**
- [ ] Staff attendance marking
- [ ] Staff attendance reports
- [ ] Leave integration

#### 2.2 Profile & Settings

**Files to Create:**
```
src/app/(dashboard)/profile/page.tsx
src/app/(dashboard)/settings/page.tsx
src/components/profile/profile-client.tsx
src/components/settings/settings-client.tsx
src/app/api/profile/route.ts
src/app/api/settings/route.ts
```

**Features:**
- [ ] View/edit user profile
- [ ] Change password
- [ ] Profile photo upload
- [ ] School settings (admin only)
- [ ] Notification preferences

#### 2.3 Notifications System

**Files to Create:**
```
src/app/(dashboard)/notifications/page.tsx
src/components/notifications/notifications-client.tsx
src/app/api/notifications/stream/route.ts (SSE)
src/app/api/notifications/preferences/route.ts
```

**Features:**
- [ ] Notifications center
- [ ] Real-time notifications (SSE)
- [ ] Notification preferences per user
- [ ] Mark as read/unread

---

### Phase 3: Enhancements (Priority: LOW)

#### 3.1 Dashboard Widgets Enhancement

**Files to Modify:**
```
src/components/dashboard/admin-dashboard.tsx
src/components/dashboard/teacher-dashboard.tsx
src/components/dashboard/student-dashboard.tsx
src/components/dashboard/parent-dashboard.tsx
src/components/dashboard/accountant-dashboard.tsx
src/components/dashboard/librarian-dashboard.tsx
src/components/dashboard/receptionist-dashboard.tsx
```

**Features:**
- [ ] Add Recharts visualizations
- [ ] Quick action buttons
- [ ] Recent activity feeds
- [ ] Upcoming events widget
- [ ] Pending tasks widget

#### 3.2 Data Export/Import

**Files to Create:**
```
src/lib/export.ts
src/lib/import.ts
src/components/ui/export-button.tsx
src/components/ui/import-dialog.tsx
```

**Features:**
- [ ] Bulk export for all modules (CSV, Excel, PDF)
- [ ] Import functionality (CSV, Excel)
- [ ] Data validation on import
- [ ] Import preview

#### 3.3 Audit & Logging

**Files to Create:**
```
src/app/(dashboard)/admin/audit-logs/page.tsx
src/components/admin/audit-logs-client.tsx
src/app/api/audit-logs/route.ts
```

**Features:**
- [ ] Audit log viewer
- [ ] Filter by user, action, date
- [ ] Export audit logs

---

### Phase 4: Testing & Documentation (Priority: LOW)

#### 4.1 Testing

**Files to Create:**
```
__tests__/api/assignments.test.ts
__tests__/api/attendance.test.ts
__tests__/api/students.test.ts
__tests__/api/staff.test.ts
__tests__/components/dashboard.test.tsx
jest.config.js
jest.setup.js
```

**Tasks:**
- [ ] Unit tests for API routes (≥70% coverage)
- [ ] Component tests with React Testing Library
- [ ] Integration tests for critical flows
- [ ] E2E tests with Playwright (optional)

#### 4.2 Documentation

**Files to Create:**
```
docs/USER_GUIDE.md
docs/API_DOCUMENTATION.md
docs/DEPLOYMENT.md
docs/CONTRIBUTING.md
```

**Tasks:**
- [ ] User guide for each role
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide
- [ ] Contributing guidelines

---

## 📅 Timeline

```
Week 1: Phase 1 (Complete Partial Modules)
├── Day 1-2: Academic Years & Terms pages
├── Day 3-4: Teaching Assignments page
├── Day 5: Finance cleanup + Reports export
└── Day 6-7: Testing & bug fixes

Week 2: Phase 2 (Missing Features)
├── Day 1-2: Staff Attendance
├── Day 3-4: Profile page
├── Day 5-6: Settings page
└── Day 7: Notifications system

Week 3: Phase 3 (Enhancements)
├── Day 1-3: Dashboard charts & widgets
├── Day 4-5: Export/Import functionality
└── Day 6-7: Audit logs

Week 4: Phase 4 (Testing & Docs)
├── Day 1-3: Unit tests
├── Day 4-5: Integration tests
└── Day 6-7: Documentation
```

---

## 🧪 Test User Credentials

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | superadmin@baraka.sc.tz | Test@123456 |
| SCHOOL_ADMIN | admin@baraka.sc.tz | Test@123456 |
| TEACHER | teacher1@baraka.sc.tz | Test@123456 |
| STUDENT | student1@baraka.sc.tz | Test@123456 |
| PARENT | parent1@baraka.sc.tz | Test@123456 |
| ACCOUNTANT | accountant@baraka.sc.tz | Test@123456 |
| LIBRARIAN | librarian@baraka.sc.tz | Test@123456 |
| RECEPTIONIST | receptionist@baraka.sc.tz | Test@123456 |
| IT_ADMIN | itadmin@baraka.sc.tz | Test@123456 |

---

## 📝 Notes

1. **All modules have database schema support** - Prisma models are complete
2. **Authentication & RBAC** - Fully implemented with Auth.js v5
3. **UI Components** - shadcn/ui components are set up
4. **API Structure** - RESTful endpoints follow consistent patterns

---

## 🎯 Success Criteria

- [ ] All 15 modules marked as COMPLETE
- [ ] Build passes with zero errors (`npm run build`)
- [ ] Lint passes with zero errors (`npm run lint`)
- [ ] All pages render correctly in browser
- [ ] All API endpoints return correct responses
- [ ] Test coverage ≥70% for API routes
- [ ] Documentation complete

---

*Last Updated: March 2, 2026*
