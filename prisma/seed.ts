import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const TEST_PASSWORD = "Test@123456";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

console.log("Database URL:", connectionString.replace(/:[^:@]+@/, ":****@"));

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Zanzibar Data Constants ────────────────────────────────────────────────

const ZANZIBAR_FIRST_NAMES_MALE = [
  "Mohamed", "Abubakar", "Rashid", "Hamisi", "Khamis", "Salim", "Said", "Yusuf",
  "Ali", "Omar", "Idris", "Farouk", "Hassan", "Ibrahim", "Mustafa", "Juma",
  "Foum", "Amani", "Baraka", "Daudi", "Hussein", "Mwalimu", "Suleiman",
  "Zubery", "Abdallah", "Makame", "Mwinyi", "Bakari", "Fadhili", "Shabani",
];

const ZANZIBAR_FIRST_NAMES_FEMALE = [
  "Fatma", "Amina", "Zainab", "Halima", "Aisha", "Mariam", "Khadija", "Hafsa",
  "Ashura", "Mwanamvua", "Mwanahamisi", "Sitti", "Bibi", "Saidatu", "Zuwena",
  "Maua", "Hamisa", "Salama", "Tumu", "Suhura", "Rukiya", "Safura", "Nuru",
  "Latifa", "Mwanakheri", "Rashida", "Ashura", "Mwajuma", "Saidia", "Baraka",
];

const ZANZIBAR_LAST_NAMES = [
  "Juma", "Hamisi", "Khamis", "Makame", "Mwinyi", "Haji", "Ramadhani",
  "Abdalla", "Salim", "Suleiman", "Mcha", "Bakari", "Kombo", "Shabani",
  "Mwalimu", "Mohamed", "Omar", "Ali", "Hassan", "Ibrahim", "Rashid",
  "Khatib", "Mzee", "Faki", "Mwadini", "Chanja", "Mzee", "Yusuf", "Kassim",
];

const ZANZIBAR_LOCATIONS = [
  "Mizingani Road, Stone Town", "Gizenga Street, Stone Town", "New Mkunazini Road, Stone Town",
  "Hurumzi Street, Stone Town", "Kiponda Street, Stone Town", "Baghani Street, Stone Town",
  "Malawi Road, Stonetown", "Suq el Msheliheni, Stone Town",
  "Nungwi Village, North Zanzibar", "Kendwa Beach Road, North Zanzibar",
  "Pwani Mchangani, North Zanzibar", "Matemwe Village, North Zanzibar",
  "Kiwwengwa Road, North Zanzibar", "Jambiani Village, South Zanzibar",
  "Paje Beach Road, South Zanzibar", "Bwejuu Village, South Zanzibar",
  "Dongwe Beach, South Zanzibar", "Makunduchi Village, South Zanzibar",
  "Chwaka Village, East Zanzibar", "Uroa Beach, East Zanzibar",
  "Michamvi Peninsula, South Zanzibar", "Kizimkazi Village, South Zanzibar",
  "Mbweni Road, Zanzibar Town", "Amani Road, Zanzibar Town",
  "Mwembeladu, Zanzibar Town", "Chake Chake, Pemba",
  "Wete Town, Pemba", "Mkoani, Pemba",
];

const ZANZIBAR_PHONE_PREFIXES = ["0777", "0776", "0773", "0771", "0765", "0766", "0622", "0623", "0655", "0656", "0713", "0716", "0784", "0786"];

