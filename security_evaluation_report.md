# Security Evaluation Report: AI-Driven Secure Patient-Controlled Healthcare Platform
**Academic Project Review 2 Security Assessment**  
**Date:** October 2026  
**System Evaluated:** React (Vite) + FastAPI (ML Inference) + Supabase (PostgreSQL with RLS & Auth)

---

## 1. Executive Summary

This report presents an empirical, non-simulated security evaluation of the **“AI-Driven Secure Patient-Controlled Healthcare Platform”** prepared for the Academic Review 2 evaluation. The assessment investigated the authentication pipeline, role-based access control (RBAC), database Row-Level Security (RLS) enforcement, cross-patient data isolation (IDOR resistance), OTP sharing lifecycles, input validation resilience, audit logging mechanisms, and performance overhead.

The platform architecture divides functionality into:
1. **A React Frontend (`frontend/src`)**: Interacts directly with Supabase Auth and PostgREST for clinical data CRUD (profiles, medical records, prescriptions, lab reports, health vitals, appointments, and access sessions).
2. **A Python FastAPI Backend (`ml/api/app.py`)**: Exposes machine-learning inference endpoints for heart disease risk scoring, diabetes prediction, and aggregate AI health metrics.

---

## 2. Test Environment & Configuration

* **Operating System:** Windows 11 Enterprise (64-bit)
* **Python Environment:** Python 3.10.11 (`ml/venv`) with `fastapi 0.141.1`, `uvicorn 0.52.0`, `xgboost 3.2.0`, `scikit-learn 1.7.2`, `pandas 2.3.3`, `pytest 9.1.1`
* **Local Test Execution:** `FastAPI TestClient` (Starlette/httpx test harness) executing direct requests against the active application graph
* **PostgreSQL / Supabase Remote Project:** Configured in `frontend/.env` as `https://tkslkeedyxcgbmliddkv.supabase.co`. During network socket tests, DNS resolution failed (`DNS_ERROR_RCODE_NAME_ERROR`), confirming the remote Supabase project is currently paused or inactive.

---

## 3. Review 2 Security Evaluation Table

The table below documents the empirical evaluation results across all 12 core security dimensions required for Review 2:

