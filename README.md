# Modern Blog System with Resume 
## Author: Wasiq Syed

A modern, secure, and privacy-focused personal website and blog platform. Features a crypto donation system, blog management, email subscriptions, and comprehensive deployment tooling.

---

## Features

### Core Functionality
- **Blog System**: Admin-authenticated blog creation, editing, and publishing
- **Personal Portfolio**: About, education, projects, skills, testimonials, and contact form
- **Crypto Donations**: Accepts XMR directly or any crypto via Trocador widget
- **Email Subscriptions**: Users can subscribe for blog updates
- **Anonymous Messaging**: Users can send anonymous feedback
- **SEO Optimized**: Sitemap, RSS, Open Graph, and structured data

### Security & Performance
- **JWT Authentication**: Secure token-based authentication with bcrypt hashing
- **Security Headers**: Content Security Policy, XSS protection, and rate limiting
- **Performance**: Gzip compression, caching, and optimized static file serving
- **Monitoring**: Comprehensive logging and health checks
- **Auto Backups**: Automated database backups with retention

### Developer Experience
- **One-Command Setup**: Automated installation and configuration
- **Production Ready**: Complete VPS deployment with SSL and monitoring
- **Developer Documentation**: Comprehensive guides and API documentation
- **Professional Services**: Paid setup and custom development services

---

## Project Structure

```
Modern-main/
├── server.js              # Main Express server (2,300+ lines)
├── package.json           # Dependencies and scripts with detailed comments
├── .env.example           # Environment variables template
├── setup.sh               # Automated setup script
├── nginx.conf             # Production Nginx configuration
├── ecosystem.config.js    # PM2 process manager configuration
├── modern-blog.service    # Systemd service file
├── database/              # SQLite database files
├── scripts/               # Utility scripts
│   ├── init-database.js   # Database setup with admin creation
│   ├── update-database.sh # Schema updates with backup
│   └── ...               # Other utilities
├── middleware/            # Express middleware
│   └── session.js         # Session management
├── utils/                 # Utility functions
│   └── sanitizer.js       # HTML/text sanitization
├── styles/                # CSS stylesheets
├── templates/             # HTML templates
└── *.html                 # Frontend pages
```

---

## Quick Start

### Automated Setup (Recommended)
```bash
# Clone the repository
git clone <your-repo-url>
cd Modern-main

# Run automated setup
chmod +x setup.sh
./setup.sh

# Start development server
npm run dev
```

### Manual Setup
```bash
# Install Node.js 20.x
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20.19.4
nvm use 20.19.4

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Initialize database
npm run init-db

# Start server
npm run dev
```

---

## Security Features & Best Practices

### Authentication & Authorization
- **JWT-based authentication** with secure token generation
- **Account lockout** after 5 failed login attempts (15-minute lockout)
- **Rate limiting** on authentication endpoints (5 requests/15 minutes)
- **Session management** with token blacklisting on logout
- **IP tracking** for suspicious activity detection

### Input Validation & Sanitization
- **HTML sanitization** using DOMPurify for all user content
- **Input validation** using express-validator
- **XSS protection** through Content Security Policy
- **SQL injection prevention** via parameterized queries

### Security Headers
- **Content Security Policy (CSP)** with strict directives
- **HTTP Strict Transport Security (HSTS)** for HTTPS enforcement
- **X-Frame-Options** to prevent clickjacking
- **X-Content-Type-Options** to prevent MIME sniffing
- **Referrer Policy** set to no-referrer

### Data Protection
- **Environment variables** for sensitive configuration
- **bcrypt password hashing** with salt rounds
- **CORS configuration** with whitelisted origins

### Critical Setup Requirements

#### 1. Environment Variables
Create a `.env` file with secure values:
```bash
# Generate a strong JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Set strong admin credentials
ADMIN_USER=your-admin-username
ADMIN_PASS=your-strong-password

# Configure email securely
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password

# Production settings
NODE_ENV=production
BASE_URL=https://yourdomain.com
```

#### 2. Database Security
- Ensure database file permissions are restricted (600)
- Regular backups with encryption
- Consider using PostgreSQL for production instead of SQLite