function generateZanzibarPhone(): string {
  const prefix = ZANZIBAR_PHONE_PREFIXES[Math.floor(Math.random() * ZANZIBAR_PHONE_PREFIXES.length)];
  const suffix = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  return `${prefix}${suffix}`;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateStudentId(index: number): string {
  return `BAR-2025-${String(index).padStart(5, "0")}`;
}

function generateEmployeeId(index: number): string {
  return `EMP-2025-${String(index).padStart(3, "0")}`;
}

function generateInvoiceNumber(index: number): string {
  return `INV-2025-${String(index).padStart(5, "0")}`;
}

// ─── Main Seed ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting Zanzibar seed...\n");

  // Step 1: Wipe existing data in reverse dependency order
  console.log("🧹 Cleaning existing data...");
  const deleteOrder = [
    "verificationToken", "account", "session",
    "auditLog", "notification",
    "borrowRecord", "bookCopy", "book",
    "studentTransport", "route", "vehicle", "driver",
    "message", "event", "announcement",
    "payrollItem", "payroll",
    "leaveApplication", "performanceEvaluation", "salaryStructure", "staffAttendance",
    "payment", "invoiceItem", "invoice", "feeDiscount", "feeStructure", "feeCategory",
    "examResult", "examSubject", "exam",
    "assignmentSubmission", "assignment",
    "studentAttendance",
    "timetable", "teachingAssignment",
    "term", "academicYear",
    "studentParent", "student", "parent", "staff",
    "user",
    "section", "class", "subject",
    "school",
    "fileRecord",
  ];

  for (const model of deleteOrder) {
    try {
      // @ts-expect-error dynamic model deletion
      await prisma[model].deleteMany({});
    } catch {
      // skip if model doesn't exist
    }
  }
  console.log("✅ Data cleaned\n");

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ─── Step 2: School ─────────────────────────────────────────────────────
  console.log("🏫 Creating school...");
  const school = await prisma.school.create({
    data: {
      id: "school-baraka",
      name: "Baraka Academy Zanzibar",
      code: "BAR001",
      address: "Mizingani Road, Stone Town, Zanzibar",
      phone: "0777123456",
      email: "info@baraka-academy.sc.tz",
      website: "https://baraka-academy.sc.tz",
      timezone: "Africa/Dar_es_Salaam",
      currency: "TZS",
      studentIdFormat: "BAR-{year}-{seq}",
      employeeIdFormat: "EMP-{year}-{seq}",
      isActive: true,
      updatedAt: new Date(),
    },
  });
  console.log(`✅ School: ${school.name}\n`);

  // ─── Step 3: Academic Year + Terms ─────────────────────────────────────
  console.log("📅 Creating academic year and terms...");
  const academicYear = await prisma.academicYear.create({
    data: {
      id: "ay-2025",
      schoolId: school.id,
      name: "2025-2026",
      startDate: new Date("2025-01-13"),
      endDate: new Date("2025-12-12"),
      isCurrent: true,
    },
  });

  const terms = [
    { id: "term-1", name: "Term 1 (Msimu wa Kwanza)", startDate: new Date("2025-01-13"), endDate: new Date("2025-04-11") },
    { id: "term-2", name: "Term 2 (Msimu wa Pili)", startDate: new Date("2025-05-05"), endDate: new Date("2025-08-01") },
    { id: "term-3", name: "Term 3 (Msimu wa Tatu)", startDate: new Date("2025-09-01"), endDate: new Date("2025-12-12") },
  ];

  for (const t of terms) {
    await prisma.term.create({
      data: { ...t, academicYearId: academicYear.id },
    });
  }
  console.log("✅ Academic year + 3 terms\n");

  // ─── Step 4: Classes + Sections ────────────────────────────────────────
  console.log("📚 Creating classes and sections...");
  const classDefs = [
    { name: "Grade 1 (Darasa la 1)", level: 1 },
    { name: "Grade 2 (Darasa la 2)", level: 2 },
    { name: "Grade 3 (Darasa la 3)", level: 3 },
    { name: "Grade 4 (Darasa la 4)", level: 4 },
    { name: "Grade 5 (Darasa la 5)", level: 5 },
    { name: "Grade 6 (Darasa la 6)", level: 6 },
    { name: "Grade 7 (Darasa la 7)", level: 7 },
    { name: "Grade 8 (Darasa la 8)", level: 8 },
    { name: "Grade 9 (Darasa la 9)", level: 9 },
    { name: "Grade 10 (Darasa la 10)", level: 10 },
  ];

  const allSections: { id: string; name: string; classId: string; className: string }[] = [];

  for (let i = 0; i < classDefs.length; i++) {
    const cls = await prisma.class.create({
      data: {
        id: `class-${i + 1}`,
        schoolId: school.id,
        name: classDefs[i].name,
        level: classDefs[i].level,
      },
    });

    for (const secName of ["A", "B"]) {
      const sec = await prisma.section.create({
        data: {
          id: `section-${i + 1}-${secName}`,
          classId: cls.id,
          name: secName,
          maxCapacity: 35,
        },
      });
      allSections.push({ id: sec.id, name: secName, classId: cls.id, className: classDefs[i].name });
    }
  }
  console.log(`✅ 10 classes × 2 sections = ${allSections.length} sections\n`);

  // ─── Step 5: Subjects ──────────────────────────────────────────────────
  console.log("📖 Creating subjects...");
  const subjectDefs = [
    { name: "Hisabati (Mathematics)", code: "MATH101", type: "CORE" as const, creditHours: 5 },
    { name: "Kiswahili", code: "KISW101", type: "CORE" as const, creditHours: 4 },
    { name: "English Language", code: "ENG101", type: "CORE" as const, creditHours: 4 },
    { name: "Sayansi (Science)", code: "SCI101", type: "CORE" as const, creditHours: 4 },
    { name: "Jamii na Maadili (Social Studies)", code: "SS101", type: "CORE" as const, creditHours: 3 },
    { name: "Elimu ya Kompyuta (Computer Science)", code: "CS101", type: "CORE" as const, creditHours: 2 },
    { name: "Elimu ya Uchumi (Economics)", code: "ECO101", type: "CORE" as const, creditHours: 3 },
    { name: "Elimu ya Dini (Islamic Studies)", code: "ISL101", type: "CORE" as const, creditHours: 3 },
    { name: "Sanaa za Mwili (Physical Education)", code: "PE101", type: "ELECTIVE" as const, creditHours: 2 },
    { name: "Sanaa (Art & Design)", code: "ART101", type: "ELECTIVE" as const, creditHours: 2 },
    { name: "Muziki (Music)", code: "MUS101", type: "ELECTIVE" as const, creditHours: 2 },
    { name: "Kilimo (Agriculture)", code: "AGR101", type: "ELECTIVE" as const, creditHours: 2 },
  ];

  for (const s of subjectDefs) {
    await prisma.subject.create({
      data: {
        id: `subject-${s.code}`,
        schoolId: school.id,
        name: s.name,
        code: s.code,
        type: s.type,
        creditHours: s.creditHours,
      },
    });
  }
  console.log(`✅ ${subjectDefs.length} subjects\n`);

  // ─── Step 6: Users + Staff/Student/Parent ───────────────────────────────
  console.log("👥 Creating users...");

  // --- Admin Users ---
  const adminUsers = [
    { id: "user-superadmin", email: "superadmin@baraka.sc.tz", name: "Abdalla Mwalimu", role: UserRole.SUPER_ADMIN, schoolId: null },
    { id: "user-admin", email: "admin@baraka.sc.tz", name: "Khamis Haji", role: UserRole.SCHOOL_ADMIN, schoolId: school.id },
    { id: "user-itadmin", email: "itadmin@baraka.sc.tz", name: "Foum Khatib", role: UserRole.IT_ADMIN, schoolId: school.id },
  ];

  for (const u of adminUsers) {
    await prisma.user.create({
      data: { ...u, password: hashedPassword, isActive: true, emailVerified: now },
    });
  }

  // Create staff records for admin/IT
  await prisma.staff.create({ data: { id: "staff-admin", userId: "user-admin", schoolId: school.id, employeeId: generateEmployeeId(1), firstName: "Khamis", lastName: "Haji", gender: "Male", phone: "0777100200", address: "Gizenga Street, Stone Town", department: "Administration", designation: "Mkuu wa Shule (Headmaster)", employmentType: "FULL_TIME", startDate: new Date("2018-01-15"), isActive: true } });
  await prisma.staff.create({ data: { id: "staff-itadmin", userId: "user-itadmin", schoolId: school.id, employeeId: generateEmployeeId(2), firstName: "Foum", lastName: "Khatib", gender: "Male", phone: "0773100300", address: "Mbweni Road, Zanzibar Town", department: "IT", designation: "Mtaalamu wa Kompyuta", employmentType: "FULL_TIME", startDate: new Date("2021-06-01"), isActive: true } });

  // --- Teachers (12) ---
  const teacherData = [
    { firstName: "Rashid", lastName: "Juma", department: "Mathematics", designation: "Mwalimu Mkuu (Senior Teacher)", phone: "0776201001", gender: "Male" },
    { firstName: "Amina", lastName: "Hassan", department: "Languages", designation: "Mwalimu (Teacher)", phone: "0773202002", gender: "Female" },
    { firstName: "Hamisi", lastName: "Makame", department: "Science", designation: "Mwalimu Mkuu", phone: "0622303003", gender: "Male" },
    { firstName: "Fatma", lastName: "Abdalla", department: "Social Studies", designation: "Mwalimu", phone: "0655404004", gender: "Female" },
    { firstName: "Idris", lastName: "Suleiman", department: "Computer Science", designation: "Mwalimu", phone: "0713505005", gender: "Male" },
    { firstName: "Halima", lastName: "Kombo", department: "Islamic Studies", designation: "Mwalimu Mkuu", phone: "0776606006", gender: "Female" },
    { firstName: "Omar", lastName: "Ramadhani", department: "Economics", designation: "Mwalimu", phone: "0762707007", gender: "Male" },
    { firstName: "Zainab", lastName: "Mcha", department: "Languages", designation: "Mwalimu", phone: "0623808008", gender: "Female" },
    { firstName: "Salim", lastName: "Bakari", department: "Science", designation: "Mwalimu", phone: "0655909009", gender: "Male" },
    { firstName: "Khadija", lastName: "Shabani", department: "Physical Education", designation: "Mwalimu", phone: "0713101001", gender: "Female" },
    { firstName: "Ali", lastName: "Mwinyi", department: "Art & Design", designation: "Mwalimu", phone: "0777111002", gender: "Male" },
    { firstName: "Mwanamvua", lastName: "Faki", department: "Agriculture", designation: "Mwalimu", phone: "0773112003", gender: "Female" },
  ];

  const teacherStaffIds: string[] = [];
  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    const userId = `user-teacher-${i + 1}`;
    const staffId = `staff-teacher-${i + 1}`;
    await prisma.user.create({
      data: { id: userId, email: `teacher${i + 1}@baraka.sc.tz`, name: `${t.firstName} ${t.lastName}`, password: hashedPassword, role: UserRole.TEACHER, schoolId: school.id, isActive: true, emailVerified: now },
    });
    await prisma.staff.create({
      data: { id: staffId, userId, schoolId: school.id, employeeId: generateEmployeeId(i + 3), firstName: t.firstName, lastName: t.lastName, gender: t.gender, phone: t.phone, address: randomItem(ZANZIBAR_LOCATIONS), department: t.department, designation: t.designation, employmentType: "FULL_TIME", startDate: randomDate(new Date("2018-01-01"), new Date("2023-01-01")), isActive: true },
    });
    teacherStaffIds.push(staffId);
  }

  // --- Non-teaching staff (Accountant, Librarian, Receptionist) ---
  const supportStaff = [
    { id: "user-accountant", email: "accountant@baraka.sc.tz", name: "Said Mzee", role: UserRole.ACCOUNTANT, staffId: "staff-accountant", firstName: "Said", lastName: "Mzee", department: "Finance", designation: "Mhasibu (Accountant)", phone: "0777120001", gender: "Male" },
    { id: "user-librarian", email: "librarian@baraka.sc.tz", name: "Ashura Kassim", role: UserRole.LIBRARIAN, staffId: "staff-librarian", firstName: "Ashura", lastName: "Kassim", department: "Library", designation: "Mtu wa Maktaba (Librarian)", phone: "0622120002", gender: "Female" },
    { id: "user-receptionist", email: "receptionist@baraka.sc.tz", name: "Suhura Chanja", role: UserRole.RECEPTIONIST, staffId: "staff-receptionist", firstName: "Suhura", lastName: "Chanja", department: "Front Office", designation: "Mkaribishi (Receptionist)", phone: "0655130003", gender: "Female" },
  ];

  for (let i = 0; i < supportStaff.length; i++) {
    const s = supportStaff[i];
    await prisma.user.create({
      data: { id: s.id, email: s.email, name: s.name, password: hashedPassword, role: s.role, schoolId: school.id, isActive: true, emailVerified: now },
    });
    await prisma.staff.create({
      data: { id: s.staffId, userId: s.id, schoolId: school.id, employeeId: generateEmployeeId(i + 16), firstName: s.firstName, lastName: s.lastName, gender: s.gender, phone: s.phone, address: randomItem(ZANZIBAR_LOCATIONS), department: s.department, designation: s.designation, employmentType: "FULL_TIME", startDate: new Date("2022-03-01"), isActive: true },
    });
  }

  // --- Students (100) ---
  console.log("🎓 Creating 100 students...");
  const studentIds: string[] = [];
  const sectionAssignments: { studentId: string; sectionId: string; grade: number }[] = [];

  let studentCounter = 0;
  for (let grade = 1; grade <= 10; grade++) {
    const studentsInGrade = grade <= 6 ? 8 : 7; // ~7-8 per grade × 2 sections = ~15 per grade
    for (const secName of ["A", "B"]) {
      const sectionId = `section-${grade}-${secName}`;
      const count = studentsInGrade + (secName === "B" ? 1 : 0);
      for (let s = 0; s < count; s++) {
        studentCounter++;
        const isMale = Math.random() > 0.48;
        const firstName = isMale ? randomItem(ZANZIBAR_FIRST_NAMES_MALE) : randomItem(ZANZIBAR_FIRST_NAMES_FEMALE);
        const lastName = randomItem(ZANZIBAR_LAST_NAMES);
        const gender = isMale ? "Male" : "Female";
        const userId = `user-student-${studentCounter}`;
        const studentId = `student-${studentCounter}`;
        const sid = generateStudentId(studentCounter);
        const dobYear = 2026 - (6 + grade);

        await prisma.user.create({
          data: { id: userId, email: `student${studentCounter}@baraka.sc.tz`, name: `${firstName} ${lastName}`, password: hashedPassword, role: UserRole.STUDENT, schoolId: school.id, isActive: true, emailVerified: now },
        });
        await prisma.student.create({
          data: {
            id: studentId, userId, schoolId: school.id, studentId: sid,
            firstName, lastName, dateOfBirth: new Date(`${dobYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`),
            gender, phone: generateZanzibarPhone(), address: randomItem(ZANZIBAR_LOCATIONS),
            enrollmentDate: new Date(`${2026 - grade}-01-13`), sectionId, status: "ACTIVE",
          },
        });
        studentIds.push(studentId);
        sectionAssignments.push({ studentId, sectionId, grade });
      }
    }
  }
  console.log(`✅ ${studentCounter} students across all grades\n`);

  // --- Parents (50) ---
  console.log("👨‍👩‍👧 Creating parents...");
  const parentIdMap: Record<string, string> = {};
  let parentCounter = 0;

  // Create parents for students (2-3 students per parent)
  const assignedStudents = [...studentIds];
  while (assignedStudents.length > 0) {
    parentCounter++;
    const isMale = Math.random() > 0.4;
    const firstName = isMale ? randomItem(ZANZIBAR_FIRST_NAMES_MALE) : randomItem(ZANZIBAR_FIRST_NAMES_FEMALE);
    const lastName = randomItem(ZANZIBAR_LAST_NAMES);
    const relationship = isMale ? "Father" : "Mother";
    const userId = `user-parent-${parentCounter}`;
    const parentId = `parent-${parentCounter}`;
    const phone = generateZanzibarPhone();

    await prisma.user.create({
      data: { id: userId, email: `parent${parentCounter}@baraka.sc.tz`, name: `${firstName} ${lastName}`, password: hashedPassword, role: UserRole.PARENT, schoolId: school.id, isActive: true, emailVerified: now },
    });
    await prisma.parent.create({
      data: { id: parentId, userId, schoolId: school.id, firstName, lastName, relationship, phone, address: randomItem(ZANZIBAR_LOCATIONS), occupation: randomItem(["Mvuvi (Fisherman)", "Mfanyabiashara (Businessman)", "Mwalimu (Teacher)", "Muuguzi (Nurse)", "Mfugaji (Livestock Keeper)", "Mkulima (Farmer)", "Daktari (Doctor)", "Karani (Clerk)", "Fundi (Artisan)", "Mwongoza (Guide)"]) },
    });

    // Link 1-3 students to this parent
    const numChildren = Math.min(Math.floor(Math.random() * 3) + 1, assignedStudents.length);
    for (let c = 0; c < numChildren; c++) {
      const childStudentId = assignedStudents.shift()!;
      await prisma.studentParent.create({
        data: { studentId: childStudentId, parentId, isPrimary: c === 0 },
      });
      parentIdMap[childStudentId] = parentId;
    }
  }
  console.log(`✅ ${parentCounter} parents\n`);

  // ─── Step 7: Teaching Assignments ──────────────────────────────────────
  console.log("📋 Creating teaching assignments...");
  const subjectCodes = ["MATH101", "KISW101", "ENG101", "SCI101", "SS101", "CS101", "ECO101", "ISL101", "PE101", "ART101", "MUS101", "AGR101"];

  // Assign teachers to subjects + sections (focus on grades 5-10 for detailed data)
  const teachingAssignments: { staffId: string; subjectId: string; sectionId: string }[] = [];
  let taCounter = 0;

  for (let g = 5; g <= 10; g++) {
    for (const sec of ["A", "B"]) {
      const sectionId = `section-${g}-${sec}`;
      // Core subjects for each section
      const coreSubjects = subjectCodes.slice(0, 8);
      for (let si = 0; si < coreSubjects.length; si++) {
        const teacherIdx = si % teacherStaffIds.length;
        taCounter++;
        await prisma.teachingAssignment.create({
          data: {
            id: `ta-${taCounter}`,
            staffId: teacherStaffIds[teacherIdx],
            subjectId: `subject-${coreSubjects[si]}`,
            sectionId,
            academicYearId: academicYear.id,
          },
        });
      }
    }
  }
  console.log(`✅ ${taCounter} teaching assignments\n`);

  // ─── Step 8: Timetable ──────────────────────────────────────────────────
  console.log("⏰ Creating timetable...");
  const days = [1, 2, 3, 4, 5]; // Monday=1 through Friday=5
  const periods = [
    { no: 1, start: "08:00", end: "08:40" },
    { no: 2, start: "08:45", end: "09:25" },
    { no: 3, start: "09:30", end: "10:10" },
    { no: 4, start: "10:30", end: "11:10" }, // After break
    { no: 5, start: "11:15", end: "11:55" },
    { no: 6, start: "12:00", end: "12:40" },
    { no: 7, start: "14:00", end: "14:40" }, // After lunch
    { no: 8, start: "14:45", end: "15:25" },
  ];

  let ttCounter = 0;
  // Create timetable for grades 5-10, section A only (to keep count manageable)
  for (let g = 5; g <= 10; g++) {
    const sectionId = `section-${g}-A`;
    for (const day of days) {
      for (const period of periods) {
        const subjectIdx = (ttCounter) % 8;
        const subjectId = `subject-${subjectCodes[subjectIdx]}`;
        const teacherIdx = subjectIdx % teacherStaffIds.length;

        ttCounter++;
        await prisma.timetable.create({
          data: {
            id: `tt-${ttCounter}`,
            sectionId,
            subjectId,
            staffId: teacherStaffIds[teacherIdx],
            dayOfWeek: day as number,
            periodNo: period.no,
            startTime: period.start,
            endTime: period.end,
            classroom: `Darasa la ${g}A`,
          },
        });
      }
    }
  }
  console.log(`✅ ${ttCounter} timetable entries\n`);

  // ─── Step 9: Assignments + Submissions ──────────────────────────────────
  console.log("📝 Creating assignments...");
  const assignments: { id: string; sectionId: string }[] = [];

  for (let a = 1; a <= 18; a++) {
    const grade = Math.floor((a - 1) / 3) + 5; // grades 5-10
    const sec = a % 2 === 0 ? "A" : "B";
    const sectionId = `section-${grade}-${sec}`;
    const subjectIdx = (a - 1) % 8;
    const subjectId = `subject-${subjectCodes[subjectIdx]}`;
    const staffIdx = subjectIdx % teacherStaffIds.length;
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (a % 2 === 0 ? -5 : 10 + a));

    const assignmentTitles = [
      "Mtihani wa Mwezi (Monthly Test)", "Kazi ya Nyumbani (Homework)", "Mradi (Project)",
      "Taarifa (Report)", "Uchambuzi (Analysis)", "Majaribio (Practice)",
    ];

    const assignment = await prisma.assignment.create({
      data: {
        id: `assignment-${a}`,
        title: assignmentTitles[(a - 1) % assignmentTitles.length] + ` - ${subjectDefs[subjectIdx].name.split("(")[0].trim()}`,
        description: `Wanafunzi wanahitajika kumaliza kazi hii kwa uchache. Students are required to complete this assignment.`,
        subjectId,
        sectionId,
        staffId: teacherStaffIds[staffIdx],
        dueDate,
        maxMarks: a % 3 === 0 ? 50 : 20,
        allowLate: true,
        latePenalty: 10,
      },
    });
    assignments.push({ id: assignment.id, sectionId });

    // Create submissions from students in that section
    const studentsInSection = sectionAssignments.filter(s => s.sectionId === sectionId);
    for (const sa of studentsInSection.slice(0, 5)) {
      const isSubmitted = Math.random() > 0.2;
      const isLate = isSubmitted && Math.random() > 0.7;
      const isGraded = isSubmitted && Math.random() > 0.4;

      try {
        await prisma.assignmentSubmission.create({
          data: {
            id: `submission-${a}-${sa.studentId}`,
            assignmentId: assignment.id,
            studentId: sa.studentId,
            content: isSubmitted ? "Kazi imewasilishwa. Assignment submitted." : undefined,
            submittedAt: isSubmitted ? new Date(dueDate.getTime() - Math.random() * 86400000 * 5) : undefined,
            isLate,
            marks: isGraded ? Math.floor(Math.random() * (assignment.maxMarks * 0.4)) + Math.floor(assignment.maxMarks * 0.5) : null,
            feedback: isGraded ? randomItem(["Kazi nzuri! Good work!", "Inahitaji maboresho. Needs improvement.", "Vizuri sana! Very good!"]) : null,
            gradedAt: isGraded ? new Date() : null,
            gradedBy: isGraded ? teacherStaffIds[staffIdx] : null,
          },
        });
      } catch (e) {
        console.log(`⚠️  Skipping submission for student ${sa.studentId} in assignment ${assignment.id}: ${(e as Error).message}`);
      }
    }
  }
  console.log(`✅ ${assignments.length} assignments with submissions\n`);

  // ─── Step 10: Exams + Results ────────────────────────────────────────────
  console.log("📊 Creating exams...");
  const exam1 = await prisma.exam.create({
    data: { id: "exam-midterm", schoolId: school.id, academicYearId: academicYear.id, termId: "term-2", name: "Mtihani wa Kati (Midterm Exam)", startDate: new Date("2025-06-02"), endDate: new Date("2025-06-10"), isPublished: true },
  });
  const exam2 = await prisma.exam.create({
    data: { id: "exam-final", schoolId: school.id, academicYearId: academicYear.id, termId: "term-3", name: "Mtihani wa Mwisho (Final Exam)", startDate: new Date("2025-11-10"), endDate: new Date("2025-11-20"), isPublished: false },
  });

  // Exam subjects for midterm (grades 5-10)
  const examSubjects: { id: string; examId: string; sectionId: string }[] = [];
  let esCounter = 0;
  for (let g = 5; g <= 10; g++) {
    for (const sec of ["A"]) {
      const sectionId = `section-${g}-${sec}`;
      for (let si = 0; si < 5; si++) {
        esCounter++;
        const esId = `es-midterm-${esCounter}`;
        await prisma.examSubject.create({
          data: {
            id: esId, examId: exam1.id, subjectId: `subject-${subjectCodes[si]}`, sectionId,
            maxMarks: 100, passMark: 35, examDate: new Date("2025-06-03"), startTime: "08:00", duration: 120, venue: `Darasa la ${g}${sec}`,
          },
        });
        examSubjects.push({ id: esId, examId: exam1.id, sectionId });

        // Exam results for students in that section
        const studentsInSec = sectionAssignments.filter(s => s.sectionId === sectionId);
        let erCounter = 0;
        for (const sa of studentsInSec) {
          erCounter++;
          const marks = Math.floor(Math.random() * 60) + 25; // 25-84
          const grade = marks >= 75 ? "A" : marks >= 65 ? "B" : marks >= 50 ? "C" : marks >= 35 ? "D" : "F";
          try {
            await prisma.examResult.create({
              data: { id: `er-${esCounter}-${erCounter}`, examSubjectId: esId, studentId: sa.studentId, marksObtained: marks, grade, remarks: grade === "F" ? "Inahitaji bidii zaidi" : grade === "A" ? "Hongera! Excellent!" : undefined },
            });
          } catch (e) {
            console.log(`⚠️  Skipping exam result: ${(e as Error).message}`);
          }
        }
      }
    }
  }
  console.log(`✅ 2 exams with ${esCounter} exam subjects and results\n`);

  // ─── Step 11: Attendance ────────────────────────────────────────────────
  console.log("📋 Creating attendance records...");
  // Student attendance for last 30 days
  let saCount = 0;
  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - d));
    // Skip weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    // Skip future dates
    if (date > now) continue;

    // Attendance for grades 5-10, section A students
    for (let g = 5; g <= 10; g++) {
      const sectionId = `section-${g}-A`;
      const studentsInSec = sectionAssignments.filter(s => s.sectionId === sectionId);
      for (const sa of studentsInSec) {
        const rand = Math.random();
        const status = rand > 0.88 ? "ABSENT" : rand > 0.82 ? "LATE" : rand > 0.79 ? "EXCUSED" : "PRESENT";

        saCount++;
        await prisma.studentAttendance.create({
          data: {
            id: `sa-${saCount}`,
            studentId: sa.studentId,
            sectionId,
            academicYearId: academicYear.id,
            date,
            status,
            markedBy: teacherStaffIds[0],
          },
        });
      }
    }
  }
  console.log(`✅ ${saCount} student attendance records\n`);

  // Staff attendance
  let staffAttCount = 0;
  const allStaffIds = [...teacherStaffIds, "staff-admin", "staff-itadmin", "staff-accountant", "staff-librarian", "staff-receptionist"];

  for (let d = 0; d < 30; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - d));
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    if (date > now) continue;

    for (const staffId of allStaffIds) {
      const rand = Math.random();
      const status = rand > 0.95 ? "ABSENT" : rand > 0.9 ? "ON_LEAVE" : rand > 0.85 ? "HALF_DAY" : "PRESENT";
      const checkInDate = new Date(date);
      checkInDate.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      const checkOutDate = new Date(date);
      checkOutDate.setHours(15 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

      staffAttCount++;
      await prisma.staffAttendance.create({
        data: {
          id: `staff-att-${staffAttCount}`, staffId, date,
          checkIn: status !== "ABSENT" ? checkInDate : null,
          checkOut: status !== "ABSENT" && status !== "HALF_DAY" ? checkOutDate : null,
          status,
        },
      });
    }
  }
  console.log(`✅ ${staffAttCount} staff attendance records\n`);

  // ─── Step 12: Finance ───────────────────────────────────────────────────
  console.log("💰 Creating finance data...");

  // Fee categories
  const feeCategories = [
    { id: "fc-tuition", name: "Ada ya Kusoma (Tuition Fee)", description: "Ada ya msingi ya elimu", isRecurring: true },
    { id: "fc-transport", name: "Ada ya Usafiri (Transport Fee)", description: "Ada ya basi ya shule", isRecurring: true },
    { id: "fc-lab", name: "Ada ya Maabara (Lab Fee)", description: "Ada ya matumizi ya maabara", isRecurring: true },
    { id: "fc-library", name: "Ada ya Maktaba (Library Fee)", description: "Ada ya matumizi ya maktaba", isRecurring: true },
    { id: "fc-exam", name: "Ada ya Mtihani (Exam Fee)", description: "Ada ya mitihani", isRecurring: false },
    { id: "fc-development", name: "Ada ya Maendeleo (Development Fee)", description: "Ada ya miradi ya maendeleo", isRecurring: true },
  ];

  for (const fc of feeCategories) {
    await prisma.feeCategory.create({ data: { ...fc, schoolId: school.id } });
  }

  // Fee structures (per class + category)
  const feeAmounts: Record<string, number> = {
    "1": 800000, "2": 850000, "3": 900000, "4": 950000,
    "5": 1000000, "6": 1050000, "7": 1100000, "8": 1150000,
    "9": 1200000, "10": 1300000,
  };

  let fsCounter = 0;
  for (let g = 1; g <= 10; g++) {
    const classId = `class-${g}`;
    // Tuition
    fsCounter++;
    await prisma.feeStructure.create({
      data: { id: `fs-${fsCounter}`, feeCategoryId: "fc-tuition", classId, academicYearId: academicYear.id, amount: feeAmounts[String(g)], dueDay: 15 },
    });
    // Transport
    fsCounter++;
    await prisma.feeStructure.create({
      data: { id: `fs-${fsCounter}`, feeCategoryId: "fc-transport", classId, academicYearId: academicYear.id, amount: 200000, dueDay: 15 },
    });
    // Lab (grades 5+)
    if (g >= 5) {
      fsCounter++;
      await prisma.feeStructure.create({
        data: { id: `fs-${fsCounter}`, feeCategoryId: "fc-lab", classId, academicYearId: academicYear.id, amount: 150000, dueDay: 15 },
      });
    }
    // Library
    fsCounter++;
    await prisma.feeStructure.create({
      data: { id: `fs-${fsCounter}`, feeCategoryId: "fc-library", classId, academicYearId: academicYear.id, amount: 50000, dueDay: 15 },
    });
    // Exam
    fsCounter++;
    await prisma.feeStructure.create({
      data: { id: `fs-${fsCounter}`, feeCategoryId: "fc-exam", classId, academicYearId: academicYear.id, amount: 100000, dueDay: 1 },
    });
    // Development
    fsCounter++;
    await prisma.feeStructure.create({
      data: { id: `fs-${fsCounter}`, feeCategoryId: "fc-development", classId, academicYearId: academicYear.id, amount: 75000, dueDay: 20 },
    });
  }
  console.log(`✅ ${feeCategories.length} fee categories, ${fsCounter} fee structures\n`);

  // Invoices + Items + Payments
  console.log("🧾 Creating invoices...");
  let invoiceCounter = 0;
  let paymentCounter = 0;

  for (let i = 0; i < 60; i++) {
    const studentId = studentIds[i];
    const sa = sectionAssignments.find(s => s.studentId === studentId)!;
    const grade = sa.grade;
    const tuitionAmount = feeAmounts[String(grade)];
    const totalAmount = tuitionAmount + 200000 + 50000 + 100000 + 75000 + (grade >= 5 ? 150000 : 0);

    invoiceCounter++;
    const statuses = ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"];
    const statusWeights = [0.15, 0.25, 0.4, 0.2];
    const rand = Math.random();
    let status: string;
    if (rand < statusWeights[0]) status = statuses[0];
    else if (rand < statusWeights[0] + statusWeights[1]) status = statuses[1];
    else if (rand < statusWeights[0] + statusWeights[1] + statusWeights[2]) status = statuses[2];
    else status = statuses[3];

    const paidAmount = status === "PAID" ? totalAmount : status === "UNPAID" ? 0 : Math.floor(totalAmount * (0.3 + Math.random() * 0.5));
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 60));

    const invoice = await prisma.invoice.create({
      data: {
        id: `invoice-${invoiceCounter}`,
        invoiceNumber: generateInvoiceNumber(invoiceCounter),
        studentId,
        academicYearId: academicYear.id,
        totalAmount,
        paidAmount,
        dueDate,
        status: status as "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE",
        notes: i % 7 === 0 ? "Tafadhali lipa kwa wakati. Please pay on time." : undefined,
      },
    });

    // Invoice items
    const items = [
      { desc: "Tuition Fee", amount: tuitionAmount },
      { desc: "Transport Fee", amount: 200000 },
      { desc: "Library Fee", amount: 50000 },
      { desc: "Exam Fee", amount: 100000 },
      { desc: "Development Fee", amount: 75000 },
    ];
    if (grade >= 5) items.push({ desc: "Lab Fee", amount: 150000 });

    let iiCounter = 0;
    for (const item of items) {
      iiCounter++;
      const discount = i % 5 === 0 && item.desc === "Tuition Fee" ? Math.floor(tuitionAmount * 0.1) : 0;
      await prisma.invoiceItem.create({
        data: {
          id: `ii-${invoiceCounter}-${iiCounter}`,
          invoiceId: invoice.id,
          feeStructureId: `fs-${(grade - 1) * 4 + iiCounter}`,
          description: item.desc,
          amount: item.amount,
          discount,
          netAmount: item.amount - discount,
        },
      });
    }

    // Payments for partially paid / paid invoices
    if (paidAmount > 0) {
      const numPayments = status === "PAID" ? (Math.random() > 0.5 ? 2 : 1) : 1;
      let remaining = paidAmount;
      for (let p = 0; p < numPayments; p++) {
        paymentCounter++;
        const amt = p === numPayments - 1 ? remaining : Math.floor(remaining * (0.4 + Math.random() * 0.3));
        remaining -= amt;
        const methods = ["CASH", "BANK_TRANSFER", "PAYSTACK"];
        await prisma.payment.create({
          data: {
            id: `payment-${paymentCounter}`,
            invoiceId: invoice.id,
            amount: amt,
            method: methods[Math.floor(Math.random() * methods.length)] as "CASH" | "BANK_TRANSFER" | "PAYSTACK",
            paidAt: new Date(dueDate.getTime() + Math.random() * 86400000 * 10),
            recordedBy: "staff-accountant",
          },
        });
      }
    }
  }
  console.log(`✅ ${invoiceCounter} invoices, ${paymentCounter} payments\n`);

  // Fee discounts
  for (let i = 0; i < 5; i++) {
    await prisma.feeDiscount.create({
      data: {
        id: `discount-${i + 1}`,
        studentId: studentIds[i * 10],
        name: "Punguzo la Ndugu (Sibling Discount)",
        type: "PERCENTAGE",
        value: 10,
        reason: "Wana ndugu wengi shuleni. Multiple siblings enrolled.",
      },
    });
  }

  // ─── Step 13: HR ────────────────────────────────────────────────────────
  console.log("💼 Creating HR data...");

  // Salary structures
  const salaryAmounts = [
    { basic: 800000, housing: 300000, transport: 150000 },
    { basic: 750000, housing: 250000, transport: 120000 },
    { basic: 900000, housing: 350000, transport: 180000 },
    { basic: 700000, housing: 200000, transport: 100000 },
    { basic: 650000, housing: 200000, transport: 100000 },
  ];

  const allStaffForSalary = [...teacherStaffIds, "staff-admin", "staff-itadmin", "staff-accountant", "staff-librarian", "staff-receptionist"];
  for (let i = 0; i < allStaffForSalary.length; i++) {
    const s = salaryAmounts[i % salaryAmounts.length];
    const tax = Math.floor(s.basic * 0.1);
    const pension = Math.floor(s.basic * 0.05);
    const health = Math.floor(s.basic * 0.03);

    await prisma.salaryStructure.create({
      data: {
        id: `salary-${i + 1}`,
        staffId: allStaffForSalary[i],
        basicSalary: s.basic,
        housingAllowance: s.housing,
        transportAllowance: s.transport,
        taxDeduction: tax,
        pensionDeduction: pension,
        healthDeduction: health,
      },
    });
  }
  console.log(`✅ ${allStaffForSalary.length} salary structures\n`);

  // Leave applications
  const leaveData: { staffId: string; type: "ANNUAL" | "SICK" | "EMERGENCY" | "MATERNITY" | "PATERNITY" | "UNPAID"; startDate: Date; endDate: Date; reason: string; status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" }[] = [
    { staffId: teacherStaffIds[0], type: "ANNUAL", startDate: new Date("2025-07-01"), endDate: new Date("2025-07-10"), reason: "Likizo ya kawaida. Annual leave for family event.", status: "APPROVED" },
    { staffId: teacherStaffIds[1], type: "SICK", startDate: new Date("2025-05-15"), endDate: new Date("2025-05-17"), reason: "Ugonjwa. Feeling unwell, need rest.", status: "APPROVED" },
    { staffId: teacherStaffIds[2], type: "EMERGENCY", startDate: new Date(today), endDate: new Date(today.getTime() + 86400000 * 2), reason: "Dharura ya familia. Family emergency.", status: "PENDING" },
    { staffId: teacherStaffIds[3], type: "ANNUAL", startDate: new Date("2025-08-10"), endDate: new Date("2025-08-20"), reason: "Likizo ya kupumzika. Vacation.", status: "PENDING" },
    { staffId: "staff-accountant", type: "SICK", startDate: new Date("2025-04-01"), endDate: new Date("2025-04-02"), reason: "Maumivu ya kichwa. Headache.", status: "APPROVED" },
  ];

  for (let i = 0; i < leaveData.length; i++) {
    const l = leaveData[i];
    await prisma.leaveApplication.create({
      data: {
        id: `leave-${i + 1}`,
        ...l,
        reviewedBy: l.status !== "PENDING" ? "staff-admin" : null,
        reviewedAt: l.status !== "PENDING" ? new Date(l.startDate.getTime() - 86400000 * 3) : null,
        reviewNotes: l.status === "APPROVED" ? "Imeidhinishwa. Approved." : l.status === "REJECTED" ? "Haikutimiza masharti. Requirements not met." : null,
      },
    });
  }
  console.log(`✅ ${leaveData.length} leave applications\n`);

  // Payroll
  const payroll = await prisma.payroll.create({
    data: {
      id: "payroll-march-2025",
      academicYearId: academicYear.id,
      month: 3,
      year: 2025,
      totalAmount: allStaffForSalary.length * 1200000,
      isApproved: true,
      approvedBy: "staff-admin",
      approvedAt: new Date("2025-03-28"),
      isLocked: true,
    },
  });

  for (let i = 0; i < allStaffForSalary.length; i++) {
    const s = salaryAmounts[i % salaryAmounts.length];
    const gross = s.basic + s.housing + s.transport;
    const tax = Math.floor(s.basic * 0.1);
    const pension = Math.floor(s.basic * 0.05);
    const health = Math.floor(s.basic * 0.03);
    const net = gross - tax - pension - health;

    await prisma.payrollItem.create({
      data: {
        id: `pi-${i + 1}`,
        payrollId: payroll.id,
        staffId: allStaffForSalary[i],
        basicSalary: s.basic,
        housingAllowance: s.housing,
        transportAllowance: s.transport,
        grossSalary: gross,
        taxDeduction: tax,
        pensionDeduction: pension,
        healthDeduction: health,
        leaveDeduction: 0,
        netSalary: net,
      },
    });
  }
  console.log(`✅ Payroll with ${allStaffForSalary.length} items\n`);

  // ─── Step 14: Library ───────────────────────────────────────────────────
  console.log("📚 Creating library data...");

  const bookData = [
    { title: "Kiswahili Cha Kusoma na Kuandika", authors: "T.S.Y. Sengo", publisher: "Mkuki wa Nyota", year: 2019, category: "Kiswahili", shelf: "A-01", copies: 5 },
    { title: "Fundamentals of Mathematics", authors: "M.K. Joseph", publisher: "Oxford University Press", year: 2020, category: "Mathematics", shelf: "B-01", copies: 8 },
    { title: "General Science for Africa", authors: "A.B. Clegg", publisher: "Longman", year: 2018, category: "Science", shelf: "C-01", copies: 6 },
    { title: "English Grammar in Use", authors: "Raymond Murphy", publisher: "Cambridge University Press", year: 2019, category: "English", shelf: "D-01", copies: 10 },
    { title: "History of Zanzibar", authors: "Abdul Sheriff", publisher: "Zanzibar Press", year: 2017, category: "History", shelf: "E-01", copies: 4 },
    { title: "Islamic Studies for Schools", authors: "A.M. Mwakibinga", publisher: "Islamic Publications", year: 2021, category: "Islamic Studies", shelf: "E-02", copies: 7 },
    { title: "Computer Science Today", authors: "S. Raji", publisher: "Pearson", year: 2022, category: "Computer Science", shelf: "F-01", copies: 5 },
    { title: "Geography of East Africa", authors: "N.M. Kihiu", publisher: "East African Publishers", year: 2018, category: "Geography", shelf: "G-01", copies: 4 },
    { title: "Agriculture for Secondary Schools", authors: "J.K. Mwasha", publisher: "Mkuki wa Nyota", year: 2020, category: "Agriculture", shelf: "H-01", copies: 3 },
    { title: "Art & Design Handbook", authors: "F.K. Mushi", publisher: "Mkuki wa Nyota", year: 2021, category: "Art", shelf: "I-01", copies: 4 },
    { title: "Physical Education Guide", authors: "M.J. Semindu", publisher: "Tanzania Educational", year: 2019, category: "Physical Education", shelf: "I-02", copies: 3 },
    { title: "Economics for Beginners", authors: "D. Ndulu", publisher: "Mkuki wa Nyota", year: 2020, category: "Economics", shelf: "J-01", copies: 5 },
    { title: "Swahili Poetry (Ushairi)", authors: "S.A. Mohamed", publisher: "Zanzibar Cultural", year: 2016, category: "Literature", shelf: "A-02", copies: 3 },
    { title: "Civics and Ethics", authors: "R.M. Mallya", publisher: "Tanzania Educational", year: 2021, category: "Civics", shelf: "E-03", copies: 6 },
    { title: "Biology for East Africa", authors: "M.K. Ibrahim", publisher: "Longman", year: 2019, category: "Science", shelf: "C-02", copies: 5 },
    { title: "Chemistry Made Simple", authors: "H.J. Mwanyika", publisher: "Pearson", year: 2020, category: "Science", shelf: "C-03", copies: 4 },
    { title: "Physics for Schools", authors: "A.K. Rajabu", publisher: "Oxford University Press", year: 2021, category: "Science", shelf: "C-04", copies: 4 },
    { title: "Zanzibar Folk Tales", authors: "Hasan N. Adam", publisher: "Gallery Publications", year: 2015, category: "Literature", shelf: "A-03", copies: 3 },
    { title: "Business Studies", authors: "K. Kimambo", publisher: "East African Publishers", year: 2022, category: "Business", shelf: "J-02", copies: 5 },
    { title: "Environmental Studies", authors: "M.J. Mwalyego", publisher: "Mkuki wa Nyota", year: 2019, category: "Science", shelf: "H-02", copies: 4 },
  ];

  const bookIds: string[] = [];
  for (let i = 0; i < bookData.length; i++) {
    const b = bookData[i];
    const bookId = `book-${i + 1}`;
    await prisma.book.create({
      data: {
        id: bookId, schoolId: school.id,
        isbn: `978-${String(1000 + i).padStart(4, "0")}-${String(10000 + i)}`,
        title: b.title, authors: b.authors, publisher: b.publisher,
        publishYear: b.year, category: b.category, shelfLocation: b.shelf,
        totalCopies: b.copies,
      },
    });
    bookIds.push(bookId);

    // Book copies
    for (let c = 1; c <= b.copies; c++) {
      await prisma.bookCopy.create({
        data: {
          id: `copy-${i + 1}-${c}`,
          bookId,
          copyNumber: String(c),
          isAvailable: c <= Math.ceil(b.copies * 0.7),
          condition: c <= 2 ? "GOOD" : c <= 4 ? "FAIR" : "GOOD",
        },
      });
    }
  }

  // Borrow records
  for (let i = 0; i < 15; i++) {
    const bookIdx = i % bookData.length;
    const book = bookData[bookIdx];
    const availableCopies = await prisma.bookCopy.findMany({
      where: { bookId: bookIds[bookIdx], isAvailable: true },
      take: 1,
    });

    if (availableCopies.length === 0) continue;

    const copyId = availableCopies[0].id;
    const studentIdx = i % studentIds.length;
    const borrowDate = new Date(today);
    borrowDate.setDate(borrowDate.getDate() - Math.floor(Math.random() * 30) - 7);
    const expectedReturn = new Date(borrowDate.getTime() + 14 * 86400000);
    const isReturned = Math.random() > 0.3;
    const isOverdue = !isReturned && expectedReturn < today;

    await prisma.borrowRecord.create({
      data: {
        id: `borrow-${i + 1}`,
        bookCopyId: copyId,
        studentId: studentIds[studentIdx],
        borrowDate,
        expectedReturn,
        returnDate: isReturned ? new Date(borrowDate.getTime() + (7 + Math.floor(Math.random() * 10)) * 86400000) : null,
        fineAmount: isOverdue ? Math.floor((today.getTime() - expectedReturn.getTime()) / 86400000) * 500 : 0,
        finePaid: false,
      },
    });

    if (isReturned) {
      await prisma.bookCopy.update({ where: { id: copyId }, data: { isAvailable: true } });
    } else {
      await prisma.bookCopy.update({ where: { id: copyId }, data: { isAvailable: false } });
    }
  }
  console.log(`✅ ${bookData.length} books, copies, and borrow records\n`);

  // ─── Step 15: Transport ─────────────────────────────────────────────────
  console.log("🚌 Creating transport data...");

  const drivers = [
    { id: "driver-1", firstName: "Juma", lastName: "Hassan", licenseNumber: "TZ-DL-2019-001", licenseExpiry: new Date("2027-06-01"), phone: "0777001001" },
    { id: "driver-2", firstName: "Makame", lastName: "Omar", licenseNumber: "TZ-DL-2018-002", licenseExpiry: new Date("2026-12-01"), phone: "0773002002" },
    { id: "driver-3", firstName: "Bakari", lastName: "Salim", licenseNumber: "TZ-DL-2020-003", licenseExpiry: new Date("2028-03-15"), phone: "0622003003" },
    { id: "driver-4", firstName: "Khamis", lastName: "Juma", licenseNumber: "TZ-DL-2021-004", licenseExpiry: new Date("2029-01-01"), phone: "0655004004" },
    { id: "driver-5", firstName: "Said", lastName: "Mwinyi", licenseNumber: "TZ-DL-2017-005", licenseExpiry: new Date("2027-09-01"), phone: "0713005005" },
  ];

  for (const d of drivers) {
    await prisma.driver.create({ data: d });
  }

  const vehicles = [
    { id: "vehicle-1", reg: "TZB-001-ABC", make: "Toyota", model: "Coaster", year: 2020, capacity: 30, driverId: "driver-1", status: "ACTIVE" as const },
    { id: "vehicle-2", reg: "TZB-002-DEF", make: "Toyota", model: "Hiace", year: 2019, capacity: 15, driverId: "driver-2", status: "ACTIVE" as const },
    { id: "vehicle-3", reg: "TZB-003-GHI", make: "Nissan", model: "Civilian", year: 2021, capacity: 25, driverId: "driver-3", status: "ACTIVE" as const },
    { id: "vehicle-4", reg: "TZB-004-JKL", make: "Toyota", model: "Coaster", year: 2018, capacity: 30, driverId: "driver-4", status: "UNDER_MAINTENANCE" as const },
    { id: "vehicle-5", reg: "TZB-005-MNO", make: "Isuzu", model: "Elf", year: 2022, capacity: 20, driverId: "driver-5", status: "ACTIVE" as const },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.create({ data: { id: v.id, schoolId: school.id, registration: v.reg, make: v.make, model: v.model, year: v.year, capacity: v.capacity, driverId: v.driverId, status: v.status } });
  }

  const routes = [
    { id: "route-1", name: "Stone Town Route", code: "ST-01", start: "Stone Town (Mizingani)", end: "Baraka Academy", stops: ["Mizingani", "Gizenga", "Mkunazini", "Kiponda", "School"], vehicleId: "vehicle-1" },
    { id: "route-2", name: "Nungwi Route", code: "NW-01", start: "Nungwi Village", end: "Baraka Academy", stops: ["Nungwi", "Kendwa", "Pwani Mchangani", "School"], vehicleId: "vehicle-2" },
    { id: "route-3", name: "Jambiani Route", code: "JB-01", start: "Jambiani Village", end: "Baraka Academy", stops: ["Jambiani", "Paje", "Bwejuu", "Dongwe", "School"], vehicleId: "vehicle-3" },
    { id: "route-4", name: "Chwaka Route", code: "CK-01", start: "Chwaka Village", end: "Baraka Academy", stops: ["Chwaka", "Uroa", "School"], vehicleId: "vehicle-5" },
  ];

  for (const r of routes) {
    await prisma.route.create({
      data: { id: r.id, schoolId: school.id, name: r.name, code: r.code, startPoint: r.start, endPoint: r.end, stops: r.stops, vehicleId: r.vehicleId },
    });
  }

  // Student transport assignments
  for (let i = 0; i < 15; i++) {
    const routeIdx = i % routes.length;
    const stops = routes[routeIdx].stops as string[];
    await prisma.studentTransport.create({
      data: {
        id: `st-${i + 1}`,
        studentId: studentIds[i * 5],
        routeId: routes[routeIdx].id,
        stopName: stops[Math.floor(Math.random() * (stops.length - 1))],
        isActive: true,
      },
    });
  }
  console.log(`✅ ${drivers.length} drivers, ${vehicles.length} vehicles, ${routes.length} routes\n`);

  // ─── Step 16: Communication ─────────────────────────────────────────────
  console.log("📢 Creating communication data...");

  // Announcements
  const announcementData = [
    { title: "Mwanzo wa Msimu Mpya (New Term Beginning)", content: "Shule itafungua rasmi tarehe 13 Januari 2025. Watoto wote wanatakiwa kuwa shuleni saa nane asubuhi. School will open officially on January 13, 2025. All children must be at school by 8:00 AM.", targetRole: null, isPublished: true },
    { title: "Siku ya Wazazi (Parents' Day)", content: "Tunakaribu wazazi wote kuja shuleni tarehe 20 Februari 2025 kwa majadiliano ya maendeleo ya watoto. We welcome all parents to school on Feb 20, 2025 to discuss their children's progress.", targetRole: "PARENT", isPublished: true },
    { title: "Mtihani wa Kati (Midterm Exam Schedule)", content: "Mitihani ya kati itaanza tarehe 2 Juni 2025. Wanafunzi waweke tayari. Midterm exams begin June 2, 2025. Students should prepare well.", targetRole: "STUDENT", isPublished: true },
    { title: "Mafunzo ya Walimu (Teacher Training)", content: "Mafunzo ya maendeleo ya kitaalamu yatafanyika tarehe 15-17 Machi. Teacher professional development training on March 15-17.", targetRole: "TEACHER", isPublished: true },
    { title: "Ada ya Shule (School Fees Reminder)", content: "Tunakumbusha wazazi kulipa ada ya shule kabla ya tarehe 15 ya kila mwezi. We remind parents to pay school fees before the 15th of each month.", targetRole: "PARENT", isPublished: true },
    { title: "Sherehe ya Siku ya Uhuru (Independence Day Celebration)", content: "Shule itaandaa sherehe ya Siku ya Uhuru tarehe 9 Desemba 2025. School will host Independence Day celebrations on December 9, 2025.", targetRole: null, isPublished: true },
    { title: "Likizo ya Eid el-Fitr", content: "Shule itafungwa kwa likizo ya Eid el-Fitr. Tarehe zitatangazwa baadaye. School will be closed for Eid el-Fitr holidays. Dates to be announced.", targetRole: null, isPublished: true },
    { title: "Mashindano ya Michezo (Sports Competition)", content: "Mashindano ya michezo ya mwezi huo yatafanyika Jumamosi tarehe 25. Wanafunzi wote wanakaribishwa. Monthly sports competition on Saturday the 25th. All students welcome.", targetRole: "STUDENT", isPublished: false },
  ];

  for (let i = 0; i < announcementData.length; i++) {
    const a = announcementData[i];
    await prisma.announcement.create({
      data: {
        id: `ann-${i + 1}`,
        schoolId: school.id,
        authorId: "user-admin",
        title: a.title,
        content: a.content,
        targetRole: a.targetRole as UserRole | null,
        isPublished: a.isPublished,
        publishedAt: a.isPublished ? new Date(today.getTime() - (i * 86400000 * 7)) : undefined,
      },
    });
  }

  // Events
  const eventData = [
    { title: "Siku ya Kuanza (Opening Day)", desc: "Siku ya kwanza ya msimu wa masomo. First day of the academic term.", startDate: new Date("2025-01-13"), endDate: new Date("2025-01-13"), location: "Uwanja wa Shule", category: "OTHER", visibility: "ALL" },
    { title: "Mtihani wa Kati (Midterm Exams)", desc: "Kipindi cha mitihani ya kati. Midterm examination period.", startDate: new Date("2025-06-02"), endDate: new Date("2025-06-10"), location: "Madarasa yote", category: "EXAM", visibility: "ALL" },
    { title: "Michezo ya Mwezi (Monthly Sports)", desc: "Mashindano ya michezo kati ya madarasa. Inter-class sports competition.", startDate: new Date("2025-04-25"), endDate: new Date("2025-04-25"), location: "Uwanja wa Michezo", category: "SPORTS", visibility: "ALL" },
    { title: "Tamasha la Utamaduni (Cultural Festival)", desc: "Tamasha la utamaduni wa Zanzibar. Zanzibar cultural festival with Taarab music.", startDate: new Date("2025-07-15"), endDate: new Date("2025-07-16"), location: "Ukumbi wa Shule", category: "CULTURAL", visibility: "ALL" },
    { title: "Mkutano wa Wazazi (Parents' Meeting)", desc: "Mkutano wa majadiliano na wazazi. Meeting to discuss student progress with parents.", startDate: new Date("2025-02-20"), endDate: new Date("2025-02-20"), location: "Ukumbi Mkuu", category: "MEETING", visibility: "STAFF_ONLY" },
    { title: "Siku ya Watoto (Children's Day)", desc: "Sherehe ya Siku ya Watoto wa Afrika. African Children's Day celebration.", startDate: new Date("2025-06-16"), endDate: new Date("2025-06-16"), location: "Uwanja wa Shule", category: "CULTURAL", visibility: "ALL" },
    { title: "Likizo ya Eid el-Adha", desc: "Shule itafungwa kwa likizo ya Eid el-Adha. School closed for Eid el-Adha.", startDate: new Date("2025-06-07"), endDate: new Date("2025-06-09"), location: "", category: "HOLIDAY", visibility: "ALL" },
    { title: "Mtihani wa Mwisho (Final Exams)", desc: "Kipindi cha mitihani ya mwisho. Final examination period.", startDate: new Date("2025-11-10"), endDate: new Date("2025-11-20"), location: "Madarasa yote", category: "EXAM", visibility: "ALL" },
    { title: "Sherehe ya Hitimu (Graduation Ceremony)", desc: "Sherehe ya kuhitimu kwa wanafunzi wa Darasa la 10. Grade 10 graduation ceremony.", startDate: new Date("2025-12-05"), endDate: new Date("2025-12-05"), location: "Ukumbi Mkuu", category: "CULTURAL", visibility: "ALL" },
    { title: "Siku ya Uhuru (Independence Day)", desc: "Sherehe ya Siku ya Uhuru wa Tanzania. Tanzania Independence Day celebration.", startDate: new Date("2025-12-09"), endDate: new Date("2025-12-09"), location: "Uwanja wa Shule", category: "HOLIDAY", visibility: "ALL" },
  ];

  for (let i = 0; i < eventData.length; i++) {
    const e = eventData[i];
    await prisma.event.create({
      data: {
        id: `event-${i + 1}`,
        schoolId: school.id,
        title: e.title,
        description: e.desc,
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        category: e.category as "HOLIDAY" | "EXAM" | "SPORTS" | "CULTURAL" | "MEETING" | "OTHER",
        visibility: e.visibility as "ALL" | "STAFF_ONLY" | "STUDENTS_ONLY",
        createdBy: "user-admin",
      },
    });
  }

  // Messages
  const messageData = [
    { senderId: "user-admin", receiverId: "user-teacher-1", subject: "Ratiba ya Mtihani", content: "Habari Mwalimu Rashid, Tafadhali hakikisha wanafunzi wako tayari kwa mtihani wa kati. Please ensure your students are prepared for midterm exams." },
    { senderId: "user-teacher-1", receiverId: "user-admin", subject: "Re: Ratiba ya Mtihani", content: "Asante Khamis. Wanafunzi wako tayari. Thank you, students are ready." },
    { senderId: "user-parent-1", receiverId: "user-admin", subject: "Kuhusu Ada ya Shule", content: "Habari Mkuu, Ningependa kujua kama ninaweza kulipa ada kwa sehemu. Hello Headmaster, I would like to know if I can pay fees in installments." },
    { senderId: "user-admin", receiverId: "user-parent-1", subject: "Re: Kuhusu Ada ya Shule", content: "Ndipo, unaweza kulipa kwa sehemu mbili. Yes, you can pay in two installments." },
    { senderId: "user-teacher-3", receiverId: "user-teacher-1", subject: "Ushirikiano wa Sayansi", content: "Mwalimu Rashid, tuunganie nguvu katika maandalizi ya mtihani wa Sayansi. Let's collaborate on Science exam preparation." },
    { senderId: "user-accountant", receiverId: "user-admin", subject: "Ripoti ya Fedha", content: "Mkuu, ripoti ya fedha ya mwezi Machi iko tayari. The March financial report is ready." },
    { senderId: "user-admin", receiverId: "user-accountant", subject: "Re: Ripoti ya Fedha", content: "Asante Said. Nitaiangalia. Thank you Said. I will review it." },
    { senderId: "user-teacher-2", receiverId: "user-parent-2", subject: "Maendeleo ya Mwanafunzi", content: "Habari, Ninafurahisha kuwa mtoto wako anafanya vizuri katika Kiswahili. Hello, I am pleased that your child is doing well in Kiswahili." },
    { senderId: "user-librarian", receiverId: "user-teacher-5", subject: "Vitabu Vipya", content: "Mwalimu Idris, vitabu vipya vya Kompyuta vimefika. Teacher Idris, new Computer Science books have arrived." },
    { senderId: "user-receptionist", receiverId: "user-admin", subject: "Mgeni wa Leo", content: "Khamis, kuna mgeni anayetaka kukutana nawe leo asubuhi. There is a visitor who wants to meet you this morning." },
  ];

  for (let i = 0; i < messageData.length; i++) {
    const m = messageData[i];
    await prisma.message.create({
      data: {
        id: `msg-${i + 1}`,
        senderId: m.senderId,
        receiverId: m.receiverId,
        subject: m.subject,
        content: m.content,
        isRead: i % 3 !== 0,
        readAt: i % 3 !== 0 ? new Date() : null,
      },
    });
  }
  console.log(`✅ ${announcementData.length} announcements, ${eventData.length} events, ${messageData.length} messages\n`);

  // ─── Step 17: Notifications ─────────────────────────────────────────────
  console.log("🔔 Creating notifications...");

  const notificationData = [
    { userId: "user-admin", type: "ATTENDANCE" as const, title: "Hudhurio la Leo", message: "Wanafunzi 85% wamehudhuria leo. 85% of students attended today.", link: "/attendance" },
    { userId: "user-admin", type: "FEE" as const, title: "Ada ilipwa", message: "Mzazi Juma Hassan amelipia ada ya mwezi huu. Parent Juma Hassan has paid this month's fees.", link: "/finance/invoices" },
    { userId: "user-teacher-1", type: "ASSIGNMENT" as const, title: "Kazi imewasilishwa", message: "Wanafunzi 5 wamewasilisha kazi ya Hisabati. 5 students have submitted the Mathematics assignment.", link: "/academic/assignments" },
    { userId: "user-teacher-1", type: "ATTENDANCE" as const, title: "Kumbusha Hudhurio", message: "Tafadhali weka hudhurio la leo. Please mark today's attendance.", link: "/attendance" },
    { userId: "user-teacher-2", type: "EXAM" as const, title: "Mtihani karibu", message: "Mtihani wa Kiswahili utaanza wiki ijayo. Swahili exam starts next week.", link: "/academic/exams" },
    { userId: "user-parent-1", type: "FEE" as const, title: "Ada Inadaiwa", message: "Ada ya mwanafunzi wako inadaiwa. Tafadhali lipa kabla ya tarehe 15. Your child's fees are due. Please pay before the 15th.", link: "/finance/invoices" },
    { userId: "user-parent-2", type: "ANNOUNCEMENT" as const, title: "Tangazo Jipya", message: "Kuna tangazo jipya la shule. There is a new school announcement.", link: "/communication/announcements" },
    { userId: "user-parent-3", type: "ATTENDANCE" as const, title: "Mtoto hakuhudhuria", message: "Mtoto wako hakuhudhuria leo. Your child was absent today.", link: "/attendance" },
    { userId: "user-accountant", type: "FEE" as const, title: "Malipo Mapya", message: "Malipo mapya yameingia. New payment has been received.", link: "/finance/invoices" },
    { userId: "user-accountant", type: "WARNING" as const, title: "Ada Iliyokwama", message: "Wanafunzi 15 bado hawajalipa ada. 15 students have not yet paid fees.", link: "/finance/invoices" },
    { userId: "user-librarian", type: "INFO" as const, title: "Vitabu Vimepotea", message: "Vitabu 3 vimerudishwa kwa hali mbaya. 3 books returned in poor condition.", link: "/library/borrow" },
    { userId: "user-receptionist", type: "EVENT" as const, title: "Tukio la Kesho", message: "Kuna mkutano wa wazazi kesho. Parents' meeting tomorrow.", link: "/communication/events" },
    { userId: "user-teacher-3", type: "LEAVE" as const, title: "Ombi la Likizo", message: "Ombi lako la likizo limeidhinishwa. Your leave application has been approved.", link: "/hr/leave" },
    { userId: "user-itadmin", type: "INFO" as const, title: "Mfumo umesasishwa", message: "Mfumo wa shule umesasishwa kwa usalama zaidi. School system updated for better security.", link: "/settings" },
    { userId: "user-admin", type: "SUCCESS" as const, title: "Mwezi Mzuri", message: "Mwezi huu umekuwa na mafanikio mengi. This month has been very successful.", link: "/dashboard" },
    { userId: "user-teacher-4", type: "ASSIGNMENT" as const, title: "Mwisho wa Kazi", message: "Kazi ya Jamii na Maadili inaisha kesho. Social Studies assignment due tomorrow.", link: "/academic/assignments" },
    { userId: "user-parent-5", type: "EVENT" as const, title: "Tamasha la Utamaduni", message: "Tamasha la utamaduni litafanyika Jumatano. Cultural festival on Wednesday.", link: "/communication/events" },
    { userId: "user-teacher-5", type: "MESSAGE" as const, title: "Ujumbe Mpya", message: "Una ujumbe mpya kutoka kwa Mkuu. New message from the Headmaster.", link: "/communication/messages" },
    { userId: "user-admin", type: "ERROR" as const, title: "Hitilafu ya Mfumo", message: "Kulikuwa na hitilafu kidogo ya mfumo ikasawazishwa. Minor system glitch resolved.", link: "/settings" },
    { userId: "user-teacher-1", type: "EXAM" as const, title: "Matokeo Yako", message: "Matokeo ya mtihani wa kati yako tayari. Midterm exam results are ready.", link: "/academic/exams" },
  ];

  for (let i = 0; i < notificationData.length; i++) {
    const n = notificationData[i];
    await prisma.notification.create({
      data: {
        id: `notif-${i + 1}`,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: i % 3 !== 0,
        readAt: i % 3 !== 0 ? new Date() : null,
      },
    });
  }
  console.log(`✅ ${notificationData.length} notifications\n`);

  // ─── Step 18: Audit Logs ────────────────────────────────────────────────
  console.log("📜 Creating audit logs...");

  const auditData = [
    { userId: "user-admin", action: "CREATE", entityType: "Student", entityId: "student-1", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-admin", action: "CREATE", entityType: "Staff", entityId: "staff-teacher-1", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-accountant", action: "CREATE", entityType: "Invoice", entityId: "invoice-1", ipAddress: "192.168.1.15", userAgent: "Chrome/120" },
    { userId: "user-accountant", action: "UPDATE", entityType: "Payment", entityId: "payment-1", ipAddress: "192.168.1.15", userAgent: "Firefox/121" },
    { userId: "user-admin", action: "LOGIN", entityType: "User", entityId: "user-admin", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-teacher-1", action: "LOGIN", entityType: "User", entityId: "user-teacher-1", ipAddress: "192.168.1.20", userAgent: "Safari/17" },
    { userId: "user-admin", action: "UPDATE", entityType: "School", entityId: "school-baraka", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-admin", action: "CREATE", entityType: "Event", entityId: "event-1", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-itadmin", action: "UPDATE", entityType: "User", entityId: "user-teacher-3", ipAddress: "192.168.1.30", userAgent: "Chrome/120" },
    { userId: "user-admin", action: "DELETE", entityType: "Announcement", entityId: "ann-draft", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-teacher-1", action: "CREATE", entityType: "Assignment", entityId: "assignment-1", ipAddress: "192.168.1.20", userAgent: "Chrome/120" },
    { userId: "user-teacher-1", action: "UPDATE", entityType: "AssignmentSubmission", entityId: "submission-1-1", ipAddress: "192.168.1.20", userAgent: "Chrome/120" },
    { userId: "user-librarian", action: "CREATE", entityType: "BorrowRecord", entityId: "borrow-1", ipAddress: "192.168.1.25", userAgent: "Firefox/121" },
    { userId: "user-admin", action: "EXPORT", entityType: "Student", entityId: "export-students", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-accountant", action: "CREATE", entityType: "Payroll", entityId: "payroll-march-2025", ipAddress: "192.168.1.15", userAgent: "Chrome/120" },
    { userId: "user-admin", action: "LOGIN_FAILED", entityType: "User", entityId: "unknown", ipAddress: "10.0.0.55", userAgent: "curl/7.88" },
    { userId: "user-admin", action: "PASSWORD_RESET", entityType: "User", entityId: "user-teacher-5", ipAddress: "192.168.1.10", userAgent: "Chrome/120" },
    { userId: "user-itadmin", action: "FILE_UPLOAD", entityType: "FileRecord", entityId: "file-1", ipAddress: "192.168.1.30", userAgent: "Chrome/120" },
  ];

  for (let i = 0; i < auditData.length; i++) {
    const a = auditData[i];
    const createdAt = new Date(today);
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 14));
    await prisma.auditLog.create({
      data: {
        id: `audit-${i + 1}`,
        userId: a.userId,
        schoolId: school.id,
        action: a.action as "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "LOGIN_FAILED" | "PASSWORD_RESET" | "MFA_ENABLED" | "MFA_DISABLED" | "SESSION_REVOKED" | "FILE_UPLOAD" | "FILE_DELETE" | "EXPORT",
        entityType: a.entityType,
        entityId: a.entityId,
        ipAddress: a.ipAddress,
        userAgent: a.userAgent,
        createdAt,
      },
    });
  }
  console.log(`✅ ${auditData.length} audit logs\n`);

  // ─── Step 19: Performance Evaluations ───────────────────────────────────
  console.log("⭐ Creating performance evaluations...");
  const evalCriteria = [
    { punctuality: 8, teachingQuality: 9, studentEngagement: 8, professionalism: 9, communication: 7 },
    { punctuality: 9, teachingQuality: 8, studentEngagement: 9, professionalism: 8, communication: 9 },
    { punctuality: 7, teachingQuality: 8, studentEngagement: 7, professionalism: 9, communication: 8 },
  ];

  for (let i = 0; i < 3; i++) {
    const c = evalCriteria[i];
    const overall = Math.round((c.punctuality + c.teachingQuality + c.studentEngagement + c.professionalism + c.communication) / 5 * 10) / 10;
    const rating = overall >= 8.5 ? "Excellent" : overall >= 7 ? "Good" : "Satisfactory";

    await prisma.performanceEvaluation.create({
      data: {
        id: `eval-${i + 1}`,
        staffId: teacherStaffIds[i],
        termId: "term-2",
        evaluatedBy: "user-admin",
        criteria: c,
        overallScore: overall,
        overallRating: rating,
        comments: rating === "Excellent" ? "Kazi nzuri sana! Outstanding performance." : "Inaweza kuboreshwa. Can improve in some areas.",
      },
    });
  }
  console.log("✅ 3 performance evaluations\n");

  // ─── Final Summary ──────────────────────────────────────────────────────
  console.log("\n🎉 Seed completed successfully!\n");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("           BARAKA ACADEMY ZANZIBAR - TEST USER CREDENTIALS          ");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  Role              | Email                          | Password     ");
  console.log("───────────────────────────────────────────────────────────────────");
  const credRows = [
    ["SUPER_ADMIN", "superadmin@baraka.sc.tz"],
    ["SCHOOL_ADMIN", "admin@baraka.sc.tz"],
    ["IT_ADMIN", "itadmin@baraka.sc.tz"],
    ["TEACHER (1-12)", "teacher1@baraka.sc.tz .. teacher12@baraka.sc.tz"],
    ["STUDENT (1-100)", "student1@baraka.sc.tz .. student100@baraka.sc.tz"],
    ["PARENT (1-50)", "parent1@baraka.sc.tz .. parent50@baraka.sc.tz"],
    ["ACCOUNTANT", "accountant@baraka.sc.tz"],
    ["LIBRARIAN", "librarian@baraka.sc.tz"],
    ["RECEPTIONIST", "receptionist@baraka.sc.tz"],
  ];
  for (const [role, email] of credRows) {
    console.log(`  ${role.padEnd(18)} | ${email.padEnd(30)} | ${TEST_PASSWORD}`);
  }
  console.log("═══════════════════════════════════════════════════════════════════\n");
  console.log("📍 School: Baraka Academy Zanzibar (BAR001)");
  console.log("💱 Currency: TZS (Tanzanian Shilling)");
  console.log("🕐 Timezone: Africa/Dar_es_Salaam");
  console.log("📞 Phone format: 0XXXXXXXXX (Zanzibar/Tanzania)\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });