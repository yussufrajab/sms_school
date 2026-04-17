# School Management System - Database & System Management Guide

## Database Configuration

### Current Database Settings (Test Server)

| Setting | Value |
|---------|-------|
| **Database Type** | PostgreSQL |
| **Database Name** | `prizdb` |
| **Username** | `yusuf` |
| **Password** | `esek` |
| **Host** | `localhost` |
| **Port** | `5432` |
| **Connection String** | `postgres://yusuf:esek@localhost:5432/prizdb` |

> **Note:** The `docker-compose.yml` file contains alternative settings (`sms_db`/`sms_user`/`sms_password`) for containerized deployments, but the test server uses the local PostgreSQL instance above.

---

## Starting the System

### Prerequisites

1. **Node.js** (v20 or higher)
2. **PostgreSQL** (v15 or higher) running locally
3. **npm** or **yarn** package manager

### Quick Start Steps

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Environment Variables

Ensure the `.env.local` file contains the correct database connection:

```env
DATABASE_URL="postgres://yusuf:esek@localhost:5432/prizdb"
```

#### 3. Generate Prisma Client

```bash
npm run db:generate
```

#### 4. Run Database Migrations

```bash
npm run db:push
```

#### 5. Seed the Database (Optional - for test data)

```bash
npm run db:seed
```

This creates:
- A sample school (Springfield International School)
- Academic year 2025-2026
- Grades 1-10 with sections A and B
- 8 subjects
- Test users for all roles (see User Credentials below)

#### 6. Start Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

---

## System Management Script (manage.sh)

The `manage.sh` script provides interactive and command-line management of the School Management System.

### Making the Script Executable

```bash
chmod +x manage.sh
```

### Usage Modes

#### 1. Interactive Mode (Recommended)

Run without arguments to open the interactive menu:

```bash
./manage.sh
```

This displays a menu with 25 options for managing all aspects of the system:

```
================================
  SMS Service Manager
================================

  Database: prizdb (user: yusuf)
  Frontend Port: 3000

  ─── Start/Stop ────────────────────────────
  1)  Start all services
  2)  Start frontend only
  3)  Start Prisma Studio
  4)  Stop all services
  5)  Stop frontend only
  6)  Stop Prisma Studio

  ─── Restart ───────────────────────────────
  7)  Restart all services
  8)  Restart frontend only
  9)  Restart Prisma Studio

  ─── Database Management ───────────────────
  10) Seed database (test data)
  11) Run migrations
  12) Generate Prisma client
  13) Reset database
  14) Open Prisma Studio

  ─── Monitor ───────────────────────────────
  15) Check status
  16) View frontend logs (last 50 lines)
  17) View Prisma Studio logs
  18) View all logs
  19) Tail frontend logs (real-time)
  20) Tail Prisma Studio logs (real-time)
  21) Tail all logs (real-time)

  ─── Utilities ─────────────────────────────
  22) Show user credentials
  23) Install dependencies
  24) Build for production
  25) Clean build artifacts

  0)  Exit
================================
```

#### 2. Command-Line Mode

Use commands directly for scripting or quick access:

```bash
# Start/Stop/Restart
./manage.sh start [frontend|prisma-studio|all]
./manage.sh stop [frontend|prisma-studio|all]
./manage.sh restart [frontend|prisma-studio|all]

# Database Management
./manage.sh db-seed      # Seed database with test data
./manage.sh db-migrate   # Run database migrations
./manage.sh db-generate  # Generate Prisma client
./manage.sh db-reset     # Reset database (deletes all data)
./manage.sh db-studio    # Open Prisma Studio (database GUI)

# Monitoring
./manage.sh status              # Check status of all services
./manage.sh logs [service]      # View logs (frontend|prisma-studio|all)
./manage.sh tail-logs [service] # Tail logs in real-time

# Utilities
./manage.sh users    # Show test user credentials
./manage.sh install  # Install npm dependencies
./manage.sh build    # Build for production
./manage.sh clean    # Clean build artifacts
./manage.sh help     # Show help message
```

### How the Script Works

#### Service Management

The script manages the Next.js frontend server running on port 3000:

1. **Start Frontend**: 
   - Cleans up any existing Next.js processes
   - Frees port 3000 if in use
   - Starts `npm run dev` in the background
   - Logs output to `/tmp/sms/frontend.log`
   - Waits for the port to be listening (up to 45 seconds)

2. **Stop Frontend**:
   - Identifies processes using port 3000
   - Kills the process and frees the port
   - Uses `fuser` as fallback if needed

3. **Status Check**:
   - Checks if port 3000 is listening
   - Verifies HTTP response from localhost:3000
   - Parses logs for "ready", "compiling", or "error" states
   - Displays PID if available

#### Database Integration