#### 3. Server Configuration
- Use HTTPS in production (Let's Encrypt recommended)
- Configure proper firewall rules
- Use a reverse proxy (nginx/Apache) with security headers
- Enable fail2ban for additional brute force protection

### Security Best Practices

#### For Developers
1. **Never commit sensitive data**
   - Use `.env` files for configuration
   - Add `.env*` to `.gitignore`
   - Use environment variables in CI/CD

2. **Input validation**
   - Validate all user inputs on both client and server
   - Use allow-lists rather than deny-lists
   - Sanitize HTML content before storage and display

3. **Error handling**
   - Don't expose sensitive information in error messages
   - Log security events for monitoring
   - Use generic error messages for authentication failures

4. **Dependencies**
   - Regularly update dependencies (`npm audit`)
   - Use exact versions in production
   - Monitor security advisories

#### For Deployment
1. **Server hardening**
   - Disable unnecessary services
   - Use non-root user for application
   - Set up proper file permissions
   - Configure log rotation

2. **Monitoring**
   - Set up intrusion detection
   - Monitor failed login attempts
   - Alert on suspicious patterns
   - Regular security scans

3. **Backup strategy**
   - Encrypted database backups
   - Secure backup storage
   - Test restore procedures
   - Document recovery process

### Vulnerability Assessment

#### Fixed Issues
- [x] Removed exposed credentials from repository
- [x] Implemented HTML sanitization to prevent XSS
- [x] Strengthened Content Security Policy
- [x] Added secure session management with token revocation
- [x] Enhanced input validation across all endpoints
- [x] Improved error handling to prevent information leakage

#### Remaining Considerations
- Consider implementing CSRF tokens for form submissions
- Add request signing for sensitive operations
- Implement progressive security measures (2FA, etc.)
- Consider using Redis for token blacklist in production
- Add automated security testing to CI/CD pipeline

### Security Checklist for Production
- [ ] Generate and set strong JWT_SECRET
- [ ] Change default admin credentials
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Set up proper firewall rules
- [ ] Enable security headers on reverse proxy
- [ ] Configure rate limiting at proxy level
- [ ] Set up monitoring and alerting
- [ ] Implement log aggregation and analysis
- [ ] Create incident response plan
- [ ] Schedule regular security updates
- [ ] Perform penetration testing
- [ ] Document security procedures

### Incident Response

#### If security breach is detected:
1. **Immediate actions**
   - Isolate affected systems
   - Preserve evidence
   - Assess scope of breach
   - Notify relevant stakeholders

2. **Investigation**
   - Analyze logs for entry point
   - Identify compromised data
   - Document timeline
   - Determine root cause

3. **Recovery**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Revoke affected tokens
   - Restore from clean backups if needed

4. **Post-incident**
   - Update security measures
   - Improve monitoring
   - Document lessons learned
   - Review and update procedures

### Security Contacts
- Security issues: security@yourdomain.com
- Vulnerability reports: Follow responsible disclosure
- Emergency contact: [Your emergency contact]

### Additional Security Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

## VPS Production Deployment

### Prerequisites
- **VPS Requirements**: Ubuntu 20.04+, 1GB RAM minimum, 5GB storage
- **Domain**: DNS A record pointing to your VPS IP
- **Access**: SSH access to your VPS

### Automated VPS Setup
```bash
# On your VPS
git clone <your-repo-url>
cd Modern-main
chmod +x setup.sh
./setup.sh --production
```

### Manual VPS Setup Steps

#### 1. Server Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git ufw fail2ban htop

# Create non-root user
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy
```

#### 2. Application Deployment
```bash
# Clone and setup
git clone <your-repo-url>
cd Modern-main

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with production values
nano .env
```

**Important Production Settings:**
```bash
NODE_ENV=production
BASE_URL=https://yourdomain.com
PORT=3000
TRUST_PROXY=true

# Generate secure JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Set strong admin credentials
ADMIN_USER=your-admin-username
ADMIN_PASS=your-super-secure-password

# Configure email settings
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### 3. Nginx Reverse Proxy Setup
```bash
# Install Nginx
sudo apt install -y nginx

# Copy configuration
sudo cp nginx.conf /etc/nginx/sites-available/modern-blog
sudo ln -s /etc/nginx/sites-available/modern-blog /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 4. SSL Certificate Setup (or use CloudFlare) 
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test certificate renewal
sudo certbot renew --dry-run
```

#### 5. Process Management with PM2
```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs
```

### Production Deployment Checklist
- [ ] Server provisioned with Ubuntu 20.04+
- [ ] Domain DNS configured
- [ ] SSH keys configured for deploy user
- [ ] Application code cloned
- [ ] Environment variables configured
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained
- [ ] PM2 process manager configured
- [ ] Database backup script created
- [ ] Firewall configured
- [ ] Log rotation configured
- [ ] Fail2ban configured
- [ ] Application accessible via HTTPS
- [ ] Admin login tested

---

## Professional Setup Services

**Need help with development or setup?** I'm available for professional services.

### Service Pricing:
- **Complete VPS Setup & Deployment**: 1 XMR
- **Custom Feature Development**: Based on complexity (starting at 0.5 XMR)
- **Security Audit & Hardening**: 0.5 XMR
- **Performance Optimization**: 0.3 XMR
- **Database Migration/Optimization**: 0.5 XMR
- **Maintenance & Support**: 0.2 XMR/month
- **AI used to make documentation 🥀**: 

### What I Offer:
- [x] **VPS Setup**: Complete server provisioning and configuration
- [x] **Domain & SSL**: DNS setup, SSL certificate installation
- [x] **Production Deployment**: Nginx, PM2, firewall, monitoring
- [x] **Custom Development**: New features, API endpoints, UI improvements
- [x] **Security Review**: Code audit, vulnerability assessment
- [x] **Performance Tuning**: Database optimization, caching, monitoring
- [x] **Maintenance**: Updates, backups, troubleshooting
- [x] **24/7 Support**: Emergency response and issue resolution

### Service Process:
1. **Contact**: Email me at [wasiq@wasiq.in](mailto:wasiq@wasiq.in)
2. **Requirements**: Describe your needs and specifications
3. **Quote**: I'll provide detailed pricing and timeline
4. **Payment**: Send XMR to my wallet address
5. **Delivery**: Complete implementation with documentation
6. **Support**: Post-delivery support and maintenance

### Important Notes:
- **No free setup**: All professional services require payment
- **Clear specifications**: Please provide detailed requirements
- **Iterative development**: I can modify functionality based on your feedback
- **Production-ready**: Clean, well-documented, secure code
- **Ongoing support**: Available for maintenance and updates

### Contact Information:
- **Email**: [wasiq@wasiq.in](mailto:wasiq@wasiq.in)
- **Telegram**: [@wasiqtg](https://t.me/wasiqtg)
- **Author**: Wasiq Syed
- **Payment**: Monero (XMR) preferred

---

## Support

### For Technical Issues:
1. Check this README first
2. Review server logs: `pm2 logs modern-blog`
3. Test in development environment
4. Check database integrity
5. Verify environment configuration

### Need Professional Help?
For complex issues or custom development, see the **Professional Setup Services** section above for paid support options.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

**Author**: Wasiq Syed
**Contact**: [wasiq@wasiq.in](mailto:wasiq@wasiq.in)

---

*Happy coding!*
