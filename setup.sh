#!/bin/bash

# Modern Blog System - One-Command Setup Script
# This script automates the complete setup process for development and production

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Modern Blog System"
NODE_VERSION="20.19.4"
REQUIRED_NODE_MAJOR=20
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s=' {1..50})${NC}"
}

# Check if running as root (not recommended for development)
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. This is not recommended for development."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check operating system
check_os() {
    log_info "Detecting operating system..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        PACKAGE_MANAGER="apt"
        if command -v yum &> /dev/null; then
            PACKAGE_MANAGER="yum"
        elif command -v dnf &> /dev/null; then
            PACKAGE_MANAGER="dnf"
        elif command -v pacman &> /dev/null; then
            PACKAGE_MANAGER="pacman"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        PACKAGE_MANAGER="brew"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    log_success "Detected $OS with $PACKAGE_MANAGER package manager"
}

# Install system dependencies
install_dependencies() {
    log_header "Installing System Dependencies"

    if [[ "$OS" == "linux" ]]; then
        log_info "Updating package lists..."
        if [[ "$PACKAGE_MANAGER" == "apt" ]]; then
            sudo apt update
            sudo apt install -y curl wget git build-essential python3 python3-dev sqlite3
        elif [[ "$PACKAGE_MANAGER" == "yum" ]]; then
            sudo yum update -y
            sudo yum install -y curl wget git gcc gcc-c++ make python3 python3-devel sqlite sqlite-devel
        elif [[ "$PACKAGE_MANAGER" == "dnf" ]]; then
            sudo dnf update -y
            sudo dnf install -y curl wget git gcc gcc-c++ make python3 python3-devel sqlite sqlite-devel
        elif [[ "$PACKAGE_MANAGER" == "pacman" ]]; then
            sudo pacman -Syu --noconfirm curl wget git base-devel python sqlite
        fi
    elif [[ "$OS" == "macos" ]]; then
        if ! command -v brew &> /dev/null; then
            log_info "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install curl wget git python sqlite
    fi

    log_success "System dependencies installed"
}

# Setup Node.js with nvm
setup_nodejs() {
    log_header "Setting up Node.js $NODE_VERSION"

    # Check if Node.js is already installed and version is correct
    if command -v node &> /dev/null; then
        CURRENT_NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
        if [[ "$CURRENT_NODE_VERSION" -eq "$REQUIRED_NODE_MAJOR" ]]; then
            log_success "Node.js $REQUIRED_NODE_MAJOR.x is already installed"
            return
        fi
    fi

    # Install nvm if not present
    if ! command -v nvm &> /dev/null; then
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

        # Source nvm in current session
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    else
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Install and use specified Node.js version
    log_info "Installing Node.js $NODE_VERSION..."
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION

    # Add nvm to shell profile if not already there
    SHELL_PROFILE=""
    if [[ -n "$ZSH_VERSION" ]]; then
        SHELL_PROFILE="$HOME/.zshrc"
    elif [[ -n "$BASH_VERSION" ]]; then
        SHELL_PROFILE="$HOME/.bashrc"
    fi

    if [[ -n "$SHELL_PROFILE" ]] && ! grep -q "NVM_DIR" "$SHELL_PROFILE"; then
        echo -e "\n# NVM Setup\nexport NVM_DIR=\"\$HOME/.nvm\"\n[ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\"\n[ -s \"\$NVM_DIR/bash_completion\" ] && \\. \"\$NVM_DIR/bash_completion\"" >> "$SHELL_PROFILE"
        log_info "Added nvm to $SHELL_PROFILE"
    fi

    log_success "Node.js $NODE_VERSION installed and set as default"
}

