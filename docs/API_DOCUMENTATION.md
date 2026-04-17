# School Management System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Common Parameters](#common-parameters)
5. [Error Handling](#error-handling)
6. [API Endpoints](#api-endpoints)
   - [Authentication API](#authentication-api)
   - [Students API](#students-api)
   - [Staff API](#staff-api)
   - [Academic API](#academic-api)
   - [Attendance API](#attendance-api)
   - [Examinations API](#examinations-api)
   - [Finance API](#finance-api)
   - [Library API](#library-api)
   - [Transport API](#transport-api)
   - [Communication API](#communication-api)
   - [HR API](#hr-api)
   - [Audit Logs API](#audit-logs-api)
7. [OpenAPI Specification](#openapi-specification)
8. [Rate Limiting](#rate-limiting)
9. [Webhooks](#webhooks)

---

## Overview

The School Management System API is a RESTful API built on Next.js API Routes. It provides programmatic access to all system functionality, enabling integration with external systems and custom applications.

### Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth.js v5
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod schemas

### Response Format

All API responses are in JSON format with the following structure:

```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Authentication

### Session-Based Authentication

The API uses NextAuth.js for session-based authentication. Include credentials in requests:

```javascript
fetch('/api/students', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
});
```

### Authentication Flow

1. **Login**: POST to `/api/auth/signin` with credentials
2. **Session**: Session cookie is set automatically
3. **Logout**: POST to `/api/auth/signout`

### Role-Based Access Control

Each endpoint requires specific roles:

| Role | Access Level |
|------|-------------|
| SUPER_ADMIN | Full system access |
| SCHOOL_ADMIN | School-level administration |
| TEACHER | Teaching operations |
| STUDENT | Student portal |
| PARENT | Parent portal |
| ACCOUNTANT | Financial operations |
| LIBRARIAN | Library operations |
| RECEPTIONIST | Front desk operations |
| IT_ADMIN | Technical administration |

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

---

## Common Parameters

### Pagination

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 100) |

### Filtering

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search query |
| status | string | Filter by status |
| startDate | date | Filter from date |
| endDate | date | Filter to date |

### Sorting

| Parameter | Type | Description |
|-----------|------|-------------|
| sortBy | string | Field to sort by |
| sortOrder | string | 'asc' or 'desc' |

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

---

## API Endpoints

### Authentication API

#### POST /api/auth/[...nextauth]

NextAuth.js authentication endpoints.

**Sign In**
```http
POST /api/auth/signin/credentials
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Sign Out**
```http
POST /api/auth/signout
```

**Get Session**
```http
GET /api/auth/session
```

**Response**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "TEACHER",
    "schoolId": "uuid"
  },
  "expires": "2026-04-01T00:00:00.000Z"
}
```

---

### Students API

#### GET /api/students

List all students with pagination and filtering.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| search | string | Search by name or ID |
| classId | string | Filter by class |
| sectionId | string | Filter by section |
| status | string | Filter by status (ACTIVE, GRADUATED, etc.) |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "studentId": "SMS-2024-00001",
      "firstName": "John",
      "lastName": "Doe",
      "gender": "Male",
      "dateOfBirth": "2010-05-15",
      "section": {
        "id": "uuid",
        "name": "A",
        "class": {
          "id": "uuid",
          "name": "Grade 5"
        }
      },
      "status": "ACTIVE",
      "photoUrl": "https://...",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

#### POST /api/students

Create a new student.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN

**Request Body**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@student.school.com",
  "dateOfBirth": "2010-05-15",
  "gender": "Male",
  "nationality": "US",
  "address": "123 Main St",
  "phone": "+1-555-1234",
  "sectionId": "uuid",
  "parents": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "relationship": "Mother",
      "email": "jane@example.com",
      "phone": "+1-555-5678",
      "isPrimary": true
    }
  ]
}
```

**Response** (201 Created)
```json
{
  "id": "uuid",
  "studentId": "SMS-2024-00001",
  "firstName": "John",
  "lastName": "Doe",
  "status": "ACTIVE"
}
```

#### GET /api/students/:id

Get student details.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT (own children)

**Response**
```json
{
  "id": "uuid",
  "studentId": "SMS-2024-00001",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "Male",
  "dateOfBirth": "2010-05-15",
  "nationality": "US",
  "address": "123 Main St",
  "phone": "+1-555-1234",
  "section": {
    "id": "uuid",
    "name": "A",
    "class": {
      "id": "uuid",
      "name": "Grade 5"
    }
  },
  "parents": [
    {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "relationship": "Mother",
      "email": "jane@example.com",
      "phone": "+1-555-5678",
      "isPrimary": true
    }
  ],
  "status": "ACTIVE",
  "enrollmentDate": "2024-01-01"
}
```

#### PUT /api/students/:id

Update student details.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN

**Request Body**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "address": "456 Oak Ave",
  "phone": "+1-555-9999"
}
```

#### DELETE /api/students/:id

Soft delete a student (sets deletedAt timestamp).

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN

---

### Staff API

#### GET /api/staff

List all staff members.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN, IT_ADMIN

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| search | string | Search by name or employee ID |
| department | string | Filter by department |
| employmentType | string | FULL_TIME, PART_TIME, CONTRACT |
| isActive | boolean | Filter by active status |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "employeeId": "EMP-2024-0001",
      "firstName": "Jane",
      "lastName": "Smith",
      "department": "Science",
      "designation": "Senior Teacher",
      "employmentType": "FULL_TIME",
      "User": {
        "id": "uuid",
        "email": "jane@baraka.sc.tz",
        "role": "TEACHER",
        "isActive": true
      }
    }
  ],
  "pagination": { ... }
}
```

#### POST /api/staff

Create a new staff member with user account.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN

**Request Body**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@baraka.sc.tz",
  "password": "SecurePass123!",
  "role": "TEACHER",
  "department": "Science",
  "designation": "Teacher",
  "employmentType": "FULL_TIME",
  "phone": "+1-555-1234",
  "qualifications": "M.Sc. Physics"
}
```

---

### Academic API

#### GET /api/academic/years

List academic years.

**Required Role**: All authenticated users

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "2024-2025",
      "startDate": "2024-08-01",
      "endDate": "2025-05-31",
      "isCurrent": true
    }
  ]
}
```

#### POST /api/academic/years

Create academic year.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN

**Request Body**
```json
{
  "name": "2025-2026",
  "startDate": "2025-08-01",
  "endDate": "2026-05-31",
  "isCurrent": false
}
```

#### GET /api/academic/classes

List classes.

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Grade 5",
      "level": 5,
      "description": "Fifth Grade",
      "sections": [
        { "id": "uuid", "name": "A", "maxCapacity": 40 },
        { "id": "uuid", "name": "B", "maxCapacity": 40 }
      ]
    }
  ]
}
```

#### GET /api/academic/subjects

List subjects.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| schoolId | string | Filter by school |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mathematics",
      "code": "MATH101",
      "type": "CORE",
      "creditHours": 4
    }
  ]
}
```

#### GET /api/academic/teaching-assignments

List teaching assignments.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "staffId": "uuid",
      "subjectId": "uuid",
      "sectionId": "uuid",
      "Staff": {
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "Subject": {
        "name": "Mathematics"
      },
      "Section": {
        "name": "A",
        "Class": { "name": "Grade 5" }
      }
    }
  ]
}
```

---

### Attendance API

#### GET /api/attendance

List attendance records.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| sectionId | string | Required - Section ID |
| date | string | Required - Date (YYYY-MM-DD) |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "studentId": "uuid",
      "date": "2024-01-15",
      "status": "PRESENT",
      "remarks": null,
      "Student": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ]
}
```

#### POST /api/attendance

Mark attendance.

**Required Role**: TEACHER, SCHOOL_ADMIN

**Request Body**
```json
{
  "sectionId": "uuid",
  "academicYearId": "uuid",
  "date": "2024-01-15",
  "records": [
    { "studentId": "uuid", "status": "PRESENT" },
    { "studentId": "uuid", "status": "ABSENT", "remarks": "Sick" }
  ]
}
```

#### GET /api/attendance/reports

Get attendance reports.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| sectionId | string | Section ID |
| academicYearId | string | Academic Year ID |
| startDate | string | Start date |
| endDate | string | End date |

#### GET /api/attendance/staff

Get staff attendance.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN

---

### Examinations API

#### GET /api/exams

List examinations.

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mid-Term Exam",
      "startDate": "2024-10-01",
      "endDate": "2024-10-15",
      "isPublished": false,
      "AcademicYear": { "name": "2024-2025" }
    }
  ]
}
```

#### POST /api/exams

Create examination.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN

**Request Body**
```json
{
  "name": "Mid-Term Exam",
  "academicYearId": "uuid",
  "termId": "uuid",
  "startDate": "2024-10-01",
  "endDate": "2024-10-15"
}
```

#### GET /api/exams/:id/subjects

Get exam subjects.

#### POST /api/exams/:id/subjects

Add subject to exam.

**Request Body**
```json
{
  "subjectId": "uuid",
  "sectionId": "uuid",
  "maxMarks": 100,
  "passMark": 40,
  "examDate": "2024-10-05",
  "startTime": "09:00",
  "duration": 180
}
```

#### GET /api/exams/:id/results

Get exam results.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| subjectId | string | Subject ID |
| sectionId | string | Section ID |

#### POST /api/exams/:id/results

Enter exam results.

**Request Body**
```json
{
  "subjectId": "uuid",
  "results": [
    { "studentId": "uuid", "marksObtained": 85, "remarks": "Good" }
  ]
}
```

#### GET /api/exams/:id/report

Generate exam report.

---

### Finance API

#### GET /api/finance/fee-categories

List fee categories.

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Tuition Fee",
      "description": "Annual tuition",
      "isRecurring": true
    }
  ]
}
```

#### POST /api/finance/fee-categories

Create fee category.

**Request Body**
```json
{
  "name": "Transport Fee",
  "description": "Monthly transport charges",
  "isRecurring": true
}
```

#### GET /api/finance/fee-structures

List fee structures.

#### POST /api/finance/fee-structures

Create fee structure.

**Request Body**
```json
{
  "feeCategoryId": "uuid",
  "classId": "uuid",
  "academicYearId": "uuid",
  "amount": 5000,
  "dueDay": 10
}
```

#### GET /api/finance/invoices

List invoices.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | UNPAID, PARTIALLY_PAID, PAID, OVERDUE |
| studentId | string | Filter by student |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2024-0001",
      "totalAmount": 5000,
      "paidAmount": 2500,
      "dueDate": "2024-01-10",
      "status": "PARTIALLY_PAID",
      "Student": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ]
}
```

#### POST /api/finance/invoices

Create invoice.

#### GET /api/finance/invoices/:id

Get invoice details.

#### POST /api/finance/payments

Record a payment.

**Request Body**
```json
{
  "invoiceId": "uuid",
  "amount": 2500,
  "method": "BANK_TRANSFER",
  "transactionId": "TXN123456",
  "notes": "Payment via online banking"
}
```

#### GET /api/finance/reports

Get financial reports.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | collection, defaulters, revenue |
| startDate | string | Start date |
| endDate | string | End date |

---

### Library API

#### GET /api/library/books

List books.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by title, author, ISBN |
| category | string | Filter by category |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "isbn": "978-0-123456-78-9",
      "title": "Introduction to Physics",
      "authors": "John Smith",
      "publisher": "Academic Press",
      "category": "Science",
      "totalCopies": 5,
      "BookCopy": [
        { "id": "uuid", "copyNumber": "COPY-1", "isAvailable": true }
      ]
    }
  ]
}
```

#### POST /api/library/books

Add a new book.

**Request Body**
```json
{
  "isbn": "978-0-123456-78-9",
  "title": "Introduction to Physics",
  "authors": "John Smith",
  "publisher": "Academic Press",
  "category": "Science",
  "shelfLocation": "A-101",
  "totalCopies": 5
}
```

#### GET /api/library/borrow

List borrow records.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | active, returned, overdue |
| studentId | string | Filter by student |

#### POST /api/library/borrow

Issue a book.

**Request Body**
```json
{
  "bookCopyId": "uuid",
  "studentId": "uuid",
  "expectedReturn": "2024-02-15"
}
```

#### PUT /api/library/borrow/:id/return

Return a book.

**Request Body**
```json
{
  "finePaid": true
}
```

---

### Transport API

#### GET /api/transport/routes

List transport routes.

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Route A - North",
      "code": "RT-A",
      "startPoint": "Central Station",
      "endPoint": "School",
      "stops": [
        { "name": "Stop 1", "time": "07:30" },
        { "name": "Stop 2", "time": "07:45" }
      ],
      "Vehicle": {
        "registration": "ABC-123",
        "capacity": 40
      }
    }
  ]
}
```

#### POST /api/transport/routes

Create transport route.

**Request Body**
```json
{
  "name": "Route A - North",
  "code": "RT-A",
  "startPoint": "Central Station",
  "endPoint": "School",
  "stops": [
    { "name": "Stop 1", "time": "07:30" },
    { "name": "Stop 2", "time": "07:45" }
  ],
  "vehicleId": "uuid"
}
```

#### GET /api/transport/vehicles

List vehicles.

#### POST /api/transport/vehicles

Add vehicle.

**Request Body**
```json
{
  "registration": "ABC-123",
  "make": "Toyota",
  "model": "Coaster",
  "year": 2022,
  "capacity": 40,
  "driverId": "uuid"
}
```

#### GET /api/transport/drivers

List drivers.

#### POST /api/transport/drivers

Add driver.

**Request Body**
```json
{
  "firstName": "Mike",
  "lastName": "Johnson",
  "licenseNumber": "DL-123456",
  "licenseExpiry": "2026-12-31",
  "phone": "+1-555-1234"
}
```

---

### Communication API

#### GET /api/announcements

List announcements.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| targetRole | string | Filter by target role |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Winter Break Notice",
      "content": "School will be closed...",
      "isPublished": true,
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "author": {
        "name": "Admin"
      }
    }
  ]
}
```

#### POST /api/announcements

Create announcement.

**Request Body**
```json
{
  "title": "Winter Break Notice",
  "content": "School will be closed from Dec 20 to Jan 5.",
  "targetRole": "ALL",
  "isPublished": true
}
```

#### GET /api/events

List events.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Filter from date |
| endDate | string | Filter to date |
| category | string | HOLIDAY, EXAM, SPORTS, CULTURAL, MEETING |

#### POST /api/events

Create event.

**Request Body**
```json
{
  "title": "Annual Sports Day",
  "description": "Inter-house sports competition",
  "startDate": "2024-03-15T09:00:00.000Z",
  "endDate": "2024-03-15T17:00:00.000Z",
  "location": "School Ground",
  "category": "SPORTS",
  "visibility": "ALL"
}
```

#### GET /api/messages

List messages.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| folder | string | inbox, sent |

#### POST /api/messages

Send message.

**Request Body**
```json
{
  "receiverId": "uuid",
  "subject": "Regarding assignment",
  "content": "Please submit by Friday."
}
```

#### POST /api/messages/mark-read

Mark messages as read.

**Request Body**
```json
{
  "messageIds": ["uuid1", "uuid2"]
}
```

---

### HR API

#### GET /api/hr/payroll

List payroll records.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| month | integer | Month (1-12) |
| year | integer | Year |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "month": 1,
      "year": 2024,
      "totalAmount": 150000,
      "isApproved": true,
      "PayrollItem": [
        {
          "staffId": "uuid",
          "grossSalary": 5000,
          "netSalary": 4200,
          "Staff": {
            "firstName": "Jane",
            "lastName": "Smith"
          }
        }
      ]
    }
  ]
}
```

#### POST /api/hr/payroll

Create payroll.

**Request Body**
```json
{
  "academicYearId": "uuid",
  "month": 1,
  "year": 2024
}
```

#### PUT /api/hr/payroll/:id/approve

Approve payroll.

#### GET /api/hr/payroll/:id/payslip

Generate payslip PDF.

#### GET /api/hr/salary

List salary structures.

#### POST /api/hr/salary

Create salary structure.

**Request Body**
```json
{
  "staffId": "uuid",
  "basicSalary": 4000,
  "housingAllowance": 500,
  "transportAllowance": 200,
  "taxDeduction": 300,
  "pensionDeduction": 200
}
```

#### GET /api/hr/leave

List leave applications.

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | PENDING, APPROVED, REJECTED |
| staffId | string | Filter by staff |

#### POST /api/hr/leave

Apply for leave.

**Request Body**
```json
{
  "staffId": "uuid",
  "type": "ANNUAL",
  "startDate": "2024-02-01",
  "endDate": "2024-02-05",
  "reason": "Family vacation"
}
```

#### PUT /api/hr/leave/:id

Update leave application (approve/reject).

**Request Body**
```json
{
  "status": "APPROVED",
  "reviewNotes": "Approved"
}
```

---

### Audit Logs API

#### GET /api/audit-logs

List audit logs.

**Required Role**: SUPER_ADMIN, SCHOOL_ADMIN, IT_ADMIN

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| userId | string | Filter by user |
| action | string | Filter by action type |
| entityType | string | Filter by entity type |
| startDate | string | Filter from date |
| endDate | string | Filter to date |
| search | string | Search query |

**Response**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "CREATE",
      "entityType": "Student",
      "entityId": "uuid",
      "ipAddress": "192.168.1.1",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "User": {
        "name": "Admin User",
        "email": "admin@baraka.sc.tz",
        "role": "SCHOOL_ADMIN"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1000,
    "totalPages": 50
  },
  "filters": {
    "entityTypes": ["Student", "Staff", "Invoice"],
    "actions": ["CREATE", "UPDATE", "DELETE", "LOGIN"]
  }
}
```

