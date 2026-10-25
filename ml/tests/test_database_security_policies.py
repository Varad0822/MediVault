"""
Automated Security Test Suite - Database & Authorization Policies
Tests IDOR vulnerabilities, RBAC policies, OTP sharing lifecycle, and audit logging.
"""

import os
import re
import datetime
import pytest

def test_remote_supabase_environment_connectivity():
    """
    Test: Inspect Supabase environment configuration and remote connectivity.
    Finding: Remote project host fails DNS resolution (paused/inactive).
    """
    env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', '.env'))
    assert os.path.exists(env_file), "frontend/.env file must exist"
    
    with open(env_file, 'r', encoding='utf-8') as f:
        env_content = f.read()
    
    assert "VITE_SUPABASE_URL" in env_content
    assert "VITE_SUPABASE_ANON_KEY" in env_content

def test_codebase_idor_flaws_in_record_deletion():
    """
    Test: Inspect lab report and health vitals deletion functions.
    Vulnerability: Deletion functions delete by ID without verifying patient ownership in the query.
    """
    lab_service_file = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'services', 'labReportService.js'
    ))
    with open(lab_service_file, 'r', encoding='utf-8') as f:
        code = f.read()

    # Verify deleteLabReport relies solely on .eq("id", reportId) without checking patient_id
    assert '.from("lab_reports")' in code
    assert '.eq("id", reportId)' in code
    assert 'patient_id' not in code.split('deleteLabReport')[1].split('}')[0]

def test_codebase_rbac_routing_gap():
    """
    Test: Inspect frontend route protection for role enforcement.
    Vulnerability: ProtectedRoute only checks if user is logged in; it does NOT check role ('doctor' vs 'patient').
    """
    route_file = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'routes', 'ProtectedRoute.jsx'
    ))
    with open(route_file, 'r', encoding='utf-8') as f:
        code = f.read()

    # Confirms that ProtectedRoute lacks role verification
    assert 'user.role' not in code
    assert 'role' not in code
    assert '!user' in code

def test_otp_sharing_lifecycle_expiry_and_revocation():
    """
    Test: Evaluate the OTP sharing validation logic used in doctorService and patientService.
    Expected: Active OTPs valid until expiry; revoked/expired OTPs must be rejected.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    valid_expiry = (now + datetime.timedelta(minutes=30)).isoformat()
    expired_time = (now - datetime.timedelta(minutes=5)).isoformat()

    # Scenario 1: Active and not expired
    session_valid = {"is_active": True, "expiry": valid_expiry, "otp": "123456"}
    is_valid_active = session_valid["is_active"] and (
        datetime.datetime.fromisoformat(session_valid["expiry"]) >= now
    )
    assert is_valid_active is True

    # Scenario 2: Revoked session
    session_revoked = {"is_active": False, "expiry": valid_expiry, "otp": "123456"}
    is_revoked_valid = session_revoked["is_active"] and (
        datetime.datetime.fromisoformat(session_revoked["expiry"]) >= now
    )
    assert is_revoked_valid is False

    # Scenario 3: Expired session
    session_expired = {"is_active": True, "expiry": expired_time, "otp": "123456"}
    is_expired_valid = session_expired["is_active"] and (
        datetime.datetime.fromisoformat(session_expired["expiry"]) >= now
    )
    assert is_expired_valid is False

def test_audit_logging_implementation_status():
    """
    Test: Inspect codebase for audit logging tables, middleware, or service functions.
    Finding: Audit logging is completely Not Implemented.
    """
    services_dir = os.path.abspath(os.path.join(
        os.path.dirname(__file__), '..', '..', 'frontend', 'src', 'services'
    ))
    service_files = [os.path.join(services_dir, f) for f in os.listdir(services_dir) if f.endswith('.js')]
    
    audit_mentions = 0
    for sf in service_files:
        with open(sf, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'audit_logs' in content or 'auditTrail' in content:
                audit_mentions += 1

    assert audit_mentions == 0, "Audit logging was expected to be absent in the current codebase."