# Setup admin credentials interactively
setup_admin_credentials() {
    log_header "Setting up Admin Credentials"

    echo
    echo -e "${CYAN}Admin Account Configuration${NC}"
    echo -e "${YELLOW}This account will have full access to the blog admin panel.${NC}"
    echo

    # Get admin username
    while true; do
        read -p "Enter admin username (default: admin): " ADMIN_USER_INPUT
        ADMIN_USER_INPUT=${ADMIN_USER_INPUT:-admin}

        # Basic validation - no spaces, reasonable length
        if [[ ${#ADMIN_USER_INPUT} -lt 3 ]] || [[ ${#ADMIN_USER_INPUT} -gt 50 ]]; then
            log_error "Username must be between 3-50 characters"
            continue
        fi

        if [[ $ADMIN_USER_INPUT =~ [[:space:]] ]]; then
            log_error "Username cannot contain spaces"
            continue
        fi

        break
    done

    # Get admin password
    while true; do
        echo -n "Enter admin password (min 8 characters): "
        read -s ADMIN_PASS_INPUT
        echo

        if [[ ${#ADMIN_PASS_INPUT} -lt 8 ]]; then
            log_error "Password must be at least 8 characters long"
            continue
        fi

        echo -n "Confirm admin password: "
        read -s ADMIN_PASS_CONFIRM
        echo

        if [[ "$ADMIN_PASS_INPUT" != "$ADMIN_PASS_CONFIRM" ]]; then
            log_error "Passwords do not match. Please try again."
            continue
        fi

        break
    done

    # Store credentials for use in create_env_file
    ADMIN_USER="$ADMIN_USER_INPUT"
    ADMIN_PASS="$ADMIN_PASS_INPUT"

    log_success "Admin credentials configured"
    log_info "Username: $ADMIN_USER"
    log_info "Password: [HIDDEN]"
    echo
}

# Create environment file
create_env_file() {
    log_header "Creating Environment Configuration"

    ENV_FILE="$SCRIPT_DIR/.env"

    if [[ -f "$ENV_FILE" ]]; then
        log_warning ".env file already exists. Backing up..."
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # Generate secure JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

    # Use admin credentials from setup_admin_credentials function
    FINAL_ADMIN_USER=${ADMIN_USER:-admin}
    FINAL_ADMIN_PASS=${ADMIN_PASS:-change-this-password-immediately}

    # Create .env file
    cat > "$ENV_FILE" << EOF
# Modern Blog System Environment Configuration
# Generated on $(date)

# Server Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Security
JWT_SECRET=$JWT_SECRET
HCAPTCHA_SECRET=your-hcaptcha-secret-here
HCAPTCHA_SITE_KEY=your-hcaptcha-site-key-here

# Admin Credentials
ADMIN_USER=$FINAL_ADMIN_USER
ADMIN_PASS=$FINAL_ADMIN_PASS

# Email Configuration (for notifications and subscriptions)
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@example.com

# Database Configuration
DB_PATH=./database/blog_system.db

# Session Configuration
SESSION_TIMEOUT=1800000
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Development Settings
LOG_LEVEL=info
DEBUG=true
EOF

    log_success "Environment file created at $ENV_FILE"
    if [[ "$FINAL_ADMIN_PASS" == "change-this-password-immediately" ]]; then
        log_warning "IMPORTANT: Update ADMIN_PASS and email credentials before production use!"
    else
        log_info "Admin credentials have been set securely"
    fi
    log_info "JWT_SECRET has been securely generated"
}

# Install project dependencies
install_project_deps() {
    log_header "Installing Project Dependencies"

    cd "$SCRIPT_DIR"

    # Ensure we're using the correct Node.js version
    if command -v nvm &> /dev/null; then
        nvm use $NODE_VERSION
    fi

    log_info "Installing npm dependencies..."
    npm install

    log_info "Rebuilding native modules..."
    npm run rebuild-native || log_warning "Native rebuild failed, but continuing..."

    log_success "Project dependencies installed"
}

# Initialize database
initialize_database() {
    log_header "Initializing Database"

    cd "$SCRIPT_DIR"

    # Ensure we're using the correct Node.js version
    if command -v nvm &> /dev/null; then
        nvm use $NODE_VERSION
    fi

    log_info "Setting up database..."
    npm run init-db

    log_success "Database initialized"
}

# Setup production configuration
setup_production() {
    log_header "Setting up Production Configuration"

    # Create logs directory
    mkdir -p "$SCRIPT_DIR/logs"

    # Create systemd service file if on Linux
    if [[ "$OS" == "linux" ]]; then
        create_systemd_service
    fi

    # Update .env for production
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
        sed -i.bak 's/NODE_ENV=development/NODE_ENV=production/' "$SCRIPT_DIR/.env"
        sed -i.bak 's/BASE_URL=.*/BASE_URL=https:\/\/your-domain.com/' "$SCRIPT_DIR/.env"
        log_info "Updated .env for production use"
        log_warning "Remember to:"
        echo "  1. Set correct BASE_URL"
        echo "  2. Configure real hCaptcha keys"
        echo "  3. Set strong ADMIN_PASS"
        echo "  4. Configure email settings"
    fi

    log_success "Production configuration setup complete"
}

# Create systemd service file
create_systemd_service() {
    log_info "Creating systemd service file..."

    SERVICE_FILE="/etc/systemd/system/modern-blog.service"

    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Modern Blog System
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/start.sh
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PATH=$HOME/.nvm/versions/node/v$NODE_VERSION/bin:$PATH

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    log_success "Systemd service created at $SERVICE_FILE"
    log_info "To enable: sudo systemctl enable modern-blog"
    log_info "To start: sudo systemctl start modern-blog"
}

# Create startup script
create_startup_script() {
    log_info "Creating startup script..."

    START_SCRIPT="$SCRIPT_DIR/start.sh"

    cat > "$START_SCRIPT" << 'EOF'
#!/bin/bash
# Modern Blog System Startup Script

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use correct Node.js version
nvm use 20.19.4

# Start the application
cd "$(dirname "$0")"
npm start
EOF

    chmod +x "$START_SCRIPT"
    log_success "Startup script created at $START_SCRIPT"
}

# Main setup function
main() {
    log_header "Starting $PROJECT_NAME Setup"
    echo -e "${CYAN}This script will set up the complete $PROJECT_NAME environment${NC}"
    echo -e "${CYAN}Press Ctrl+C to cancel at any time${NC}"
    echo

    check_root
    check_os
    install_dependencies
    setup_nodejs

    # Setup admin credentials interactively unless skipped
    if [[ "${SKIP_ADMIN_SETUP:-false}" != "true" ]]; then
        setup_admin_credentials
    else
        log_info "Skipping interactive admin setup (--no-admin-prompt used)"
        log_warning "Using default admin credentials: admin / change-this-password-immediately"
        log_warning "Remember to change these in production!"
    fi

    create_env_file
    install_project_deps
    initialize_database
    create_startup_script

    log_header "Setup Complete!"
    log_success "Your $PROJECT_NAME is ready!"
    echo
    log_info "Next steps:"
    echo "  1. Start development server: npm run dev"
    echo "  2. Open browser: http://localhost:3000"
    if [[ "${SKIP_ADMIN_SETUP:-false}" != "true" ]]; then
        echo "  3. Login with your configured admin credentials"
    else
        echo "  3. Login with default admin credentials (change immediately!)"
        echo "     Username: admin"
        echo "     Password: change-this-password-immediately"
    fi
    echo
    log_info "For production deployment, run: $0 --production"
}

# Production setup function
production_setup() {
    log_header "Production Setup for VPS"
    echo -e "${CYAN}This will configure the system for production deployment${NC}"
    echo

    setup_production

    log_header "Production Setup Complete!"
    echo
    log_info "Production deployment checklist:"
    echo "  ✅ Environment configured for production"
    echo "  ✅ Database initialized"
    echo "  🔄 Next: Configure nginx reverse proxy"
    echo "  🔄 Next: Set up SSL certificates"
    echo "  🔄 Next: Configure firewall"
    echo "  🔄 Next: Enable systemd service"
    echo
    log_info "See VPS_DEPLOYMENT.md for detailed instructions"
}

# Parse command line arguments
case "${1:-}" in
    --production|--prod)
        production_setup
        ;;
    --no-admin-prompt)
        # Skip interactive admin setup, use defaults
        SKIP_ADMIN_SETUP=true
        main
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --production       Set up for production deployment"
        echo "  --no-admin-prompt  Skip interactive admin credential setup (use defaults)"
        echo "  --help            Show this help message"
        echo ""
        echo "Without options, runs complete development setup with admin credential prompts"
        ;;
    *)
        main
        ;;
esac
