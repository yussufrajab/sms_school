#!/bin/bash

# =============================================================================
# School Management System - Application Manager
# =============================================================================
# Manages the Next.js frontend server (port 3000) and database connections
# =============================================================================

FRONTEND_PORT=3000
PRISMA_STUDIO_PORT=5555
APP_DIR="/home/yusuf/sms"
LOG_DIR="/tmp/sms"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# Database Configuration
DB_HOST="localhost"
DB_PORT=5432
DB_NAME="prizdb"
DB_USER="yusuf"
DB_PASS="esek"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

# =============================================================================
# PORT AND PROCESS MANAGEMENT
# =============================================================================

# Kill process using a specific port
kill_port() {
    local port=$1
    local service_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        log_warning "$service_name port $port is in use, killing existing process..."

        local pid=$(lsof -ti:$port)

        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null
            sleep 1

            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
                log_warning "Process still holding port, trying fuser..."
                fuser -k $port/tcp 2>/dev/null
                sleep 2
            fi

            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
                pid=$(lsof -ti:$port)
                if [ -n "$pid" ]; then
                    kill -9 $pid 2>/dev/null
                    sleep 1
                fi
            fi

            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
                log_error "Could not free port $port. Please check manually."
                return 1
            else
                log_success "Freed port $port"
            fi
        fi
    fi

    return 0
}

# Wait for port to be listening with timeout
wait_for_port() {
    local port=$1
    local service_name=$2
    local timeout=${3:-30}
    local interval=2
    local elapsed=0

    log_info "Waiting for $service_name to start on port $port..."

    while [ $elapsed -lt $timeout ]; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || \
           ss -tlnp 2>/dev/null | grep -q ":$port " || \
           netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            log_success "$service_name is ready on port $port"
            local pid=$(lsof -ti:$port 2>/dev/null | head -1)
            if [ -n "$pid" ]; then
                echo -e "${GREEN}${service_name} PID: $pid${NC}"
            else
                echo -e "${GREEN}${service_name} is running${NC}"
            fi
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        if [ $((elapsed % 4)) -eq 0 ]; then
            echo -ne "${YELLOW}...\033[0K\r${NC}"
        fi
    done

    echo ""
    log_error "$service_name failed to start within ${timeout}s. Check logs for details."
    return 1
}

# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================

check_database() {
    log_info "Checking database connection..."
    if psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Cannot connect to database at $DB_HOST:$DB_PORT/$DB_NAME"
        return 1
    fi
}

is_database_running() {
    pgrep -f "postgres" >/dev/null 2>&1
}

# =============================================================================
# FRONTEND FUNCTIONS (Next.js)
# =============================================================================

# Returns 0 if a TCP LISTEN socket exists on the port
_port_is_listening() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 && return 0
    ss -tlnp 2>/dev/null | grep -qE ":${port}[[:space:]]" && return 0
    netstat -tlnp 2>/dev/null | grep -qE ":${port}[[:space:]]" && return 0
    return 1
}

# Returns 0 if an HTTP GET returns any response
_http_responds() {
    local port=$1
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                     --max-time 3 --connect-timeout 2 \
                     "http://localhost:$port/" 2>/dev/null)
    [ "$http_code" != "000" ] && [ -n "$http_code" ]
}

# Get the PID of the node process on the frontend port
_frontend_pid() {
    local pid
    pid=$(lsof -ti:$FRONTEND_PORT 2>/dev/null | head -1)
    [ -n "$pid" ] && echo "$pid" && return
    pid=$(ss -tlnp 2>/dev/null | grep ":${FRONTEND_PORT}[[:space:]]" | grep -oP 'pid=\K[0-9]+' | head -1)
    echo "$pid"
}

# Check if Next.js process is alive
_nextjs_process_alive() {
    pgrep -f "$APP_DIR" >/dev/null 2>&1 && return 0
    pgrep -f "next-server"  >/dev/null 2>&1 && return 0
    pgrep -f "next dev"     >/dev/null 2>&1 && return 0
    pgrep -f "node.*3000"   >/dev/null 2>&1 && return 0
    return 1
}

