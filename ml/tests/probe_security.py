import sys
import os
import time
import statistics
import json

# Ensure ml/api is on sys.path and working directory is set for relative model loads
api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api'))
sys.path.insert(0, api_dir)
os.chdir(api_dir)

from app import app
from fastapi.testclient import TestClient

client = TestClient(app, raise_server_exceptions=False)

print("=" * 70)
print("FASTAPI SECURITY & INPUT VALIDATION EVALUATION")
print("=" * 70)

# Test 1: Unauthenticated request to /predict/heart
r1 = client.post("/predict/heart", json={"age": 55, "sex": 1, "trestbps": 130, "chol": 240})
print(f"Test 1 - Unauthenticated /predict/heart: status={r1.status_code}, response={r1.json()}")

# Test 2: Unauthenticated request to /predict/diabetes
r2 = client.post("/predict/diabetes", json={"HighBP": 1, "BMI": 26, "Age": 8})
print(f"Test 2 - Unauthenticated /predict/diabetes: status={r2.status_code}, response={r2.json()}")

# Test 3: Unauthenticated request to /ai-health-analysis
r3 = client.post("/ai-health-analysis", json={"age": 55, "HighBP": 1, "BMI": 26})
print(f"Test 3 - Unauthenticated /ai-health-analysis: status={r3.status_code}, keys={list(r3.json().keys())}")

# Test 4: Missing Authorization header on protected intent
r4 = client.post("/predict/heart", headers={}, json={"age": 50})
print(f"Test 4 - Missing Auth Header: status={r4.status_code} (Expected 401, Actual {r4.status_code})")

# Test 5: Invalid / Malformed JWT header
r5 = client.post("/predict/heart", headers={"Authorization": "Bearer invalid_token_xyz"}, json={"age": 50})
print(f"Test 5 - Invalid JWT Token: status={r5.status_code} (Expected 401/403, Actual {r5.status_code})")

# Test 6: Input Validation - String in numeric field
r6 = client.post("/predict/heart", json={"age": "invalid_string_age"})
print(f"Test 6 - String in numeric field: status={r6.status_code}, body_snippet={r6.text[:100]}")

# Test 7: Input Validation - SQL Injection probe payload
sqli_payload = "' OR '1'='1' --"
r7 = client.post("/predict/heart", json={"age": sqli_payload, "chol": sqli_payload})
print(f"Test 7 - SQLi probe payload: status={r7.status_code}, body_snippet={r7.text[:100]}")

# Test 8: Input Validation - Empty body
r8 = client.post("/predict/heart", json={})
print(f"Test 8 - Empty JSON body: status={r8.status_code}, body={r8.json()}")

# Test 9: Input Validation - Malformed JSON body
r9 = client.post("/predict/heart", content=b"invalid raw json", headers={"Content-Type": "application/json"})
print(f"Test 9 - Malformed JSON: status={r9.status_code}, body_snippet={r9.text[:100]}")

# Test 10: Oversized Payload (1 MB padding)
r10 = client.post("/predict/heart", json={"age": 50, "padding": "A" * (1024 * 1024)})
print(f"Test 10 - 1MB Oversized Payload: status={r10.status_code}, response={r10.json()}")

print("\n" + "=" * 70)
print("PERFORMANCE OVERHEAD MEASUREMENT (100 REQUESTS)")
print("=" * 70)

# Baseline performance: Unauthenticated POST /predict/heart (100 runs)
baseline_latencies = []
baseline_failures = 0
sample_payload = {"age": 55, "sex": 1, "trestbps": 130, "chol": 240, "thalch": 150}

for _ in range(100):
    t0 = time.perf_counter()
    res = client.post("/predict/heart", json=sample_payload)
    t1 = time.perf_counter()
    if res.status_code != 200:
        baseline_failures += 1
    baseline_latencies.append((t1 - t0) * 1000.0)

baseline_avg = statistics.mean(baseline_latencies)
baseline_p95 = statistics.quantiles(baseline_latencies, n=20)[18]  # 95th percentile

print(f"Baseline (Current Unprotected):")
print(f"  Count: {len(baseline_latencies)}")
print(f"  Avg Latency: {baseline_avg:.2f} ms")
print(f"  P95 Latency: {baseline_p95:.2f} ms")
print(f"  Failures: {baseline_failures}")

# Simulated Security Enabled:
# Benchmark with cryptographic token validation (HMAC-SHA256 signature verification and payload claim validation)
import hmac
import hashlib
import base64

SECRET_KEY = b"test_secret_for_security_benchmark_evaluation"
header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b'=')
payload = base64.urlsafe_b64encode(json.dumps({"sub": "user_123", "role": "patient", "exp": time.time() + 3600}).encode()).rstrip(b'=')
signature = base64.urlsafe_b64encode(hmac.new(SECRET_KEY, f"{header.decode()}.{payload.decode()}".encode(), hashlib.sha256).digest()).rstrip(b'=')
valid_jwt = f"{header.decode()}.{payload.decode()}.{signature.decode()}"

def verify_token(token_str):
    try:
        parts = token_str.split('.')
        if len(parts) != 3:
            return False
        h, p, s = parts
        expected_sig = base64.urlsafe_b64encode(hmac.new(SECRET_KEY, f"{h}.{p}".encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
        if not hmac.compare_digest(s, expected_sig):
            return False
        claims = json.loads(base64.urlsafe_b64decode(p + '==').decode())
        if claims.get('exp', 0) < time.time():
            return False
        return True
    except Exception:
        return False

secure_latencies = []
secure_failures = 0

for _ in range(100):
    t0 = time.perf_counter()
    # Perform token verification overhead
    is_valid = verify_token(valid_jwt)
    if not is_valid:
        secure_failures += 1
    res = client.post("/predict/heart", json=sample_payload, headers={"Authorization": f"Bearer {valid_jwt}"})
    t1 = time.perf_counter()
    if res.status_code != 200:
        secure_failures += 1
    secure_latencies.append((t1 - t0) * 1000.0)

secure_avg = statistics.mean(secure_latencies)
secure_p95 = statistics.quantiles(secure_latencies, n=20)[18]
overhead_pct = ((secure_avg - baseline_avg) / baseline_avg) * 100.0

print(f"\nSecurity Enabled (with JWT Validation Middleware simulation):")
print(f"  Count: {len(secure_latencies)}")
print(f"  Avg Latency: {secure_avg:.2f} ms")
print(f"  P95 Latency: {secure_p95:.2f} ms")
print(f"  Failures: {secure_failures}")
print(f"  Calculated Security Overhead: {overhead_pct:.2f}%")
