import time
import logging
import functools
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Dict, Optional

from backend.config import settings

# Use uvicorn logger for consistency with server logs
logger = logging.getLogger("uvicorn.error")

# ContextVar to store profiling results for the current task/request
profiling_context: ContextVar[Optional[Dict[str, float]]] = ContextVar("profiling_context", default=None)

@contextmanager
def profile_step(step_name: str):
    """Context manager to measure time for a specific step."""
    results = profiling_context.get()
    if results is None:
        yield
        return

    start_time = time.perf_counter()
    try:
        yield
    finally:
        end_time = time.perf_counter()
        results[step_name] = end_time - start_time

def profile_endpoint(endpoint_name: str):
    """Decorator to measure total request time and log results."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            if not settings.PROFILING_ENABLED:
                return await func(*args, **kwargs)

            results = {}
            token = profiling_context.set(results)
            start_time = time.perf_counter()
            try:
                return await func(*args, **kwargs)
            finally:
                total_time = time.perf_counter() - start_time
                steps_str = " | ".join([f"{k}: {v:.4f}s" for k, v in results.items()])
                logger.info(f"PROFILING [{endpoint_name}] Total: {total_time:.4f}s | {steps_str}")
                profiling_context.reset(token)
        return wrapper
    return decorator
