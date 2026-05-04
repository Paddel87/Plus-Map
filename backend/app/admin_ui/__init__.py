"""SQLAdmin admin UI mounted under /admin (ADR-016, ADR-049).

This package wires the SQLAdmin instance to the existing FastAPI app so
admins can pick stable URLs and a single auth path:

* ``auth.AdminAuthBackend`` reuses the fastapi-users JWT cookie
  (``hcmap_session``) and rejects anyone who is not an active admin.
* ``register_admin`` builds the ``Admin`` and registers each ModelView
  from ``views``.

The mount itself happens in ``app.main.create_app`` so application-wide
middleware ordering stays under one roof.
"""

from __future__ import annotations

from app.admin_ui.auth import AdminAuthBackend
from app.admin_ui.setup import register_admin

__all__ = ["AdminAuthBackend", "register_admin"]
