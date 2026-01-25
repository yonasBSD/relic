"""
Centralized background task scheduler.

Coordinates all periodic maintenance tasks including:
- Database backups
- Backup retention cleanup
- Expired relic cleanup
"""
import logging
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.config import settings
from backend.backup import perform_backup, cleanup_old_backups
from backend.tasks import cleanup_expired_relics

logger = logging.getLogger('relic.scheduler')

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


async def start_scheduler() -> None:
    """Initialize and start the background task scheduler."""
    global scheduler

    logger.info("Starting background task scheduler...")

    scheduler = AsyncIOScheduler(timezone=settings.BACKUP_TIMEZONE)

    # 1. Schedule Database Backups (if enabled)
    if settings.BACKUP_ENABLED:
        backup_times = settings.get_backup_times()
        logger.info(f"Scheduling backups for times: {backup_times}")

        for hour, minute in backup_times:
            job_id = f'backup_{hour:02d}{minute:02d}'
            scheduler.add_job(
                func=perform_backup,
                trigger=CronTrigger(hour=hour, minute=minute, timezone=settings.BACKUP_TIMEZONE),
                id=job_id,
                name=f'Database Backup {hour:02d}:{minute:02d}',
                kwargs={'backup_type': 'scheduled'},
                replace_existing=True
            )
            logger.debug(f"Scheduled backup job: {job_id}")

        # Add daily cleanup job at 3 AM (if enabled)
        if settings.BACKUP_CLEANUP_ENABLED:
            scheduler.add_job(
                func=cleanup_old_backups,
                trigger=CronTrigger(hour=3, minute=0, timezone=settings.BACKUP_TIMEZONE),
                id='backup_cleanup',
                name='Backup Retention Cleanup',
                replace_existing=True
            )
            logger.debug("Scheduled cleanup job: backup_cleanup at 03:00")
        else:
            logger.info("Backup cleanup disabled via BACKUP_CLEANUP_ENABLED=false")
    else:
        logger.info("Database backups disabled via BACKUP_ENABLED=false")

    # 2. Schedule Relic Expiration Cleanup
    scheduler.add_job(
        func=cleanup_expired_relics,
        trigger='interval',
        minutes=settings.RELIC_CLEANUP_INTERVAL,
        id='relic_cleanup',
        name='Expired Relic Cleanup',
        replace_existing=True
    )
    logger.info(f"Scheduled relic cleanup every {settings.RELIC_CLEANUP_INTERVAL} minutes")

    scheduler.start()
    logger.info("Background task scheduler started successfully")


async def shutdown_scheduler() -> None:
    """Gracefully shutdown the background task scheduler."""
    global scheduler

    if scheduler:
        logger.info("Shutting down background task scheduler...")
        scheduler.shutdown(wait=True)
        scheduler = None
        logger.info("Background task scheduler stopped")