# Parse frontend log for status markers
_parse_frontend_log() {
    FRONTEND_LOG_STATE="unknown"
    [ -f "$FRONTEND_LOG" ] || return

    local tail_lines
    tail_lines=$(tail -30 "$FRONTEND_LOG" 2>/dev/null)

    if echo "$tail_lines" | grep -qiE "ready (started server|on http)|✓ ready|compiled|compiled successfully"; then
        FRONTEND_LOG_STATE="ready"
        return
    fi

    if echo "$tail_lines" | grep -qiE "compiling|Building|wait.*compiling|initializing"; then
        FRONTEND_LOG_STATE="compiling"
        return
    fi

    if echo "$tail_lines" | grep -qiE "Error:|SyntaxError:|Cannot find module|EADDRINUSE|Failed to compile|Critical"; then
        FRONTEND_LOG_STATE="error"
        return
    fi
}

# Get frontend status: running, starting, crashed, stopped
get_frontend_status() {
    local port_open=false
    local http_ok=false
    local proc_alive=false

    _port_is_listening $FRONTEND_PORT && port_open=true
    _nextjs_process_alive             && proc_alive=true
    _parse_frontend_log

    if $port_open; then
        _http_responds $FRONTEND_PORT && http_ok=true
    fi

    if $port_open && $http_ok; then
        echo "running"; return 0
    fi

    if $port_open && ! $http_ok; then
        echo "starting"; return 1
    fi

    if ! $port_open && $proc_alive; then
        echo "starting"; return 1
    fi

    if ! $port_open && ! $proc_alive; then
        if [ "$FRONTEND_LOG_STATE" = "error" ]; then
            echo "crashed"; return 2
        fi
        echo "stopped"; return 3
    fi

    echo "stopped"; return 3
}

# Stop frontend server
stop_frontend() {
    log_info "Stopping frontend server..."
    kill_port $FRONTEND_PORT "Frontend"
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "node.*next" 2>/dev/null
    pkill -9 -f "node.*3000" 2>/dev/null
    sleep 2

    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        local pid=$(lsof -ti:$FRONTEND_PORT)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null
            fuser -k $FRONTEND_PORT/tcp 2>/dev/null
            sleep 1
        fi
    fi

    log_success "Frontend server stopped"
}

# Start frontend server
start_frontend() {
    log_info "Starting frontend server on port $FRONTEND_PORT..."

    # Clean up any existing processes
    log_warning "Cleaning up any existing Next.js processes..."
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "node.*next" 2>/dev/null
    pkill -9 -f "node.*3000" 2>/dev/null
    sleep 2

    kill_port $FRONTEND_PORT "Frontend"

    if [ $? -ne 0 ]; then
        log_error "Could not free frontend port"
        return 1
    fi

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Start Next.js
    cd "$APP_DIR"
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &

    wait_for_port $FRONTEND_PORT "Frontend" 45
    return $?
}

# Restart frontend
restart_frontend() {
    log_info "Restarting frontend server..."
    stop_frontend
    sleep 1
    start_frontend
}

# =============================================================================
# PRISMA STUDIO FUNCTIONS
# =============================================================================

is_prisma_studio_running() {
    _port_is_listening $PRISMA_STUDIO_PORT
}

start_prisma_studio() {
    log_info "Starting Prisma Studio on port $PRISMA_STUDIO_PORT..."

    kill_port $PRISMA_STUDIO_PORT "Prisma Studio"

    cd "$APP_DIR"
    nohup npm run db:studio > "$LOG_DIR/prisma-studio.log" 2>&1 &

    wait_for_port $PRISMA_STUDIO_PORT "Prisma Studio" 30
    return $?
}

stop_prisma_studio() {
    log_info "Stopping Prisma Studio..."
    kill_port $PRISMA_STUDIO_PORT "Prisma Studio"
    pkill -f "prisma.*studio" 2>/dev/null
    log_success "Prisma Studio stopped"
}

# =============================================================================
# SERVICE STATUS CHECKS
# =============================================================================

# Check if frontend is running
is_frontend_running() {
    local status=$(get_frontend_status)
    [ "$status" = "running" ]
}

# Check status of all services
check_status() {
    echo ""
    log_header "SMS Service Status"
    echo ""

    # Database
    if is_database_running; then
        echo -e "${GREEN}●${NC} PostgreSQL Database - ${GREEN}Running${NC}"
        echo -e "   ${BLUE}→ Connection: $DB_HOST:$DB_PORT/$DB_NAME (user: $DB_USER)${NC}"
    else
        echo -e "${RED}●${NC} PostgreSQL Database - ${RED}Stopped${NC}"
        echo -e "   ${YELLOW}→ Start PostgreSQL service first${NC}"
    fi

    echo ""

    # Frontend
    local fe_status=$(get_frontend_status)

    case "$fe_status" in
        running)
            local fe_pid=$(_frontend_pid)
            if [ -n "$fe_pid" ]; then
                echo -e "${GREEN}●${NC} Frontend (port $FRONTEND_PORT) - ${GREEN}Running${NC} (PID: $fe_pid)"
            else
                echo -e "${GREEN}●${NC} Frontend (port $FRONTEND_PORT) - ${GREEN}Running${NC}"
            fi
            echo -e "   ${BLUE}→ Access: http://localhost:$FRONTEND_PORT${NC}"
            ;;
        starting)
            local fe_pid=$(_frontend_pid)
            if [ -n "$fe_pid" ]; then
                echo -e "${YELLOW}●${NC} Frontend (port $FRONTEND_PORT) - ${YELLOW}Starting / Compiling${NC} (PID: $fe_pid)"
            else
                echo -e "${YELLOW}●${NC} Frontend (port $FRONTEND_PORT) - ${YELLOW}Starting / Compiling${NC}"
            fi
            echo -e "   ${YELLOW}→ Log state: ${FRONTEND_LOG_STATE}. Run './manage.sh logs frontend' to monitor.${NC}"
            ;;
        crashed)
            echo -e "${RED}●${NC} Frontend (port $FRONTEND_PORT) - ${RED}Crashed${NC}"
            echo -e "   ${RED}→ Errors detected in $FRONTEND_LOG. Run './manage.sh logs frontend' to inspect.${NC}"
            ;;
        stopped)
            echo -e "${RED}●${NC} Frontend (port $FRONTEND_PORT) - ${RED}Stopped${NC}"
            ;;
    esac

    echo ""

    # Prisma Studio
    if is_prisma_studio_running; then
        local ps_pid=$(lsof -ti:$PRISMA_STUDIO_PORT 2>/dev/null | head -1)
        if [ -n "$ps_pid" ]; then
            echo -e "${GREEN}●${NC} Prisma Studio (port $PRISMA_STUDIO_PORT) - ${GREEN}Running${NC} (PID: $ps_pid)"
        else
            echo -e "${GREEN}●${NC} Prisma Studio (port $PRISMA_STUDIO_PORT) - ${GREEN}Running${NC}"
        fi
        echo -e "   ${BLUE}→ Access: http://localhost:$PRISMA_STUDIO_PORT${NC}"
    else
        echo -e "${RED}●${NC} Prisma Studio (port $PRISMA_STUDIO_PORT) - ${RED}Stopped${NC}"
    fi

    echo ""
}

# =============================================================================
# LOG FUNCTIONS
# =============================================================================

# Show logs (static)
show_logs() {
    local service=$1

    case $service in
        frontend)
            log_info "Frontend logs (last 50 lines):"
            echo ""
            tail -50 "$FRONTEND_LOG" 2>/dev/null || log_error "No frontend log file found"
            ;;
        prisma-studio|studio)
            log_info "Prisma Studio logs (last 50 lines):"
            echo ""
            tail -50 "$LOG_DIR/prisma-studio.log" 2>/dev/null || log_error "No Prisma Studio log file found"
            ;;
        all|"")
            log_info "=== Frontend logs (last 30 lines) ==="
            echo ""
            tail -30 "$FRONTEND_LOG" 2>/dev/null || log_error "No frontend log file found"
            echo ""
            log_info "=== Prisma Studio logs (last 30 lines) ==="
            echo ""
            tail -30 "$LOG_DIR/prisma-studio.log" 2>/dev/null || log_error "No Prisma Studio log file found"
            ;;
        *)
            log_error "Unknown service: $service"
            ;;
    esac
}

# Tail logs in real-time
tail_logs() {
    local service=$1

    case $service in
        frontend)
            log_info "Tailing frontend logs (Ctrl+C to stop)..."
            tail -f "$FRONTEND_LOG" 2>/dev/null || log_error "No frontend log file found"
            ;;
        prisma-studio|studio)
            log_info "Tailing Prisma Studio logs (Ctrl+C to stop)..."
            tail -f "$LOG_DIR/prisma-studio.log" 2>/dev/null || log_error "No Prisma Studio log file found"
            ;;
        all|"")
            log_info "Tailing all logs (Ctrl+C to stop)..."
            tail -f "$FRONTEND_LOG" "$LOG_DIR/prisma-studio.log" 2>/dev/null || log_error "No log files found"
            ;;
        *)
            log_error "Unknown service: $service"
            ;;
    esac
}

# =============================================================================
# DATABASE MANAGEMENT FUNCTIONS
# =============================================================================

db_seed() {
    log_info "Seeding database with test data..."
    cd "$APP_DIR"
    npm run db:seed
    log_success "Database seeded successfully"
}

db_migrate() {
    log_info "Running database migrations..."
    cd "$APP_DIR"
    npm run db:migrate
    log_success "Migrations completed"
}

db_generate() {
    log_info "Generating Prisma client..."
    cd "$APP_DIR"
    npm run db:generate
    log_success "Prisma client generated"
}

db_reset() {
    log_warning "WARNING: This will delete ALL data from the database!"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        log_info "Resetting database schema..."
        cd "$APP_DIR"
        npm run db:push -- --force-reset
        log_success "Database reset completed"
        log_info "Run './manage.sh db-seed' to populate with test data"
    else
        log_info "Operation cancelled"
    fi
}

db_studio() {
    if is_prisma_studio_running; then
        log_info "Prisma Studio is already running on port $PRISMA_STUDIO_PORT"
        echo -e "${BLUE}→ Access: http://localhost:$PRISMA_STUDIO_PORT${NC}"
    else
        start_prisma_studio
    fi
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

show_users() {
    echo ""
    log_header "Test User Credentials"
    echo ""
    echo -e "All test users have the password: ${GREEN}Test@123456${NC}"
    echo ""
    echo "┌────────────────────┬──────────────────────────────┬─────────────────┐"
    echo "│ Role               │ Email                        │ Password        │"
    echo "├────────────────────┼──────────────────────────────┼─────────────────┤"
    printf "│ %-18s │ %-28s │ %-15s │\n" "SUPER_ADMIN" "superadmin@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "SCHOOL_ADMIN" "admin@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "IT_ADMIN" "itadmin@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "TEACHER" "teacher1@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "STUDENT" "student1@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "PARENT" "parent1@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "ACCOUNTANT" "accountant@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "LIBRARIAN" "librarian@baraka.sc.tz" "Test@123456"
    printf "│ %-18s │ %-28s │ %-15s │\n" "RECEPTIONIST" "receptionist@baraka.sc.tz" "Test@123456"
    echo "└────────────────────┴──────────────────────────────┴─────────────────┘"
    echo ""
    echo -e "${BLUE}→ Login at: http://localhost:$FRONTEND_PORT/login${NC}"
    echo ""
}

clean_build() {
    log_info "Cleaning build artifacts..."
    rm -rf "$APP_DIR/node_modules/.cache"
    rm -rf "$APP_DIR/.next"
    rm -rf "$APP_DIR/.prisma"
    log_success "Clean completed"
    log_info "Run './manage.sh install' and './manage.sh db-generate' to rebuild"
}

install_deps() {
    log_info "Installing dependencies..."
    cd "$APP_DIR"
    npm install
    log_success "Dependencies installed"
}

build_app() {
    log_info "Building application for production..."
    cd "$APP_DIR"
    npm run build
    log_success "Build completed"
}

# =============================================================================
# START/STOP ALL SERVICES
# =============================================================================

start_all() {
    log_info "Starting all services..."
    echo ""

    local db_result=0
    local frontend_result=0

    # Check database
    if ! is_database_running; then
        log_warning "PostgreSQL is not running. Please start it first."
        db_result=1
    else
        log_success "Database is running"
    fi

    # Start frontend
    start_frontend
    frontend_result=$?

    echo ""
    echo "================================"
    echo "        Start Summary"
    echo "================================"
    if [ $db_result -eq 0 ]; then
        echo -e "${GREEN}✓ Database${NC} - Running ($DB_HOST:$DB_PORT/$DB_NAME)"
    else
        echo -e "${YELLOW}! Database${NC} - Not running (start PostgreSQL first)"
    fi
    if [ $frontend_result -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend${NC} - Running on port $FRONTEND_PORT"
    else
        echo -e "${RED}✗ Frontend${NC} - Failed to start"
    fi
    echo "================================"
    echo ""

    if [ $frontend_result -eq 0 ]; then
        log_success "Services started successfully"
        echo -e "${BLUE}→ Access the application at: http://localhost:$FRONTEND_PORT${NC}"
    else
        log_error "Some services failed to start"
    fi
}

stop_all() {
    log_info "Stopping all services..."
    stop_frontend
    stop_prisma_studio
    log_success "All services stopped"
}

restart_all() {
    log_info "Restarting all services..."
    stop_all
    sleep 2
    start_all
}

# =============================================================================
# HELP AND MENU
# =============================================================================

show_help() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     School Management System - Management CLI            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Usage: ./manage.sh <command> [service]"
    echo ""
    echo "Service Management:"
    echo "  start [service]     Start service (frontend, prisma-studio, or all)"
    echo "  stop [service]      Stop service (frontend, prisma-studio, or all)"
    echo "  restart [service]   Restart service (frontend, prisma-studio, or all)"
    echo ""
    echo "Database Management:"
    echo "  db-seed             Seed database with test data"
    echo "  db-migrate          Run database migrations"
    echo "  db-generate         Generate Prisma client"
    echo "  db-reset            Reset database (deletes all data)"
    echo "  db-studio           Open Prisma Studio (database GUI)"
    echo ""
    echo "Monitoring:"
    echo "  status              Check status of all services"
    echo "  logs [service]      View logs (frontend, prisma-studio, or all)"
    echo "  tail-logs [service] Tail logs in real-time"
    echo ""
    echo "Utilities:"
    echo "  users               Show test user credentials"
    echo "  install             Install npm dependencies"
    echo "  build               Build for production"
    echo "  clean               Clean build artifacts"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./manage.sh              # Open interactive menu"
    echo "  ./manage.sh start        # Start all services"
    echo "  ./manage.sh start frontend   # Start only frontend"
    echo "  ./manage.sh stop         # Stop all services"
    echo "  ./manage.sh status       # Check all services status"
    echo "  ./manage.sh db-seed      # Seed database"
    echo "  ./manage.sh users        # View login credentials"
    echo ""
    echo "Run without arguments for interactive menu"
    echo ""
}

show_menu() {
    echo ""
    echo "================================"
    echo "  SMS Service Manager"
    echo "================================"
    echo ""
    echo "  Database: $DB_NAME (user: $DB_USER)"
    echo "  Frontend Port: $FRONTEND_PORT"
    echo ""
    echo "  ─── Start/Stop ────────────────────────────"
    echo "  1)  Start all services"
    echo "  2)  Start frontend only"
    echo "  3)  Start Prisma Studio"
    echo "  4)  Stop all services"
    echo "  5)  Stop frontend only"
    echo "  6)  Stop Prisma Studio"
    echo ""
    echo "  ─── Restart ───────────────────────────────"
    echo "  7)  Restart all services"
    echo "  8)  Restart frontend only"
    echo "  9)  Restart Prisma Studio"
    echo ""
    echo "  ─── Database Management ───────────────────"
    echo "  10) Seed database (test data)"
    echo "  11) Run migrations"
    echo "  12) Generate Prisma client"
    echo "  13) Reset database"
    echo "  14) Open Prisma Studio"
    echo ""
    echo "  ─── Monitor ───────────────────────────────"
    echo "  15) Check status"
    echo "  16) View frontend logs (last 50 lines)"
    echo "  17) View Prisma Studio logs"
    echo "  18) View all logs"
    echo "  19) Tail frontend logs (real-time)"
    echo "  20) Tail Prisma Studio logs (real-time)"
    echo "  21) Tail all logs (real-time)"
    echo ""
    echo "  ─── Utilities ─────────────────────────────"
    echo "  22) Show user credentials"
    echo "  23) Install dependencies"
    echo "  24) Build for production"
    echo "  25) Clean build artifacts"
    echo ""
    echo "  0)  Exit"
    echo "================================"
}

# Interactive menu loop
run_interactive() {
    while true; do
        show_menu
        echo -n "Enter your choice [0-25]: "
        read -r choice

        case $choice in
            1)  start_all ;;
            2)  start_frontend ;;
            3)  start_prisma_studio ;;
            4)  stop_all ;;
            5)  stop_frontend ;;
            6)  stop_prisma_studio ;;
            7)  restart_all ;;
            8)  restart_frontend ;;
            9)  restart_prisma_studio 2>/dev/null || { stop_prisma_studio; start_prisma_studio; } ;;
            10) db_seed ;;
            11) db_migrate ;;
            12) db_generate ;;
            13) db_reset ;;
            14) db_studio ;;
            15) check_status ;;
            16) show_logs frontend ;;
            17) show_logs prisma-studio ;;
            18) show_logs all ;;
            19) tail_logs frontend ;;
            20) tail_logs prisma-studio ;;
            21) tail_logs all ;;
            22) show_users ;;
            23) install_deps ;;
            24) build_app ;;
            25) clean_build ;;
            0)
                log_info "Exiting..."
                exit 0
                ;;
            *)
                log_error "Invalid option. Please enter a number between 0 and 25."
                ;;
        esac

        # Don't pause for tail commands (they block anyway)
        case $choice in
            19|20|21) ;;
            *)
                echo ""
                echo -n "Press Enter to continue..."
                read -r
                ;;
        esac
    done
}

