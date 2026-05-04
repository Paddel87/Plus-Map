"""Structured logging setup.

Per project constraint (project-context.md §6): no PII in logs. This module
configures structlog to emit JSON in production and a human-readable
console renderer in development. Per-request enrichment (request id, route
template, status, duration) is layered on top by ``app.logging_middleware``
(M11-HOTFIX-003 / ADR-054).
"""

from __future__ import annotations

import logging
import sys
from typing import Literal

import structlog


def configure_logging(
    level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO",
    *,
    json_output: bool = True,
) -> None:
    """Configure stdlib logging and structlog for the process.

    Idempotent: safe to call multiple times.
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]

    if json_output:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelNamesMapping()[level],
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
