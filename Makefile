.PHONY: help up down logs logs-backend logs-frontend logs-nginx stop restart build rebuild clean test db-init shell-backend shell-frontend backup-now backup-list backup-cleanup backup-status

help:
	@echo "Relic Development Commands (Container-based)"
	@echo "=================================================="
	@echo "Quick Start:"
	@echo "  make up            - Start all containers (nginx, backend, frontend, PostgreSQL, MinIO)"
	@echo "  make down          - Stop all containers"
	@echo ""
	@echo "Development:"
	@echo "  make logs          - View logs from all containers"
	@echo "  make logs-backend  - View backend logs only"
	@echo "  make logs-frontend - View frontend logs only"
	@echo "  make logs-nginx    - View nginx logs only"
	@echo "  make restart       - Restart all containers"
	@echo "  make rebuild       - Rebuild images and start containers"
	@echo ""
	@echo "Debugging & Shells:"
	@echo "  make shell-backend - Open shell in backend container"
	@echo "  make shell-frontend - Open shell in frontend container"
	@echo "  make db-init       - Initialize database"
	@echo ""
	@echo "Maintenance:"
	@echo "  make build         - Build images without starting containers"
	@echo "  make clean         - Stop containers and clean up volumes"
	@echo "  make test          - Run tests in backend container"
	@echo ""
	@echo "Database Backups:"
	@echo "  make backup-now    - Trigger manual database backup"
	@echo "  make backup-list   - List all database backups"
	@echo "  make backup-cleanup - Run retention policy cleanup"
	@echo "  make backup-status - Show backup system status"
	@echo ""
	@echo "Service URLs:"
	@echo "  Frontend:  http://localhost"
	@echo "  Backend:   http://localhost/api"
	@echo "  API Docs:  http://localhost/api/docs"
	@echo "  MinIO:     http://localhost:9001"
	@echo "  Database:  localhost:5432"

# Start all containers in development mode
up:
	@echo "Starting Relic services..."
	GIT_HASH=$$(git rev-parse --short HEAD 2>/dev/null || echo "dev") docker compose up -d
	@echo ""
	@echo "✓ Services started!"
	@echo ""
	@echo "Service URLs:"
	@echo "  Frontend:  http://localhost"
	@echo "  Backend:   http://localhost/api"
	@echo "  API Docs:  http://localhost/api/docs"
	@echo "  MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
	@echo ""
	@echo "View logs with: make logs"

# Stop all containers
down:
	@echo "Stopping Relic services..."
	docker compose down
	@echo "✓ Services stopped"

# View logs from all containers
logs:
	docker compose logs -f

# View backend logs only
logs-backend:
	docker compose logs -f backend

# View frontend logs only
logs-frontend:
	docker compose logs -f frontend

# View nginx logs only
logs-nginx:
	docker compose logs -f nginx

# Restart all containers
restart: down up

# Build images without starting
build:
	@echo "Building Docker images..."
	GIT_HASH=$$(git rev-parse --short HEAD 2>/dev/null || echo "dev") docker compose build
	@echo "✓ Images built"

# Rebuild images and start containers
rebuild: build up

# Open shell in backend container
shell-backend:
	docker compose exec backend /bin/bash

# Open shell in frontend container
shell-frontend:
	docker compose exec frontend /bin/sh

# Initialize database
db-init:
	@echo "Initializing database..."
	docker compose exec backend python -c "from backend.database import init_db; init_db()"
	@echo "✓ Database initialized"

# Run tests in backend container
test:
	docker compose exec backend pytest -v

# Clean up volumes and stopped containers
clean:
	@echo "Cleaning up..."
	docker compose down -v
	@echo "✓ Containers and volumes removed"
	@echo ""
	@echo "Note: Use 'make up' to start fresh"

# ===== Database Backup Commands =====

# Trigger manual database backup
backup-now:
	@echo "Triggering manual database backup..."
	@docker compose exec backend python -c "import asyncio; from backend.backup import perform_backup; asyncio.run(perform_backup(backup_type='manual'))"
	@echo "✓ Backup completed"

# List all database backups
backup-list:
	@echo "Listing all database backups..."
	@echo ""
	@docker compose exec backend python -c "import asyncio; from backend.backup import list_all_backups; backups = asyncio.run(list_all_backups()); sorted_backups = sorted(backups, key=lambda x: x['timestamp'], reverse=True); print(f'Total backups: {len(sorted_backups)}'); print(f'Total size: {sum(b[\"size\"] for b in sorted_backups) / 1024 / 1024:.2f} MB'); print(''); print('Recent backups:'); print('-' * 80); [print(f'{b[\"timestamp\"].strftime(\"%Y-%m-%d %H:%M:%S UTC\"):<25} {b[\"size\"]/1024/1024:>10.2f} MB  {b[\"key\"]}') for b in sorted_backups[:20]]"

# Run backup retention cleanup
backup-cleanup:
	@echo "Running backup retention cleanup..."
	@docker compose exec backend python -c "import asyncio; from backend.backup import cleanup_old_backups; asyncio.run(cleanup_old_backups())"
	@echo "✓ Cleanup completed"

# Show backup system status
backup-status:
	@echo "Database Backup System Status"
	@echo "=============================="
	@docker compose exec backend python -c "import asyncio; from backend.backup import list_all_backups; from backend.config import settings; backups = asyncio.run(list_all_backups()); sorted_backups = sorted(backups, key=lambda x: x['timestamp'], reverse=True); print(f'Enabled: {settings.BACKUP_ENABLED}'); print(f'Backup times: {settings.BACKUP_TIMES} ({settings.BACKUP_TIMEZONE})'); print(f'Startup backup: {settings.BACKUP_ON_STARTUP}'); print(f'Shutdown backup: {settings.BACKUP_ON_SHUTDOWN}'); print(f'Retention: {settings.BACKUP_RETENTION_DAYS}d daily, {settings.BACKUP_RETENTION_WEEKS}d weekly, monthly forever'); print(''); print(f'Total backups: {len(sorted_backups)}'); print(f'Total size: {sum(b[\"size\"] for b in sorted_backups) / 1024 / 1024:.2f} MB'); print(f'Last backup: {sorted_backups[0][\"timestamp\"].strftime(\"%Y-%m-%d %H:%M:%S UTC\")} ({sorted_backups[0][\"size\"]/1024/1024:.2f} MB)') if sorted_backups else None"