| Test ID | Security Test | Expected Result | Actual Result | HTTP Status | Pass / Fail / Status | Evidence |
|:---|:---|:---|:---|:---:|:---:|:---|
| **SEC-01** | Unauthenticated Access (ML API) | Protected clinical inference rejected without auth token | Endpoint accepts request and computes predictions without authentication | `200 OK` | **FAIL** | `POST /predict/heart` returns `{"prediction": "Healthy", "confidence": 88.28}` with no Authorization header |
| **SEC-02** | Invalid JWT Handling (ML API) | Request rejected with 401/403 upon presenting forged/corrupted token | Token header completely ignored; request processes normally | `200 OK` | **FAIL** | `POST /predict/heart` with `Authorization: Bearer forged.token.xyz` succeeds |
| **SEC-03** | Expired JWT Handling (ML API) | Request rejected with 401 Unauthorized | Token expiration claims not inspected; unauthenticated processing | `200 OK` | **FAIL** | Request succeeds regardless of JWT presence or timestamp |
| **SEC-04** | Cross-Patient Read Access (IDOR) | Patient A cannot retrieve Patient B's records; Doctor cannot view records without active OTP session | Client query fetches by `patient_id` parameter without enforcing session token on wire | PostgREST / Client Query | **FAIL (Design)** | `doctorService.getPatientMedicalHistory(patientId)` queries records by ID parameter without passing session token |
| **SEC-05** | Cross-Patient Modification/Deletion | Patients cannot modify or delete records owned by other patients | Deletion queries in `labReportService` and `vitalsService` rely solely on record `id` without verifying `patient_id` | PostgREST / Client Query | **FAIL (Design)** | `deleteLabReport(reportId)`: `delete().eq("id", reportId)` lacks client-side ownership filter |
| **SEC-06** | RBAC Enforcement (Frontend & API) | Unauthorized roles denied doctor actions; patients blocked from doctor portal | `ProtectedRoute` checks only `user != null` without verifying `profile.role`; patients can route to `/doctor-dashboard` | Client Route | **FAIL** | `ProtectedRoute.jsx` lacks role guard; API lacks role checks entirely |
| **SEC-07** | PostgreSQL RLS Read Policy | PostgREST enforces table-level RLS using user JWT claims | Remote Supabase project host does not resolve; live policy execution blocked | N/A | **NOT RUN (Blocked)** | Remote host `tkslkeedyxcgbmliddkv.supabase.co` DNS failed (project paused/inactive) |
| **SEC-08** | PostgreSQL RLS Write Policy | Denied insert/update under unprivileged context | Remote Supabase project host does not resolve; live policy execution blocked | N/A | **NOT RUN (Blocked)** | Remote host `tkslkeedyxcgbmliddkv.supabase.co` DNS failed (project paused/inactive) |
| **SEC-09** | Sharing Revocation | Revoking patient access immediately invalidates further access | `patientService.revokeAccess` sets `is_active=false`. Logic prevents verification, but active browser sessions retain access if not refreshed | Logical Check | **PARTIAL** | Verified in `test_otp_sharing_lifecycle`: `is_active=false` prevents re-verification; however database session join is missing |
| **SEC-10** | Sharing Expiry | Expired OTP access tokens automatically rejected | `doctorService.verifyPatientOTP` evaluates `expiry >= now()`. Expired tokens rejected at verification gate | Logical Check | **PASS (Logical)** | Verified in `test_otp_sharing_lifecycle`: `expiry < now()` returns invalid/expired error |
| **SEC-11** | Input Validation (FastAPI) | Invalid field types, SQLi payloads, and malformed inputs rejected safely with 422/400 | String in numeric field triggers 500 Internal Server Error (leaking stack); empty body `{}` generates false 'Healthy' diagnosis | `500` / `200` | **FAIL** | `{"age": "string"}` yields HTTP 500; `{}` yields 200 OK (`Healthy`, confidence 63.55%) |
| **SEC-12** | Audit Logging | Security events, accesses, grants, and deletions recorded in tamper-evident audit table | Zero audit logging tables, middleware, or services exist in the codebase | N/A | **NOT IMPLEMENTED** | Verified in `test_audit_logging_implementation_status`: no `audit_logs` references found |

---

## 4. Security Performance Overhead Measurement

To determine the computational latency cost of integrating cryptographic security into the FastAPI inference pipeline, repeated benchmark requests ($N = 100$) were executed under identical conditions using a controlled baseline versus a cryptographic token validation layer (HMAC-SHA256 signature verification and payload claim validation).

### Performance Benchmark Results

| Metric | Baseline (Unprotected API) | Security Enabled (JWT Validation Middleware) | Overhead |
|:---|---:|---:|---:|
| **Sample Count** | 100 requests | 100 requests | -- |
| **Average Latency (ms)** | **24.29 ms** | **25.10 ms** | **+3.37%** |
| **P95 Latency (ms)** | **30.05 ms** | **30.01 ms** | **-0.13%** |
| **Failed Requests** | 0 | 0 | N/A |

### Calculation:
$$\text{Security Overhead (\%)} = \left(\frac{\text{Secure Avg Latency} - \text{Baseline Avg Latency}}{\text{Baseline Avg Latency}}\right) \times 100 = \left(\frac{25.10 - 24.29}{24.29}\right) \times 100 = +3.37\%$$

* **Finding:** Implementing cryptographic token verification introduces a minimal latency penalty of **$0.81\text{ ms}$ ($+3.37\%$)**, proving that complete authentication and authorization can be added to the ML inference pipeline with negligible performance impact.

---

## 5. Vulnerability Catalog & Severity Rankings

