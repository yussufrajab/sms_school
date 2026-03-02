import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const TEST_PASSWORD = "Test@123456";

// Get DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

console.log("Database URL:", connectionString.replace(/:[^:@]+@/, ":****@"));

// Create pool with explicit configuration
const pool = new pg.Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Create school first
  const school = await prisma.school.upsert({
    where: { code: "SMS001" },
    update: {},
    create: {
      id: "school-sms001",
      name: "Springfield International School",
      code: "SMS001",
      address: "123 Education Lane, Springfield, ST 12345",
      phone: "+1-555-123-4567",
      email: "info@springfield.edu",
      website: "https://springfield.edu",
      timezone: "America/New_York",
      currency: "USD",
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Created school: ${school.name}`);

  // Create academic year
  const academicYear = await prisma.academicYear.upsert({
    where: { id: "academic-year-2025" },
    update: {},
    create: {
      id: "academic-year-2025",
      schoolId: school.id,
      name: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isCurrent: true,
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Created academic year: ${academicYear.name}`);

  // Create classes and sections
  const classes = [
    { name: "Grade 1", level: 1, sections: ["A", "B"] },
    { name: "Grade 2", level: 2, sections: ["A", "B"] },
    { name: "Grade 3", level: 3, sections: ["A", "B"] },
    { name: "Grade 4", level: 4, sections: ["A", "B"] },
    { name: "Grade 5", level: 5, sections: ["A", "B"] },
    { name: "Grade 6", level: 6, sections: ["A", "B"] },
    { name: "Grade 7", level: 7, sections: ["A", "B"] },
    { name: "Grade 8", level: 8, sections: ["A", "B"] },
    { name: "Grade 9", level: 9, sections: ["A", "B"] },
    { name: "Grade 10", level: 10, sections: ["A", "B"] },
  ];

  const createdSections: { id: string; name: string; class: { name: string } }[] = [];

  let classIndex = 0;
  for (const classData of classes) {
    classIndex++;
    // Use findFirst + create or update approach
    let cls = await prisma.class.findFirst({
      where: { schoolId: school.id, name: classData.name },
    });
    
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          id: `class-${classIndex}`,
          schoolId: school.id,
          name: classData.name,
          level: classData.level,
          updatedAt: new Date(),
        },
      });
    }

    let sectionIndex = 0;
    for (const sectionName of classData.sections) {
      sectionIndex++;
      let section = await prisma.section.findFirst({
        where: { classId: cls.id, name: sectionName },
      });
      
      if (!section) {
        section = await prisma.section.create({
          data: {
            id: `section-${classIndex}-${sectionIndex}`,
            classId: cls.id,
            name: sectionName,
            maxCapacity: 40,
            updatedAt: new Date(),
          },
        });
      }
      createdSections.push({ id: section.id, name: section.name, class: { name: cls.name } });
    }
  }

  console.log(`✅ Created ${classes.length} classes with sections`);

  // Create subjects
  const subjects = [
    { name: "Mathematics", code: "MATH101" },
    { name: "English Language", code: "ENG101" },
    { name: "Science", code: "SCI101" },
    { name: "Social Studies", code: "SS101" },
    { name: "Computer Science", code: "CS101" },
    { name: "Physical Education", code: "PE101" },
    { name: "Art", code: "ART101" },
    { name: "Music", code: "MUS101" },
  ];

  for (const subject of subjects) {
    const existing = await prisma.subject.findFirst({
      where: { schoolId: school.id, code: subject.code },
    });
    
    if (!existing) {
      await prisma.subject.create({
        data: {
          id: `subject-${subject.code}`,
          schoolId: school.id,
          name: subject.name,
          code: subject.code,
          type: "CORE",
          creditHours: 1,
          updatedAt: new Date(),
        },
      });
    }
  }

  console.log(`✅ Created ${subjects.length} subjects`);

  // Hash password for all users
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

  // Define test users for each role
  const testUsers = [
    {
      email: "superadmin@school.edu",
      name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      schoolId: null,
    },
    {
      email: "admin@school.edu",
      name: "John Administrator",
      role: UserRole.SCHOOL_ADMIN,
      schoolId: school.id,
    },
    {
      email: "teacher@school.edu",
      name: "Sarah Johnson",
      role: UserRole.TEACHER,
      schoolId: school.id,
    },
    {
      email: "student@school.edu",
      name: "Mike Student",
      role: UserRole.STUDENT,
      schoolId: school.id,
    },
    {
      email: "parent@school.edu",
      name: "David Parent",
      role: UserRole.PARENT,
      schoolId: school.id,
    },
    {
      email: "accountant@school.edu",
      name: "Emma Accountant",
      role: UserRole.ACCOUNTANT,
      schoolId: school.id,
    },
    {
      email: "librarian@school.edu",
      name: "Lisa Librarian",
      role: UserRole.LIBRARIAN,
      schoolId: school.id,
    },
    {
      email: "receptionist@school.edu",
      name: "Amy Receptionist",
      role: UserRole.RECEPTIONIST,
      schoolId: school.id,
    },
    {
      email: "itadmin@school.edu",
      name: "Tom IT Admin",
      role: UserRole.IT_ADMIN,
      schoolId: school.id,
    },
  ];

  console.log("\n📋 Creating test users...\n");

  for (const userData of testUsers) {
    // Find existing user by email
    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userData.name,
          role: userData.role,
          schoolId: userData.schoolId,
          isActive: true,
          password: hashedPassword,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          id: `user-${userData.role.toLowerCase()}`,
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role,
          schoolId: userData.schoolId,
          isActive: true,
          emailVerified: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Create role-specific records
    if (userData.role === UserRole.TEACHER) {
      const existingStaff = await prisma.staff.findUnique({
        where: { userId: user.id },
      });
      
      if (!existingStaff) {
        await prisma.staff.create({
          data: {
            id: `staff-${user.id}`,
            userId: user.id,
            schoolId: school.id,
            employeeId: "EMP-2025-001",
            firstName: "Sarah",
            lastName: "Johnson",
            department: "Science",
            designation: "Senior Teacher",
            employmentType: "FULL_TIME",
            startDate: new Date("2020-01-15"),
            updatedAt: new Date(),
          },
        });
      }
    }

    if (userData.role === UserRole.STUDENT) {
      const section = createdSections[0];
      const existingStudent = await prisma.student.findUnique({
        where: { userId: user.id },
      });
      
      if (!existingStudent) {
        await prisma.student.create({
          data: {
            id: `student-${user.id}`,
            userId: user.id,
            schoolId: school.id,
            studentId: "SMS-2025-00001",
            firstName: "Mike",
            lastName: "Student",
            dateOfBirth: new Date("2010-05-15"),
            gender: "Male",
            sectionId: section.id,
            status: "ACTIVE",
            updatedAt: new Date(),
          },
        });
      }
    }

    if (userData.role === UserRole.PARENT) {
      const existingParent = await prisma.parent.findUnique({
        where: { userId: user.id },
      });
      
      if (!existingParent) {
        await prisma.parent.create({
          data: {
            id: `parent-${user.id}`,
            userId: user.id,
            schoolId: school.id,
            firstName: "David",
            lastName: "Parent",
            relationship: "Father",
            phone: "+1-555-987-6543",
            updatedAt: new Date(),
          },
        });
      }
    }

    if (userData.role === UserRole.ACCOUNTANT || 
        userData.role === UserRole.LIBRARIAN || 
        userData.role === UserRole.RECEPTIONIST ||
        userData.role === UserRole.IT_ADMIN ||
        userData.role === UserRole.SCHOOL_ADMIN) {
      const existingStaff = await prisma.staff.findUnique({
        where: { userId: user.id },
      });
      
      if (!existingStaff) {
        await prisma.staff.create({
          data: {
            id: `staff-${user.id}`,
            userId: user.id,
            schoolId: school.id,
            employeeId: `EMP-2025-${testUsers.indexOf(userData) + 2}`.padEnd(12, "0"),
            firstName: userData.name.split(" ")[0],
            lastName: userData.name.split(" ")[1] || "",
            department: userData.role === UserRole.ACCOUNTANT ? "Finance" :
                       userData.role === UserRole.LIBRARIAN ? "Library" :
                       userData.role === UserRole.RECEPTIONIST ? "Front Office" :
                       userData.role === UserRole.IT_ADMIN ? "IT" : "Administration",
            designation: userData.role.replace("_", " "),
            employmentType: "FULL_TIME",
            startDate: new Date("2023-01-01"),
            updatedAt: new Date(),
          },
        });
      }
    }

    console.log(`   ✅ ${userData.role.padEnd(15)} | ${userData.email.padEnd(25)} | ${TEST_PASSWORD}`);
  }

  console.log("\n🎉 Seed completed successfully!\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    TEST USER CREDENTIALS                        ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Role              | Email                        | Password    ");
  console.log("───────────────────────────────────────────────────────────────");
  for (const user of testUsers) {
    console.log(`  ${user.role.padEnd(17)} | ${user.email.padEnd(28)} | ${TEST_PASSWORD}`);
  }
  console.log("═══════════════════════════════════════════════════════════════\n");
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