---

## OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

```
GET /api/docs/openapi.json
```

### OpenAPI Schema Example

```yaml
openapi: 3.0.0
info:
  title: School Management System API
  version: 1.0.0
  description: API for managing school operations
  
servers:
  - url: https://your-domain.com/api
    description: Production server
  - url: http://localhost:3000/api
    description: Development server

paths:
  /students:
    get:
      summary: List all students
      tags:
        - Students
      security:
        - session: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: search
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Student'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

components:
  securitySchemes:
    session:
      type: apiKey
      in: cookie
      name: next-auth.session-token
      
  schemas:
    Student:
      type: object
      properties:
        id:
          type: string
          format: uuid
        studentId:
          type: string
        firstName:
          type: string
        lastName:
          type: string
        email:
          type: string
        status:
          type: string
          enum: [ACTIVE, GRADUATED, TRANSFERRED, SUSPENDED, EXPELLED]
          
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
```

---

## Rate Limiting

API requests are rate-limited to ensure fair usage:

| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Default | 60 | 10,000 |
| Premium | 300 | 50,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067200
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```

---

## Webhooks

Configure webhooks to receive real-time notifications for system events.

### Available Events

| Event | Description |
|-------|-------------|
| student.created | New student enrolled |
| student.updated | Student details updated |
| attendance.marked | Attendance recorded |
| fee.paid | Fee payment received |
| exam.result.published | Exam results published |
| message.received | New message received |

### Webhook Payload

```json
{
  "event": "student.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "id": "uuid",
    "studentId": "SMS-2024-00001",
    "firstName": "John",
    "lastName": "Doe"
  },
  "signature": "sha256=..."
}
```

### Configuring Webhooks

1. Navigate to `Settings > Integrations > Webhooks`
2. Click "Add Webhook"
3. Enter endpoint URL
4. Select events to subscribe
5. Save configuration

### Verifying Webhooks

Verify webhook authenticity using the signature header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('/api/students', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});
const { data, pagination } = await response.json();

// Using axios
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const { data } = await api.get('/students', {
  params: { page: 1, limit: 20 }
});
```

### Python

```python
import requests

session = requests.Session()
session.auth = ('user@example.com', 'password')

# Login
session.post('https://your-domain.com/api/auth/signin/credentials', json={
    'email': 'user@example.com',
    'password': 'password'
})

# Get students
response = session.get('https://your-domain.com/api/students')
data = response.json()
```

---

## Document Version

- **Version**: 1.0.0
- **Last Updated**: March 2026
- **Author**: School Management System Team