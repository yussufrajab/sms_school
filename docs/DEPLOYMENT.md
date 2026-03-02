# School Management System - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Local Development](#local-development)
5. [Production Deployment](#production-deployment)
   - [Docker Deployment](#docker-deployment)
   - [Vercel Deployment](#vercel-deployment)
   - [VPS/Cloud Deployment](#vpscloud-deployment)
6. [SSL Configuration](#ssl-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup Strategy](#backup-strategy)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB SSD | 50+ GB SSD |
| Node.js | 18.x | 20.x LTS |
| PostgreSQL | 14.x | 16.x |
| Redis | 6.x | 7.x (optional, for caching) |

### Required Software

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or yarn/pnpm)
- **PostgreSQL** 14.x or higher
- **Git**
- **Docker** & **Docker Compose** (for containerized deployment)

### External Services

- **Email Service**: SMTP server or transactional email service (SendGrid, Mailgun, AWS SES)
- **File Storage**: AWS S3, Google Cloud Storage, or local storage
- **SMS Gateway** (optional): Twilio, AWS SNS

---

## Environment Setup

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=School Management System

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/school_db?schema=public

# Authentication (NextAuth.js)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-key-at-least-32-characters-long

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@your-domain.com

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: SMS Gateway (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Configuration

### PostgreSQL Setup

#### Option 1: Local PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE USER school_user WITH PASSWORD 'secure_password';
CREATE DATABASE school_db OWNER school_user;
GRANT ALL PRIVILEGES ON DATABASE school_db TO school_user;
\q
```

#### Option 2: Managed PostgreSQL (Recommended for Production)

- **AWS RDS**: PostgreSQL managed service
- **Google Cloud SQL**: Fully managed PostgreSQL
- **Supabase**: Open-source Firebase alternative with PostgreSQL
- **Neon**: Serverless PostgreSQL

### Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or run migrations (production)
npx prisma migrate deploy

# Seed initial data
npm run db:seed
```

### Database Optimization

Edit `postgresql.conf` for production:

```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB

# Connections
max_connections = 100

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
```

---

## Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/school-management-system.git
cd school-management-system

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database |

---

## Production Deployment

### Docker Deployment

#### 1. Build Docker Image

```bash
# Build image
docker build -t school-management-system:latest .

# Or using docker-compose
docker-compose build
```

#### 2. Docker Compose Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: school-management-system:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://school:password@db:5432/school_db
      - NEXTAUTH_URL=https://your-domain.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - db
      - redis
    networks:
      - school-network

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=school
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=school_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - school-network

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - school-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - app
    networks:
      - school-network

volumes:
  postgres_data:
  redis_data:

networks:
  school-network:
    driver: bridge
```

#### 3. Run with Docker Compose

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Run migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Vercel Deployment

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Deploy

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### 3. Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings > Environment Variables
2. Add all required variables from `.env.example`

#### 4. Database Setup

For Vercel deployment, use a managed PostgreSQL service:
- **Vercel Postgres** (recommended)
- **Supabase**
- **Neon**
- **PlanetScale**

#### 5. vercel.json Configuration

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://your-app.vercel.app"
  }
}
```

### VPS/Cloud Deployment

#### 1. Server Setup (Ubuntu)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/your-org/school-management-system.git
cd school-management-system

# Install dependencies
npm ci --production

# Build application
npm run build

# Setup environment
cp .env.example .env
nano .env  # Configure your environment variables

# Setup database
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

#### 3. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'school-management-system',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

#### 4. Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd
```

#### 5. Nginx Configuration

Create `/etc/nginx/sites-available/school-management-system`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle large file uploads
    client_max_body_size 50M;
}
```

Enable the site:

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/school-management-system /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## SSL Configuration

### Using Let's Encrypt (Certbot)

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already configured by certbot)
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### Manual SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ... rest of configuration
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Logging

### Application Monitoring

#### PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# View process info
pm2 show school-management-system
```

#### PM2 Plus (Optional)

```bash
# Link to PM2 Plus
pm2 link <secret_key> <public_key>
```

### Log Management

#### Application Logs

```bash
# PM2 logs location
~/.pm2/logs/

# View error logs
pm2 logs school-management-system --err

# View output logs
pm2 logs school-management-system --out
```

#### Log Rotation

Create `/etc/logrotate.d/pm2-school`:

```
/home/user/.pm2/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 user user
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Checks

Create a health check endpoint at `/api/health`:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Database connection failed',
    }, { status: 503 });
  }
}
```

### Uptime Monitoring

Use external services:
- **UptimeRobot** (free tier available)
- **Pingdom**
- **Better Uptime**
- **AWS CloudWatch**

---

## Backup Strategy

### Database Backup

#### Automated Backup Script

Create `/home/user/backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/user/backups"
DB_NAME="school_db"
DB_USER="school_user"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/postgres/

# Delete backups older than 30 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

#### Cron Job

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/user/backup.sh >> /home/user/backup.log 2>&1
```

### File Storage Backup

For AWS S3, enable versioning and cross-region replication:

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket your-bucket-name \
  --versioning-configuration Status=Enabled

# Setup replication (requires two buckets)
aws s3api put-bucket-replication \
  --bucket source-bucket \
  --replication-configuration file://replication.json
```

---

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
pm2 logs school-management-system

# Check port availability
sudo lsof -i :3000

# Check environment variables
pm2 env 0
```

#### Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U school_user -d school_db -h localhost

# Check connection string
echo $DATABASE_URL
```

#### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### Memory Issues

```bash
# Check memory usage
free -h

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Or in PM2 ecosystem
env: {
  NODE_OPTIONS: "--max-old-space-size=4096"
}
```

### Performance Optimization

#### Database Optimization

```sql
-- Analyze tables
ANALYZE;

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Create indexes for frequently queried columns
CREATE INDEX idx_students_section ON students(sectionId);
CREATE INDEX idx_attendance_date ON student_attendance(date);
```

#### Application Optimization

1. **Enable Redis caching** for session and data caching
2. **Use CDN** for static assets
3. **Enable compression** in Nginx:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

### Rollback Procedure

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart school-management-system

# Or rollback database
pg_restore -U school_user -d school_db backup_file.sql
```

---

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables properly configured
- [ ] Database credentials secured
- [ ] Firewall configured (UFW or cloud firewall)
- [ ] Regular security updates applied
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Session management configured
- [ ] Password hashing (bcrypt)
- [ ] Two-factor authentication available
- [ ] Audit logging enabled
- [ ] Regular backups configured
- [ ] Monitoring and alerts setup

---

## Document Version

- **Version**: 1.0.0
- **Last Updated**: March 2026
- **Author**: School Management System Team