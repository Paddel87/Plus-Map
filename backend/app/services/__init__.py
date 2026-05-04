"""Domain service layer (ADR-020 §D).

Routes call these functions; services own the SQL/ORM and the business
rules (auto-participant, masking, approved-only catalog refs).
"""
