"""RxDB sync module (M5b.2).

Implements ``GET /api/sync/{collection}/pull`` and
``POST /api/sync/{collection}/push`` for ``event`` and ``application``
following the RxDB replication protocol (ADR-017). Conflict-resolution
per ADR-029, soft-delete + cursor per ADR-030, schema source-of-truth
per ADR-031.
"""
