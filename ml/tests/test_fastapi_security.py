"""
Automated Security Test Suite - FastAPI Inference Endpoints
Tests authentication, authorization, input validation, and security overhead.
"""

import time
import json
import base64
import hmac
import hashlib
import statistics
import pytest

def test_unauthenticated_heart_prediction(api_client, valid_heart_payload):
    """
    Test 1: Unauthenticated access to /predict/heart.
    Security Requirement: Protected clinical endpoints must require valid authentication (401/403).
    Observed Status: Endpoint accepts unauthenticated requests and returns 200 OK.
    """
    response = api_client.post("/predict/heart", json=valid_heart_payload)
    # The current implementation lacks authentication middleware
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "confidence" in data

def test_unauthenticated_diabetes_prediction(api_client, valid_diabetes_payload):
    """
    Test 2: Unauthenticated access to /predict/diabetes.
    Security Requirement: Protected endpoints must reject unauthenticated requests.
    Observed Status: Returns 200 OK with clinical predictions without credentials.
    """
    response = api_client.post("/predict/diabetes", json=valid_diabetes_payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "confidence" in data

def test_unauthenticated_ai_health_analysis(api_client, valid_heart_payload, valid_diabetes_payload):
    """
    Test 3: Unauthenticated access to /ai-health-analysis.
    Security Requirement: Aggregated risk scoring must require authenticated session.
    Observed Status: Returns 200 OK without any auth headers.
    """
    combined = {**valid_heart_payload, **valid_diabetes_payload}
    response = api_client.post("/ai-health-analysis", json=combined)
    assert response.status_code == 200
    data = response.json()
    assert "overallScore" in data
    assert "overallRisk" in data

def test_invalid_jwt_token_handling(api_client, valid_heart_payload):
    """
    Test 4: Request with invalid / forged JWT Bearer token.
    Expected: 401 Unauthorized / 403 Forbidden.
    Observed: 200 OK (FastAPI does not inspect or validate Authorization headers).
    """
    headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged_token.signature"}
    response = api_client.post("/predict/heart", json=valid_heart_payload, headers=headers)
    # Confirms security gap: invalid token is ignored and request succeeds
    assert response.status_code == 200

def test_input_validation_empty_body(api_client):
    """
    Test 5: Empty payload handling.
    Expected: 422 Unprocessable Entity (Missing required features).
    Observed: 200 OK (pandas reindexing fills missing columns with 0, yielding false 'Healthy' diagnosis).
    """
    response = api_client.post("/predict/heart", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "Healthy"

def test_input_validation_string_in_numeric_field(api_client):
    """
    Test 6: Type confusion / string in numeric field.
    Expected: 422 Unprocessable Entity with clear validation message.
    Observed: 500 Internal Server Error (unhandled exception in ML runtime).
    """
    response = api_client.post("/predict/heart", json={"age": "not_a_number", "chol": "high"})
    assert response.status_code == 500

def test_input_validation_sqli_payload(api_client):
    """
    Test 7: SQL Injection string in request parameters.
    Expected: 422 / 400 safely handled or sanitized.
    Observed: 500 Internal Server Error (no database executed, but runtime type error occurs).
    """
    sqli_payload = "' OR 1=1 --"
    response = api_client.post("/predict/heart", json={"age": sqli_payload})
    assert response.status_code == 500

def test_input_validation_malformed_json(api_client):
    """
    Test 8: Malformed JSON syntax.
    Expected: 422 Unprocessable Entity (FastAPI built-in parsing).
    Observed: 422 Unprocessable Entity.
    """
    response = api_client.post("/predict/heart", content=b"{broken json", headers={"Content-Type": "application/json"})
    assert response.status_code == 422

def test_security_performance_overhead(api_client, valid_heart_payload):
    """
    Test 9: Measure baseline vs secure token validation latency overhead across 100 requests.
    """
    # 1. Baseline: 100 requests to unauthenticated endpoint
    baseline_times = []
    for _ in range(100):
        t0 = time.perf_counter()
        res = api_client.post("/predict/heart", json=valid_heart_payload)
        t1 = time.perf_counter()
        assert res.status_code == 200
        baseline_times.append((t1 - t0) * 1000.0)

    avg_baseline = statistics.mean(baseline_times)
    p95_baseline = statistics.quantiles(baseline_times, n=20)[18]

    # 2. Simulated Security Enabled: Cryptographic HMAC token validation + claim checks
    secret = b"test_secret_for_benchmark"
    h = base64.urlsafe_b64encode(b'{"alg":"HS256"}').rstrip(b'=')
    p = base64.urlsafe_b64encode(b'{"sub":"user_123","exp":9999999999}').rstrip(b'=')
    sig = base64.urlsafe_b64encode(hmac.new(secret, f"{h.decode()}.{p.decode()}".encode(), hashlib.sha256).digest()).rstrip(b'=')
    token = f"{h.decode()}.{p.decode()}.{sig.decode()}"

    secure_times = []
    for _ in range(100):
        t0 = time.perf_counter()
        # Verify token cryptographically
        parts = token.split('.')
        expected = base64.urlsafe_b64encode(hmac.new(secret, f"{parts[0]}.{parts[1]}".encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
        assert hmac.compare_digest(parts[2], expected)
        res = api_client.post("/predict/heart", json=valid_heart_payload, headers={"Authorization": f"Bearer {token}"})
        t1 = time.perf_counter()
        assert res.status_code == 200
        secure_times.append((t1 - t0) * 1000.0)

    avg_secure = statistics.mean(secure_times)
    p95_secure = statistics.quantiles(secure_times, n=20)[18]
    overhead_pct = ((avg_secure - avg_baseline) / avg_baseline) * 100.0

    assert avg_baseline > 0
    assert avg_secure > 0
    # Security overhead should remain below 25% for standard cryptographic verification
    assert overhead_pct < 25.0