# =============================================================================
# MAIN COMMAND HANDLER
# =============================================================================

case "${1:-}" in
    start)
        case "${2:-all}" in
            frontend)       start_frontend ;;
            prisma-studio)  start_prisma_studio ;;
            all|"")         start_all ;;
            *)
                log_error "Unknown service: $2"
                show_help
                exit 1
                ;;
        esac
        ;;
    stop)
        case "${2:-all}" in
            frontend)       stop_frontend ;;
            prisma-studio)  stop_prisma_studio ;;
            all|"")         stop_all ;;
            *)
                log_error "Unknown service: $2"
                show_help
                exit 1
                ;;
        esac
        ;;
    restart)
        case "${2:-all}" in
            frontend)       restart_frontend ;;
            prisma-studio)  stop_prisma_studio; start_prisma_studio ;;
            all|"")         restart_all ;;
            *)
                log_error "Unknown service: $2"
                show_help
                exit 1
                ;;
        esac
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs "${2:-all}"
        ;;
    tail-logs)
        tail_logs "${2:-all}"
        ;;
    db-seed)
        db_seed
        ;;
    db-migrate)
        db_migrate
        ;;
    db-generate)
        db_generate
        ;;
    db-reset)
        db_reset
        ;;
    db-studio)
        db_studio
        ;;
    users)
        show_users
        ;;
    install)
        install_deps
        ;;
    build)
        build_app
        ;;
    clean)
        clean_build
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        run_interactive
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

exit 0
