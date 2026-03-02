# School Management System - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Role-Based Guides](#role-based-guides)
   - [Super Admin](#super-admin)
   - [School Admin](#school-admin)
   - [Teacher](#teacher)
   - [Student](#student)
   - [Parent](#parent)
   - [Accountant](#accountant)
   - [Librarian](#librarian)
   - [Receptionist](#receptionist)
   - [IT Admin](#it-admin)
4. [Common Features](#common-features)
5. [Troubleshooting](#troubleshooting)

---

## Introduction

The School Management System (SMS) is a comprehensive platform designed to streamline school operations, enhance communication, and improve educational outcomes. This guide provides detailed instructions for all user roles.

### System Requirements

- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Internet**: Stable internet connection (5 Mbps+ recommended)
- **Screen**: Minimum 1024x768 resolution

---

## Getting Started

### Logging In

1. Navigate to your school's SMS URL (e.g., `https://yourschool.edu/sms`)
2. Enter your registered email address
3. Enter your password
4. Click "Sign In"

### First-Time Login

1. You will receive a welcome email with your temporary password
2. On first login, you'll be prompted to change your password
3. Choose a strong password (minimum 8 characters, including uppercase, lowercase, number, and special character)
4. Optionally enable Two-Factor Authentication (2FA) in Settings

### Dashboard Overview

After logging in, you'll see your personalized dashboard with:
- **Quick Actions**: Shortcuts to common tasks
- **Pending Tasks**: Items requiring your attention
- **Statistics**: Key metrics relevant to your role
- **Recent Activity**: Latest updates and notifications

---

## Role-Based Guides

### Super Admin

Super Admins have full system access across all schools in the platform.

#### Key Responsibilities

- Multi-school management
- System-wide configuration
- User role management
- Platform monitoring

#### Features

##### School Management

1. **Create New School**
   - Navigate to `Admin > Schools`
   - Click "Add School"
   - Fill in school details (name, code, address, contact info)
   - Configure ID formats for students and staff
   - Set timezone and currency

2. **Edit School Settings**
   - Select school from the list
   - Update details as needed
   - Configure academic settings

##### User Management

1. **Create School Admin**
   - Navigate to `Admin > Users`
   - Click "Add User"
   - Select role "School Admin"
   - Fill in user details
   - Assign to school

2. **Manage Roles**
   - View all users by role
   - Modify user permissions
   - Deactivate/activate accounts

##### System Monitoring

- **Audit Logs**: `Admin > Audit Logs`
  - View all system activities
  - Filter by user, action, date range
  - Export logs for compliance

- **Health Check**: `Admin > System Health`
  - Database status
  - API response times
  - Error rates

---

### School Admin

School Admins manage all operations within their assigned school.

#### Key Responsibilities

- Student and staff management
- Academic configuration
- Fee structure setup
- Attendance monitoring
- Report generation

#### Features

##### Student Management

1. **Add New Student**
   - Navigate to `Students`
   - Click "Add Student"
   - Fill in personal details:
     - First name, last name
     - Date of birth
     - Gender
     - Contact information
   - Assign to class and section
   - Link parents/guardians
   - Upload documents (birth certificate, previous records)

2. **Bulk Import Students**
   - Navigate to `Students > Import`
   - Download the template
   - Fill in student data
   - Upload the completed file
   - Review and confirm import

3. **Student Profile**
   - View personal information
   - Attendance history
   - Academic records
   - Fee status
   - Disciplinary records

##### Staff Management

1. **Add Staff Member**
   - Navigate to `Staff`
   - Click "Add Staff"
   - Fill in personal and employment details
   - Assign role (Teacher, Accountant, etc.)
   - Set department and designation
   - Configure salary structure

2. **Teaching Assignments**
   - Navigate to `Academic > Teaching Assignments`
   - Assign teachers to subjects and sections
   - Manage workload distribution

##### Academic Configuration

1. **Academic Years**
   - Navigate to `Academic > Years`
   - Create academic year
   - Set start and end dates
   - Mark current year

2. **Terms/Semesters**
   - Create terms within academic year
   - Set term dates
   - Configure grading periods

3. **Classes and Sections**
   - Create classes (Grade 1, Grade 2, etc.)
   - Create sections (A, B, C)
   - Set maximum capacity
   - Assign class teachers

4. **Subjects**
   - Create subjects
   - Set subject type (Core/Elective)
   - Assign credit hours
   - Link to classes

##### Fee Management

1. **Fee Categories**
   - Navigate to `Finance > Fee Categories`
   - Create categories (Tuition, Transport, Library, etc.)
   - Set recurring or one-time fees

2. **Fee Structure**
   - Navigate to `Finance > Fee Structures`
   - Set amounts per category
   - Assign to classes
   - Set due dates

3. **Generate Invoices**
   - Navigate to `Finance > Invoices`
   - Select academic year and term
   - Choose students/classes
   - Generate bulk invoices

##### Attendance

1. **View Attendance**
   - Navigate to `Attendance`
   - Select date range
   - Filter by class/section
   - View attendance statistics

2. **Attendance Reports**
   - Generate class-wise reports
   - Student attendance history
   - Attendance trends

##### Reports

1. **Academic Reports**
   - Student performance reports
   - Class rankings
   - Subject-wise analysis

2. **Financial Reports**
   - Fee collection reports
   - Defaulters list
   - Revenue analysis

3. **Attendance Reports**
   - Daily/monthly attendance
   - Absenteeism trends

---

### Teacher

Teachers manage their assigned classes, subjects, and student interactions.

#### Key Responsibilities

- Mark attendance
- Create assignments
- Grade submissions
- Enter exam results
- Communicate with parents

#### Features

##### Dashboard

Your dashboard shows:
- Today's schedule
- Pending assignments to grade
- Quick attendance marking
- Recent messages

##### Attendance Management

1. **Mark Daily Attendance**
   - Navigate to `Attendance > Mark Attendance`
   - Select your class/section
   - Mark students as:
     - Present (P)
     - Absent (A)
     - Late (L)
     - Excused (E)
   - Add remarks if needed
   - Submit attendance

2. **View Attendance History**
   - Navigate to `Attendance > History`
   - Select date range
   - View attendance records

##### Assignments

1. **Create Assignment**
   - Navigate to `Assignments`
   - Click "Create Assignment"
   - Fill in details:
     - Title and description
     - Subject and class
     - Due date
     - Maximum marks
     - Allow late submissions
     - Attach files
   - Publish to students

2. **Grade Submissions**
   - Navigate to `Assignments > Submissions`
   - Select assignment
   - View student submissions
   - Enter marks
   - Add feedback
   - Return to student

3. **Assignment Analytics**
   - View submission rates
   - Average scores
   - Students needing attention

##### Examinations

1. **Enter Exam Results**
   - Navigate to `Examinations`
   - Select exam and subject
   - Enter marks for each student
   - Add remarks
   - Submit results

2. **Generate Reports**
   - View class performance
   - Subject-wise analysis
   - Student progress reports

##### Timetable

- View your teaching schedule
- Check classroom assignments
- View substitute requirements

##### Communication

1. **Send Messages**
   - Navigate to `Communication > Messages`
   - Compose new message
   - Select recipients (students, parents, colleagues)
   - Send message

2. **Announcements**
   - Create class announcements
   - Share important updates
   - Attach files

---

### Student

Students access their academic information, assignments, and schedules.

#### Key Responsibilities

- View attendance
- Submit assignments
- Check exam results
- Access timetable
- Communicate with teachers

#### Features

##### Dashboard

Your dashboard shows:
- Today's schedule
- Pending assignments
- Recent grades
- Upcoming events
- Quick links

##### Attendance

- View attendance history
- Check attendance percentage
- View attendance alerts

##### Assignments

1. **View Assignments**
   - Navigate to `Assignments`
   - View all assignments by subject
   - Check due dates
   - View submission status

2. **Submit Assignment**
   - Open assignment
   - Add your response
   - Attach files (if allowed)
   - Submit before deadline

3. **View Grades**
   - Check assignment grades
   - View teacher feedback
   - Track performance

##### Examinations

1. **View Exam Schedule**
   - Navigate to `Examinations`
   - View upcoming exams
   - Check dates, times, venues

2. **View Results**
   - Check exam results when published
   - View subject-wise marks
   - Check class rank

##### Timetable

- View weekly schedule
- Check subject timings
- View classroom locations

##### Library

- Search books
- View borrowed books
- Check due dates
- Reserve books

##### Fee Status

- View fee invoices
- Check payment status
- Download receipts

---

### Parent

Parents monitor their children's academic progress and school communications.

#### Key Responsibilities

- Monitor children's progress
- View attendance
- Pay fees
- Communicate with teachers
- Attend school events

#### Features

##### Dashboard

Your dashboard shows:
- Children overview
- Fee status
- Recent messages
- Upcoming events
- Attendance alerts

##### Children Overview

1. **View All Children**
   - See all linked children
   - View class and section
   - Check attendance percentage
   - View average grades
   - Check pending assignments

2. **Child Profile**
   - Click on child's name
   - View detailed information:
     - Attendance history
     - Academic performance
     - Fee status
     - Disciplinary records

##### Attendance

- View attendance for each child
- Check attendance alerts
- View attendance trends

##### Academic Progress

1. **View Results**
   - Navigate to `Examinations`
   - Select child
   - View exam results
   - Check subject-wise performance

2. **Performance Charts**
   - View grade trends
   - Compare performance across terms
   - Identify areas needing attention

##### Fee Management

1. **View Invoices**
   - Navigate to `Finance > Invoices`
   - View all pending invoices
   - Check due dates
   - View payment history

2. **Pay Fees**
   - Select invoice
   - Choose payment method
   - Complete payment
   - Download receipt

3. **Payment History**
   - View all payments made
   - Download receipts
   - Track fee status

##### Communication

1. **Messages**
   - View messages from teachers
   - Send messages to teachers
   - View announcements

2. **Events**
   - View upcoming school events
   - RSVP for events
   - Add to calendar

---

### Accountant

Accountants manage all financial operations of the school.

#### Key Responsibilities

- Fee collection
- Invoice management
- Payroll processing
- Financial reporting
- Expense tracking

#### Features

##### Dashboard

Your dashboard shows:
- Fee collection status
- Pending payments
- Overdue amounts
- Payroll summary
- Recent transactions

##### Fee Collection

1. **Record Payment**
   - Navigate to `Finance > Payments`
   - Search student
   - Enter payment details:
     - Amount
     - Payment method (Cash, Bank Transfer, Card)
     - Receipt number
   - Generate receipt

2. **View Collections**
   - Daily collection summary
   - Monthly trends
   - Collection by category

##### Invoice Management

1. **Generate Invoices**
   - Navigate to `Finance > Invoices`
   - Select academic year/term
   - Choose students
   - Generate invoices

2. **Manage Invoices**
   - View all invoices
   - Update invoice status
   - Send reminders
   - Apply discounts

3. **Defaulters List**
   - View overdue invoices
   - Filter by days overdue
   - Send bulk reminders

##### Fee Structure

1. **Create Fee Categories**
   - Navigate to `Finance > Fee Categories`
   - Add categories
   - Set recurring/one-time

2. **Configure Fee Structure**
   - Set amounts per category
   - Assign to classes
   - Set due dates

##### Payroll

1. **Process Payroll**
   - Navigate to `HR > Payroll`
   - Select month/year
   - Review salary calculations
   - Process payroll

2. **Generate Payslips**
   - View individual payslips
   - Download/print payslips
   - Email to staff

3. **Salary Structure**
   - Configure salary components
   - Set allowances
   - Configure deductions

##### Reports

1. **Collection Reports**
   - Daily/Monthly/Yearly collection
   - Category-wise collection
   - Class-wise collection

2. **Defaulters Report**
   - List of defaulters
   - Amount overdue
   - Days overdue

3. **Financial Summary**
   - Revenue breakdown
   - Expense summary
   - Profit/Loss statement

---

### Librarian

Librarians manage the school library resources and borrowing operations.

#### Key Responsibilities

- Book catalog management
- Borrowing/returning operations
- Fine management
- Library reports

#### Features

##### Dashboard

Your dashboard shows:
- Total books and copies
- Available vs borrowed
- Overdue books
- Outstanding fines
- Recent borrows

##### Book Management

1. **Add New Book**
   - Navigate to `Library > Books`
   - Click "Add Book"
   - Enter book details:
     - ISBN
     - Title
     - Authors
     - Publisher
     - Category
     - Shelf location
   - Set total copies
   - Upload cover image

2. **Edit Book**
   - Search for book
   - Update details
   - Add/remove copies

3. **Book Catalog**
   - View all books
   - Search by title, author, ISBN
   - Filter by category
   - Check availability

##### Borrowing Operations

1. **Issue Book**
   - Navigate to `Library > Borrow`
   - Scan/enter book copy ID
   - Enter student ID
   - Set due date
   - Confirm issue

2. **Return Book**
   - Navigate to `Library > Borrow`
   - Scan/enter book copy ID
   - Calculate fine if overdue
   - Process return

3. **Renew Book**
   - Extend borrowing period
   - Update due date

##### Overdue Management

1. **View Overdue Books**
   - List of overdue books
   - Days overdue
   - Fine amount

2. **Send Reminders**
   - Send overdue notices
   - Email/SMS reminders

##### Fine Management

1. **Collect Fine**
   - Navigate to `Library > Fines`
   - View outstanding fines
   - Collect payment
   - Generate receipt

2. **Fine Reports**
   - Total fines collected
   - Outstanding fines
   - Monthly collection

##### Reports

- Books borrowed (daily/monthly)
- Most popular books
- Category-wise statistics
- Member statistics

---

### Receptionist

Receptionists manage front desk operations and visitor management.

#### Key Responsibilities

- Visitor management
- Appointment scheduling
- Enquiry handling
- Announcement management

#### Features

##### Dashboard

Your dashboard shows:
- Today's visitors
- Pending appointments
- New enquiries
- Active visitors in building

##### Visitor Management

1. **Check-In Visitor**
   - Navigate to `Reception > Check-In`
   - Enter visitor details:
     - Name
     - Purpose of visit
     - Person to meet
     - Contact number
   - Issue visitor pass
   - Record check-in time

2. **Check-Out Visitor**
   - Select active visitor
   - Record check-out time
   - Update visitor log

3. **Visitor Log**
   - View all visitors
   - Filter by date
   - Export visitor records

##### Appointments

1. **Schedule Appointment**
   - Navigate to `Reception > Appointments`
   - Enter appointment details:
     - Visitor name
     - Person to meet
     - Date and time
     - Purpose
   - Send confirmation

2. **Manage Appointments**
   - View today's appointments
   - Reschedule/cancel
   - Send reminders

##### Enquiries

1. **New Enquiry**
   - Navigate to `Students > Enquiries`
   - Enter parent details
   - Enter child details
   - Select class sought
   - Record contact information

2. **Follow-Up**
   - Track enquiry status
   - Schedule follow-ups
   - Convert to admission

##### Announcements

1. **Create Announcement**
   - Navigate to `Communication > Announcements`
   - Enter title and content
   - Select target audience
   - Publish announcement

2. **Manage Announcements**
   - View all announcements
   - Edit/Delete
   - Archive old announcements

---

### IT Admin

IT Admins manage technical aspects and system configuration.

#### Key Responsibilities

- User support
- System configuration
- Data backup
- Technical troubleshooting

#### Features

##### User Management

1. **Create Users**
   - Create accounts for all roles
   - Set initial passwords
   - Assign roles

2. **Reset Passwords**
   - Reset user passwords
   - Generate temporary passwords
   - Force password change

3. **Manage Sessions**
   - View active sessions
   - Revoke sessions
   - Force logout

##### System Configuration

1. **School Settings**
   - Configure school details
   - Set ID formats
   - Configure timezone

2. **Notification Settings**
   - Configure email settings
   - Set up SMS gateway
   - Manage notification templates

##### Audit Logs

- View all system activities
- Track user actions
- Export audit reports
- Monitor security events

##### Data Management

1. **Backup Data**
   - Schedule automatic backups
   - Manual backup creation
   - Backup verification

2. **Restore Data**
   - Restore from backup
   - Point-in-time recovery

---

## Common Features

### Profile Management

1. **Update Profile**
   - Navigate to `Profile`
   - Update personal information
   - Change profile picture
   - Update contact details

2. **Change Password**
   - Navigate to `Settings > Security`
   - Enter current password
   - Enter new password
   - Confirm password change

### Notifications

1. **View Notifications**
   - Click bell icon in header
   - View all notifications
   - Mark as read

2. **Notification Preferences**
   - Navigate to `Settings > Notifications`
   - Configure email notifications
   - Set push notification preferences

### Messages

1. **Compose Message**
   - Navigate to `Communication > Messages`
   - Click "Compose"
   - Select recipients
   - Write message
   - Send

2. **View Messages**
   - Inbox: Received messages
   - Sent: Sent messages
   - Archive: Archived messages

### Export Data

1. **Export to CSV/Excel**
   - Look for "Export" button on data pages
   - Select format (CSV, Excel, PDF)
   - Download file

2. **Import Data**
   - Navigate to import section
   - Download template
   - Fill data
   - Upload file

---

## Troubleshooting

### Login Issues

**Problem**: Cannot log in

**Solutions**:
1. Check email spelling
2. Reset password using "Forgot Password"
3. Clear browser cache
4. Try a different browser
5. Contact administrator

### Page Not Loading

**Problem**: Page shows blank or error

**Solutions**:
1. Refresh the page (F5)
2. Clear browser cache
3. Check internet connection
4. Try a different browser
5. Contact IT support

### Data Not Saving

**Problem**: Changes not saved

**Solutions**:
1. Check required fields
2. Look for validation errors
3. Check internet connection
4. Try again after some time
5. Contact administrator

### Permission Denied

**Problem**: Cannot access certain features

**Solutions**:
1. Check your role permissions
2. Contact administrator for access
3. Verify you're logged in with correct account

### Reports Not Generating

**Problem**: Reports not downloading

**Solutions**:
1. Check popup blocker settings
2. Try a different browser
3. Check download folder
4. Contact IT support

---

## Getting Help

### In-App Help

- Click help icon (?) on any page
- View contextual help
- Access video tutorials

### Support Contacts

- **Technical Support**: support@yourschool.edu
- **Phone**: +1-XXX-XXX-XXXX
- **Help Desk**: Available during school hours

### Feedback

We value your feedback! Send suggestions and report issues through:
- In-app feedback form
- Email to feedback@yourschool.edu
- Suggestion box at reception

---

## Glossary

| Term | Definition |
|------|------------|
| Academic Year | The school year period (e.g., 2024-2025) |
| Section | A subdivision of a class (e.g., Grade 5-A) |
| Term | A division of the academic year |
| Credit Hours | Weight assigned to a subject |
| Defaulters | Students with unpaid fees |
| Payroll | Salary processing for staff |
| Audit Log | Record of all system activities |
| Timetable | Class schedule |
| Assignment | Task given to students |
| Invoice | Bill for fees |

---

## Document Version

- **Version**: 1.0.0
- **Last Updated**: March 2026
- **Author**: School Management System Team