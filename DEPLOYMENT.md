# Mamba Host Panel - Production Deployment Guide

This guide covers deploying Mamba Host Panel to production environments.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Docker Deployment](#docker-deployment)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] Production server(s) with Docker and Docker Compose installed
- [ ] Domain name configured with DNS pointing to your server
- [ ] SSL/TLS certificates (Let's Encrypt recommended)
- [ ] PostgreSQL 16 database (managed or self-hosted)
- [ ] Redis 7 instance (managed or self-hosted)
- [ ] S3-compatible storage (AWS S3, MinIO, or similar)
- [ ] Stripe account (for billing)
- [ ] Email service (SMTP, Resend, SendGrid, or similar)
- [ ] Secure secrets generated for all environment variables
- [ ] Backup strategy in place

---

## Infrastructure Requirements

### Minimum Requirements (Small Deployment)

**Control Panel Server**:
- 2 CPU cores
- 4 GB RAM
- 40 GB SSD storage
- Ubuntu 22.04 LTS or similar
- Docker 24+ and Docker Compose v2

**Database Server** (if self-hosted):
- 2 CPU cores
- 4 GB RAM
- 20 GB SSD storage

**Wings Node** (per game server node):
- 4+ CPU cores
- 8+ GB RAM
- 100+ GB SSD storage
- Docker 24+

### Recommended Requirements (Medium Deployment)

**Control Panel Server**:
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD storage

**Database Server**:
- 4 CPU cores
- 8 GB RAM
- 50 GB SSD storage with automated backups

**Wings Nodes**:
- 8+ CPU cores
- 16+ GB RAM
- 500+ GB NVMe storage

---

## Environment Configuration

### 1. Generate Secure Secrets

```bash
# JWT Secret (32+ characters)
openssl rand -base64 32

# JWT Refresh Secret (different from JWT_SECRET)
openssl rand -base64 32

# NextAuth Secret
openssl rand -base64 32

# Encryption Key (32 bytes = 64 hex characters)
openssl rand -hex 32
```

### 2. Create Production .env File

```bash
# Copy example file
cp .env.example .env

# Edit with production values
nano .env
```

### 3. Critical Environment Variables

**IMPORTANT**: Update these for production:

```env
NODE_ENV=production
LOG_LEVEL=warn

# Database (use managed service recommended)
DATABASE_URL=postgresql://user:password@prod-db-host:5432/mambapanel

# Redis (use managed service recommended)
REDIS_URL=redis://prod-redis-host:6379

# JWT & Auth - Use your generated secrets
JWT_SECRET=your-generated-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret
NEXTAUTH_SECRET=your-generated-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# Encryption
ENCRYPTION_KEY=your-generated-encryption-key

# API URLs
API_URL=https://api.your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@your-domain.com
```

---

## Database Setup

### Option A: Managed Database (Recommended)

Use a managed PostgreSQL service:
- AWS RDS
- DigitalOcean Managed Databases
- Google Cloud SQL
- Azure Database for PostgreSQL

**Benefits**:
- Automated backups
- High availability
- Automatic updates
- Scaling

### Option B: Self-Hosted Database

If self-hosting, ensure:
- Regular automated backups (daily minimum)
- Replication for high availability
- Monitoring and alerting
- Security hardening (firewall, SSL only)

### Database Initialization

```bash
# 1. Run migrations
pnpm --filter @mambaPanel/db db:migrate

# 2. Seed initial data (optional for production)
# Only run this if you want demo data
# pnpm --filter @mambaPanel/db db:seed
```

---

## Docker Deployment

### 1. Clone Repository

```bash
git clone <repository-url>
cd mamba-host-panel
```

### 2. Build Production Images

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Or build individually
docker-compose -f docker-compose.prod.yml build web
docker-compose -f docker-compose.prod.yml build api
docker-compose -f docker-compose.prod.yml build wings
```

### 3. Start Services

```bash
# Start in detached mode
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 4. Verify Deployment

```bash
# Health check
curl https://api.your-domain.com/health

# Status page
curl https://your-domain.com/status
```

---

## Post-Deployment

### 1. SSL/TLS Configuration

**Using Nginx Reverse Proxy with Let's Encrypt**:

```nginx
# /etc/nginx/sites-available/mamba-host

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### 3. Create Admin User

```bash
# Connect to API container
docker exec -it mamba-api sh

# Run admin creation script (you'll need to implement this)
npm run create-admin
```

### 4. Configure Stripe Webhooks

1. Go to: https://dashboard.stripe.com/webhooks
2. Create new webhook endpoint
3. Set URL: `https://your-domain.com/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.finalized`
5. Copy webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 5. Configure Email Verification

Test email sending:

```bash
# Use your SMTP credentials in .env
# Send test email through the app
```

---

## Monitoring & Maintenance

### Health Checks

Set up external monitoring for:
- `https://your-domain.com/status` - Status page
- `https://api.your-domain.com/health` - API health

Recommended services:
- UptimeRobot (free)
- Pingdom
- StatusCake
- Better Uptime

### Log Monitoring

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Filter by service
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f api
```

### Database Backups

**Automated Backup Script** (`/usr/local/bin/backup-mamba.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mamba"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mambapanel"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U mamba $DB_NAME | gzip > $BACKUP_DIR/mamba_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "mamba_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/mamba_$DATE.sql.gz s3://your-bucket/backups/
```

**Cron Job**:
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-mamba.sh
```

### Updates & Maintenance

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Restart services with zero downtime (if configured)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build web

# Run database migrations
docker exec mamba-api pnpm --filter @mambaPanel/db db:migrate
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api
```

### Database Connection Issues

```bash
# Test database connection
docker exec mamba-api psql $DATABASE_URL

# Check database credentials in .env
cat .env | grep DATABASE_URL
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.prod.yml
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## Security Checklist

- [ ] All secrets are strong and unique
- [ ] Database is not publicly accessible
- [ ] Redis is not publicly accessible
- [ ] HTTPS is enforced (no HTTP)
- [ ] Security headers are configured
- [ ] Firewall is properly configured
- [ ] Regular backups are automated
- [ ] Monitoring and alerting are set up
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Environment variables are secured
- [ ] Docker containers run as non-root user
- [ ] Logs don't contain sensitive information
- [ ] 2FA is enabled for admin accounts
- [ ] Stripe is in production mode
- [ ] OAuth apps are in production mode

---

## Performance Optimization

### Database

- Enable connection pooling
- Add indexes to frequently queried columns
- Run `VACUUM ANALYZE` regularly
- Monitor slow queries

### Redis

- Configure eviction policy
- Monitor memory usage
- Use Redis persistence (AOF recommended)

### Application

- Enable Next.js static generation where possible
- Use CDN for static assets
- Enable Gzip/Brotli compression
- Configure caching headers
- Optimize images (use Next.js Image component)

### Docker

- Use multi-stage builds (already configured)
- Limit container resources
- Use Docker BuildKit caching
- Clean up unused images regularly

---

## Scaling

### Horizontal Scaling

**Load Balancer Setup** (Nginx or AWS ALB):

```nginx
upstream mamba_web {
    server web1:3000;
    server web2:3000;
    server web3:3000;
}

upstream mamba_api {
    server api1:3001;
    server api2:3001;
    server api3:3001;
}
```

### Database Scaling

- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Vertical scaling for write-heavy workloads

### Redis Scaling

- Redis Cluster for horizontal scaling
- Redis Sentinel for high availability

---

## Disaster Recovery

### Backup Strategy

1. **Database**: Daily full backups, hourly incremental
2. **File Storage**: Continuous replication to S3
3. **Configuration**: Git repository
4. **Secrets**: Secure vault (HashiCorp Vault, AWS Secrets Manager)

### Recovery Procedures

**Database Restoration**:
```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database
gunzip -c /var/backups/mamba/mamba_YYYYMMDD_HHMMSS.sql.gz | psql $DATABASE_URL

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Support

For deployment assistance:
- **Documentation**: Check README.md and TODO-ALPHA.md
- **Issues**: Open a GitHub issue
- **Email**: support@mambahost.com

---

## License

MIT License - See LICENSE file for details

---

Built with ❤️ by the Mamba Host Panel team
