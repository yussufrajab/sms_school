## 📌 Software System Requirements – School Management System (SMS)

A **School Management System (SMS)** is software used to manage daily school operations like students, teachers, classes, exams, fees, attendance, and communication.

------

## 👥 User Roles in a School Management System

Typical user roles include:

### 1️⃣ Admin (Super Admin / School Admin)

- Manage users (teachers, students, parents)
- Create classes, sections, subjects
- Set academic years and timetables
- Configure system settings
- Generate reports
- Manage roles and permissions

### 2️⃣ Teachers

- Mark attendance
- Upload grades and exam results
- Manage class activities and assignments
- Share study materials
- Communicate with students and parents

### 3️⃣ Students

- View timetable
- Check attendance
- View exam results and grades
- Download learning materials
- Submit assignments
- Receive announcements

### 4️⃣ Parents / Guardians

- View child’s attendance
- Track academic performance
- View fee status
- Receive school notifications
- Communicate with teachers

### 5️⃣ Accountant / Finance Staff (Optional)

- Manage fee structures
- Track payments and dues
- Generate financial reports
- Manage invoices and receipts

### 6️⃣ Librarian (Optional)

- Manage books
- Track issued/returned books
- Handle fines
- Generate library reports

------

## ⚙️ Functional Requirements

(What the system should DO)

### 🔐 User Management

- Users can log in with username and password
- Admin can create, update, delete users
- Role-based access control (Admin, Teacher, Student, Parent)

### 🏫 Student Management

- Add/edit student profiles
- Assign students to classes and sections
- Promote students to next class
- View student history

### 👨‍🏫 Teacher Management

- Add and manage teacher profiles
- Assign teachers to subjects and classes
- View teaching schedules

### 📚 Academic Management

- Create subjects and courses
- Create class schedules / timetables
- Manage academic years and terms

### 📝 Attendance Management

- Teachers can mark daily attendance
- Students and parents can view attendance
- Generate attendance reports

### 📊 Examination & Results

- Create exams
- Enter marks and grades
- Generate report cards
- View performance analytics

### 💬 Communication

- Send announcements
- Teacher–parent messaging
- Notifications for exams, holidays, fees

### 💰 Fee Management

- Define fee structure
- Track fee payments
- Generate invoices and receipts
- Notify parents about due payments

### 📂 Document Management

- Upload assignments, study materials
- Download report cards
- Store certificates

### 📈 Reports & Analytics

- Student performance reports
- Attendance reports
- Financial summaries
- Teacher workload reports

------

## 🛡️ Non-Functional Requirements

(How the system should behave)

### ⚡ Performance

- System should support at least 1,000 concurrent users
- Page load time should be under 3 seconds
- Reports should generate within 5 seconds

### 🔐 Security

- Passwords must be encrypted
- Role-based access control
- Secure login and session handling
- Protection against SQL injection & XSS
- Regular backups

### 📱 Usability

- User-friendly interface
- Mobile-friendly (responsive design)
- Simple navigation for non-technical users
- Clear error messages

### 🧩 Scalability

- System should support growth in number of students and staff
- Should allow adding new modules (e.g., hostel, transport)

### 🛠️ Reliability & Availability

- System uptime of 99.5%
- Automatic data backup
- Recovery from crashes

### 🔄 Maintainability

- Modular code structure
- Easy to update and fix bugs
- Proper documentation

### 🌐 Compatibility

- Works on Chrome, Firefox, Edge
- Supports mobile and desktop
- Cross-platform support

### 🗃️ Data Integrity

- No data duplication
- Consistent records across modules
- Validation of user input

------

## 🧪 Example (for SRS format)

> **Functional Requirement (FR-01):**
>  The system shall allow teachers to record student attendance daily.
>
> **Non-Functional Requirement (NFR-01):**
>  The system shall process attendance submission within 2 seconds.

------