The script connects to PostgreSQL using:
- Host: `localhost`
- Port: `5432`
- Database: `prizdb`
- User: `yusuf`

It validates database connectivity before starting services.

#### Log Management

All logs are stored in `/tmp/sms/`:
- `frontend.log` - Next.js development server logs
- `prisma-studio.log` - Prisma Studio logs

### Usage Examples

```bash
# Interactive mode
./manage.sh

# Quick start (all services)
./manage.sh start

# Check what's running
./manage.sh status

# Seed the database with test users
./manage.sh db-seed

# View login credentials
./manage.sh users

# Start and monitor logs
./manage.sh start
./manage.sh tail-logs frontend

# Database operations
./manage.sh db-generate  # After schema changes
./manage.sh db-migrate   # Apply migrations
./manage.sh db-studio    # Open database GUI on port 5555
```

---

## User Roles and Credentials

### Default Test Password

**All test users share the same password:** `Test@123456`

### User Roles Table

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **SUPER_ADMIN** | `superadmin@baraka.sc.tz` | `Test@123456` | System-wide administrator (not tied to any school) |
| **SCHOOL_ADMIN** | `admin@baraka.sc.tz` | `Test@123456` | School-level administrator |
| **IT_ADMIN** | `itadmin@baraka.sc.tz` | `Test@123456` | IT support and system configuration |
| **TEACHER** | `teacher1@baraka.sc.tz` | `Test@123456` | Teaching staff - manages classes, assignments, exams |
| **STUDENT** | `student1@baraka.sc.tz` | `Test@123456` | Student - views grades, assignments, attendance |
| **PARENT** | `parent1@baraka.sc.tz` | `Test@123456` | Parent - monitors child's progress |
| **ACCOUNTANT** | `accountant@baraka.sc.tz` | `Test@123456` | Finance management - fees, invoices, payments |
| **LIBRARIAN** | `librarian@baraka.sc.tz` | `Test@123456` | Library management - books, borrow records |
| **RECEPTIONIST** | `receptionist@baraka.sc.tz` | `Test@123456` | Front office - visitor management, communications |

### Role Permissions Overview

| Role | Dashboard Access | Key Permissions |
|------|-----------------|-----------------|
| SUPER_ADMIN | System-wide | All schools, user management, system settings |
| SCHOOL_ADMIN | School dashboard | Staff management, class management, school settings |
| IT_ADMIN | Admin dashboard | System configuration, audit logs, technical settings |
| TEACHER | Teacher dashboard | Assignments, exams, attendance, timetables |
| STUDENT | Student dashboard | View assignments, grades, attendance, notifications |
| PARENT | Parent dashboard | View child's progress, fees, communications |
| ACCOUNTANT | Accountant dashboard | Fee management, invoices, payments, financial reports |
| LIBRARIAN | Librarian dashboard | Book management, borrow/return, fines |
| RECEPTIONIST | Reception dashboard | Visitor log, announcements, communications |

---

## Docker Deployment (Alternative)

For containerized deployment, use Docker Compose:

```bash
# Start all services (PostgreSQL, MinIO, App)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Environment Variables

When using Docker, update `.env.local`:

```env
DATABASE_URL="postgresql://sms_user:sms_password@postgres:5432/sms_db"
MINIO_ENDPOINT="minio"
MINIO_PORT="9000"
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U yusuf -d prizdb

# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL service (if not running)
sudo systemctl start postgresql
```

### Frontend Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Force kill any process on port 3000
fuser -k 3000/tcp

# Check logs for errors
./manage.sh logs frontend

# Clean and rebuild
./manage.sh clean
./manage.sh install
./manage.sh db-generate
```

### Reset Database Schema

```bash
# Using the manage script
./manage.sh db-reset

# Using Prisma directly
npm run db:push -- --force-reset
```

### Prisma Studio Issues

```bash
# Check if port 5555 is available
lsof -i :5555

# Stop any existing Prisma Studio
./manage.sh stop prisma-studio

# Start fresh
./manage.sh db-studio
```

---

## Quick Reference Card

```bash
# Daily workflow
./manage.sh              # Open interactive menu
./manage.sh start        # Start all services
./manage.sh status       # Check what's running
./manage.sh users        # Get login credentials

# Database operations
./manage.sh db-seed      # Add test data
./manage.sh db-studio    # Open database GUI

# Troubleshooting
./manage.sh logs         # View recent logs
./manage.sh tail-logs    # Watch logs in real-time
./manage.sh stop         # Stop everything
./manage.sh start        # Start fresh
```

---

## Support

For issues or questions:
1. Check the logs: `./manage.sh logs` or `./manage.sh tail-logs`
2. Verify database: `./manage.sh status`
3. Review Prisma schema: `prisma/schema.prisma`
4. Check frontend logs: `/tmp/sms/frontend.log`