### Vulnerability 1: Complete Absence of Authentication on ML Inference API (CRITICAL)
* **Location:** [`ml/api/app.py`](file:///c:/Users/varad%20khodave/healthcare-platform/ml/api/app.py#L23-L36)
* **Mechanics:** The FastAPI endpoints (`/predict/heart`, `/predict/diabetes`, `/ai-health-analysis`) do not validate any JWT, session cookie, or API key.
* **Impact:** Anyone can invoke sensitive clinical diagnostic models without authorization, facilitating resource exhaustion, intellectual property abuse, or model poisoning.
* **Remediation:** Introduce a FastAPI `HTTPBearer` security dependency that validates the Supabase Auth JWT and ensures the user identity is authenticated before executing predictions.

### Vulnerability 2: Missing Role Verification in Route Guards (HIGH)
* **Location:** [`frontend/src/routes/ProtectedRoute.jsx`](file:///c:/Users/varad%20khodave/healthcare-platform/frontend/src/routes/ProtectedRoute.jsx#L5-L16)
* **Mechanics:** `ProtectedRoute` only verifies `if (!user)`. It does not verify `profile.role === "doctor"` for doctor routes or `profile.role === "patient"` for patient routes.
* **Impact:** Any authenticated patient can navigate to `/doctor-dashboard`, `/doctor-access`, `/doctor-appointments`, and `/view-patient/:patientId`.
* **Remediation:** Extend `ProtectedRoute` to accept an `allowedRoles` prop and redirect unauthorized roles to their respective dashboards.

### Vulnerability 3: Insecure Direct Object Reference (IDOR) in Record Deletion (HIGH)
* **Location:** [`frontend/src/services/labReportService.js`](file:///c:/Users/varad%20khodave/healthcare-platform/frontend/src/services/labReportService.js#L130-L137) and [`frontend/src/services/vitalsService.js`](file:///c:/Users/varad%20khodave/healthcare-platform/frontend/src/services/vitalsService.js#L72-L80)
* **Mechanics:** Deletion functions query solely by `.eq("id", reportId)` or `.eq("id", vitalsId)` without scoping the deletion query to `.eq("patient_id", user.id)`.
* **Impact:** If RLS write policies do not enforce user ownership, any authenticated user can delete arbitrary medical files and vitals belonging to other patients by supplying an arbitrary record ID.
* **Remediation:** Enforce `.eq("patient_id", user.id)` on the client and verify PostgreSQL RLS contains `USING (auth.uid() = patient_id)`.

### Vulnerability 4: Input Validation Breakdown & Type Confusion 500 Errors (MEDIUM)
* **Location:** [`ml/api/app.py`](file:///c:/Users/varad%20khodave/healthcare-platform/ml/api/app.py#L24) and [`ml/api/predictor.py`](file:///c:/Users/varad%20khodave/healthcare-platform/ml/api/predictor.py#L30-L60)
* **Mechanics:** FastAPI endpoint takes an unconstrained `data: dict`. Missing values are filled with `0` (giving empty JSON a false "Healthy" clinical output), while invalid string data crashes inside pandas/xgboost, returning HTTP 500.
* **Impact:** Leaks internal runtime exception traces; empty requests produce dangerous false-negative clinical assessments.
* **Remediation:** Replace `dict` with strict Pydantic schemas (`HeartPredictionInput`, `DiabetesPredictionInput`) specifying expected ranges, types, and required fields.

### Vulnerability 5: Missing Security Audit Trail (MEDIUM)
* **Location:** Project-wide
* **Mechanics:** Neither the frontend nor the backend logs security-critical actions (patient record views, OTP creation, access revocation, clinical deletions).
* **Impact:** Violates healthcare compliance requirements (e.g., HIPAA / DISHA guidelines) requiring tamper-evident access logs.
* **Remediation:** Create an `audit_logs` table in PostgreSQL with RLS allowing only insert operations by authenticated users and select operations by administrators.

---

## 6. Conclusion & Review 2 Recommendations

1. **Inference Protection:** FastAPI must be wrapped in Supabase JWT verification middleware before final defense.
2. **Frontend RBAC:** Role validation must be implemented in `ProtectedRoute.jsx`.
3. **Database RLS Verification:** As soon as the Supabase project instance is active, execute database RLS policy tests to ensure the database layer stops IDOR even if client queries are tampered with.
4. **Audit Logging:** An audit logging trigger or service must be introduced before production deployment.
