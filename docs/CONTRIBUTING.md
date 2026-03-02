# Contributing to School Management System

Thank you for your interest in contributing to the School Management System! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation](#documentation)
9. [Issue Reporting](#issue-reporting)
10. [Feature Requests](#feature-requests)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- PostgreSQL 14.x or higher
- Git
- A GitHub account

### Fork and Clone

1. **Fork the repository**
   - Click "Fork" on GitHub
   - Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/school-management-system.git
   cd school-management-system
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/school-management-system.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

5. **Setup database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

---

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New feature | `feat/student-attendance` |
| `fix/` | Bug fix | `fix/login-validation` |
| `docs/` | Documentation | `docs/api-endpoints` |
| `style/` | Code style | `style/format-dashboard` |
| `refactor/` | Code refactoring | `refactor/auth-service` |
| `test/` | Adding tests | `test/attendance-unit-tests` |
| `chore/` | Maintenance | `chore/update-dependencies` |

### Keep Your Branch Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge into your branch
git checkout your-branch
git merge upstream/main

# Or rebase for cleaner history
git rebase upstream/main
```

### Development Process

1. **Create a branch**
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make changes**
   - Write clean, documented code
   - Follow coding standards
   - Add tests for new functionality

3. **Test your changes**
   ```bash
   npm run lint
   npm run build
   # Run relevant tests
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add student attendance feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feat/your-feature
   ```

6. **Create Pull Request**
   - Go to GitHub and create a PR
   - Fill in the PR template
   - Request review from maintainers

---

## Coding Standards

### TypeScript Guidelines

#### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `studentCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_STUDENTS` |
| Functions | camelCase | `calculateGrade()` |
| Classes | PascalCase | `StudentService` |
| Interfaces | PascalCase | `IStudent` |
| Types | PascalCase | `StudentData` |
| Enums | PascalCase | `StudentStatus` |
| Files (components) | kebab-case | `student-list.tsx` |
| Files (utilities) | kebab-case | `date-utils.ts` |

#### Code Style

```typescript
// ✅ Good
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  status: StudentStatus;
}

async function getStudentById(id: string): Promise<Student | null> {
  return prisma.student.findUnique({ where: { id } });
}

// ❌ Bad
interface student {
  Id: string;
  FirstName: string;
  LastName: string;
  Status: any;
}

function getStudent(id) {
  return prisma.student.findUnique({ where: { id } });
}
```

### React/Next.js Guidelines

#### Component Structure

```tsx
// Imports (grouped)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Types
interface StudentCardProps {
  student: Student;
  onEdit?: (id: string) => void;
}

// Component
export function StudentCard({ student, onEdit }: StudentCardProps) {
  // Hooks at the top
  const router = useRouter();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  // Derived state
  const fullName = `${student.firstName} ${student.lastName}`;

  // Handlers
  const handleClick = () => {
    onEdit?.(student.id);
  };

  // Effects
  useEffect(() => {
    // Side effects
  }, []);

  // Early returns
  if (!student) {
    return <div>No student data</div>;
  }

  // Main render
  return (
    <div className="p-4 border rounded-lg">
      <h3>{fullName}</h3>
      <Button onClick={handleClick}>Edit</Button>
    </div>
  );
}
```

#### Server vs Client Components

```tsx
// Server Component (default)
// app/students/page.tsx
import { StudentList } from './student-list';
import { getStudents } from '@/lib/api';

export default async function StudentsPage() {
  const students = await getStudents();
  
  return (
    <div>
      <h1>Students</h1>
      <StudentList students={students} />
    </div>
  );
}

// Client Component
// app/students/student-list.tsx
'use client';

import { useState } from 'react';

export function StudentList({ students }: { students: Student[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  
  return (
    <ul>
      {students.map(student => (
        <li key={student.id} onClick={() => setSelected(student.id)}>
          {student.firstName}
        </li>
      ))}
    </ul>
  );
}
```

### API Route Guidelines

```typescript
// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const createStudentSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  sectionId: z.string().uuid(),
});

// GET handler
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const students = await prisma.student.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: { section: true },
    });

    return NextResponse.json({ data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createStudentSchema.parse(body);

    const student = await prisma.student.create({
      data: validatedData,
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Database Guidelines

#### Prisma Schema

```prisma
model Student {
  id          String         @id @default(uuid())
  studentId   String         @unique
  firstName   String
  lastName    String
  email       String?        @unique
  status      StudentStatus  @default(ACTIVE)
  sectionId   String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  deletedAt   DateTime?

  section     Section?       @relation(fields: [sectionId], references: [id])
  
  @@index([sectionId])
  @@index([status])
}
```

#### Query Optimization

```typescript
// ✅ Good - Select only needed fields
const students = await prisma.student.findMany({
  select: {
    id: true,
    firstName: true,
    lastName: true,
    section: {
      select: { name: true }
    }
  },
  where: { status: 'ACTIVE' },
  take: 20,
});

// ❌ Bad - Fetching all fields and relations
const students = await prisma.student.findMany({
  include: { section: true, parents: true, attendance: true }
});
```

### CSS/Tailwind Guidelines

```tsx
// Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <span className="text-lg font-semibold text-gray-900">Title</span>
  <Button variant="primary" size="sm">Action</Button>
</div>

// Use cn() for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  "p-4 rounded-lg",
  isActive ? "bg-green-100" : "bg-gray-100"
)}>
  Content
</div>

// Extract repeated styles to components
// components/ui/card.tsx
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "p-6 bg-white rounded-lg border shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}
```

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Code style (formatting, semicolons) |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Examples

```bash
# Feature
feat(attendance): add bulk attendance marking

# Bug fix
fix(auth): resolve session timeout issue

# Documentation
docs(api): update student endpoint documentation

# Breaking change
feat(api)!: change student response format

BREAKING CHANGE: Student API now returns nested section object
```

### Commit Best Practices

- Write clear, descriptive commit messages
- Keep commits atomic (one logical change per commit)
- Reference issues in commits: `fix: resolve #123`
- Don't commit sensitive information
- Don't commit generated files (build output, node_modules)

---

## Pull Request Process

### Before Submitting

- [ ] Code compiles without errors
- [ ] All tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Commit messages follow guidelines
- [ ] Branch is up-to-date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests added for new functionality
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs
   - Linting and type checking
   - Test suite execution

2. **Code Review**
   - At least one approval required
   - Address all review comments
   - Keep discussions constructive

3. **Merge Requirements**
   - All checks pass
   - At least one approval
   - No merge conflicts
   - Branch up-to-date

### After Merge

- Delete your feature branch
- Update your local main branch
- Start a new branch for next feature

---

## Testing Guidelines

### Unit Tests

```typescript
// __tests__/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, calculateAge } from '@/lib/utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('Jan 15, 2024');
  });

  it('should handle invalid dates', () => {
    expect(formatDate(null)).toBe('N/A');
  });
});

describe('calculateAge', () => {
  it('should calculate age correctly', () => {
    const birthDate = new Date('2010-05-15');
    const age = calculateAge(birthDate);
    expect(age).toBeGreaterThanOrEqual(13);
  });
});
```

### Integration Tests

```typescript
// __tests__/api/students.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/students/route';

describe('Students API', () => {
  describe('GET /api/students', () => {
    it('should return paginated students', async () => {
      const request = new Request('http://localhost/api/students?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toBeDefined();
    });
  });

  describe('POST /api/students', () => {
    it('should create a new student', async () => {
      const request = new Request('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          sectionId: 'uuid-here'
        })
      });
      
      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- student.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

---

## Documentation

### Code Documentation

```typescript
/**
 * Calculates the final grade for a student based on weighted scores.
 * 
 * @param scores - Array of score objects with marks and weight
 * @param scores[].marks - The marks obtained
 * @param scores[].maxMarks - Maximum possible marks
 * @param scores[].weight - Weight percentage (0-100)
 * @returns The final grade as a percentage
 * 
 * @example
 * const grade = calculateFinalGrade([
 *   { marks: 85, maxMarks: 100, weight: 40 },
 *   { marks: 90, maxMarks: 100, weight: 60 }
 * ]);
 * // Returns: 88
 */
function calculateFinalGrade(scores: Score[]): number {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing configuration
- Updating dependencies
- Modifying API endpoints

### API Documentation

Update API_DOCUMENTATION.md when:
- Adding new endpoints
- Changing request/response formats
- Modifying authentication requirements

---

## Issue Reporting

### Before Reporting

1. Search existing issues
2. Check if it's already fixed
3. Try to reproduce the issue
4. Gather relevant information

### Issue Template

```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
If applicable

## Environment
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 20.10.0]

## Additional Context
Any other relevant information
```

### Bug Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `critical` | System-breaking issue |
| `high` | Important issue |
| `medium` | Normal issue |
| `low` | Minor issue |

---

## Feature Requests

### Before Requesting

1. Check if feature already exists
2. Search existing feature requests
3. Consider if it fits the project scope

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
Screenshots, mockups, or examples

## Would you be willing to submit a PR?
- [ ] Yes, I'd like to submit a PR for this feature
```

---

## Project Structure

```
school-management-system/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seed data
│   └── migrations/        # Migration files
├── src/
│   ├── app/
│   │   ├── (auth)/        # Authentication pages
│   │   ├── (dashboard)/   # Dashboard pages
│   │   ├── api/           # API routes
│   │   └── layout.tsx     # Root layout
│   ├── components/
│   │   ├── ui/            # Base UI components
│   │   ├── dashboard/     # Dashboard components
│   │   └── shared/        # Shared components
│   ├── lib/
│   │   ├── prisma.ts      # Prisma client
│   │   ├── auth.ts        # Auth configuration
│   │   └── utils.ts       # Utility functions
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript types
├── public/                # Static assets
├── docs/                  # Documentation
└── tests/                 # Test files
```

---

## Getting Help

### Resources

- **Documentation**: Check the `docs/` folder
- **GitHub Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions

### Contact

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: maintainers@school-system.com

---

## Recognition

Contributors are recognized in:
- GitHub Contributors page
- Release notes for significant contributions
- Project README (major contributors)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Document Version

- **Version**: 1.0.0
- **Last Updated**: March 2026
- **Author**: School Management System Team