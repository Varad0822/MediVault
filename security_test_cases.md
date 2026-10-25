# Security Test Cases: AI-Driven Secure Patient-Controlled Healthcare Platform
**Academic Project Review 2 Test Specification & Execution Guide**

---

## 1. Test Suite Overview

This document specifies the exact test procedures, preconditions, input payloads, expected outcomes, and observed findings for the platform's security evaluation. All test cases are automated and can be executed using `pytest`.

---

## 2. Test Cases Specification

### TC-SEC-01: Unauthenticated API Access
* **Test ID:** `TC-SEC-01`
* **Target Endpoint:** `POST http://127.0.0.1:8000/predict/heart`
* **Preconditions:** FastAPI backend is running locally.
* **Input Data:**
  ```json
  {
    "age": 55,
    "sex": 1,
    "trestbps": 130,
    "chol": 240,
    "thalch": 150
  }
  ```
* **Headers:** No `Authorization` header provided.
* **Expected Result:** `HTTP 401 Unauthorized` with error message `"Missing or invalid authentication token"`.
* **Observed Result:** `HTTP 200 OK` with body `{"prediction": "Healthy", "confidence": 88.28}`.
* **Status:** **FAILED** (Authentication missing).

---

### TC-SEC-02: Invalid / Forged JWT Bearer Token
* **Test ID:** `TC-SEC-02`
* **Target Endpoint:** `POST http://127.0.0.1:8000/predict/heart`
* **Preconditions:** FastAPI backend is running locally.
* **Input Data:** Valid clinical payload as in TC-SEC-01.
* **Headers:**
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered_payload.fake_signature
  ```
* **Expected Result:** `HTTP 401 Unauthorized` or `HTTP 403 Forbidden`.
* **Observed Result:** `HTTP 200 OK` (token is completely ignored).
* **Status:** **FAILED** (Token validation missing).

---

### TC-SEC-03: Expired JWT Handling
* **Test ID:** `TC-SEC-03`
* **Target Endpoint:** `POST http://127.0.0.1:8000/predict/diabetes`
* **Preconditions:** Token with expired claim `{"exp": 1600000000}`.
* **Expected Result:** `HTTP 401 Unauthorized` (`"Token expired"`).
* **Observed Result:** `HTTP 200 OK` (expiration claim is not inspected).
* **Status:** **FAILED**.

---

### TC-SEC-04: Cross-Patient Read Access (IDOR)
* **Test ID:** `TC-SEC-04`
* **Target Component:** `frontend/src/services/doctorService.js` -> `getPatientMedicalHistory(patientId)`
* **Preconditions:** Two patients exist: Patient A (ID: `uuid-patient-a`) and Patient B (ID: `uuid-patient-b`).
* **Test Procedure:**
  1. Authenticate user context.
  2. Invoke `getPatientMedicalHistory("uuid-patient-b")` without active OTP session for Patient B.
* **Expected Result:** Query denied by backend/RLS with permission error.
* **Observed Result:** Client code relies on client-side routing checks; PostgREST queries query solely on `patient_id` parameter without enforcing session token on wire.
* **Status:** **FAILED (Design Risk)**.

---

### TC-SEC-05: Cross-Patient Deletion (IDOR in Mutation)
* **Test ID:** `TC-SEC-05`
* **Target Component:** `frontend/src/services/labReportService.js` -> `deleteLabReport(reportId)`
* **Test Procedure:**
  Inspect deletion query structure in `labReportService.js`:
  ```javascript
  supabase.from("lab_reports").delete().eq("id", reportId)
  ```
* **Expected Result:** Mutation query must enforce ownership: `.eq("id", reportId).eq("patient_id", user.id)`.
* **Observed Result:** Query omits `patient_id` filter; reliance is placed entirely on database RLS.
* **Status:** **FAILED (Design Risk)**.

---

### TC-SEC-06: Frontend Role-Based Access Control (RBAC)
* **Test ID:** `TC-SEC-06`
* **Target Component:** `frontend/src/routes/ProtectedRoute.jsx`
* **Test Procedure:**
  1. Authenticate as a user with `role = "patient"`.
  2. Attempt client-side navigation to `/doctor-dashboard`, `/doctor-access`, or `/doctor-appointments`.
* **Expected Result:** Redirect to unauthorized access page or patient dashboard.
* **Observed Result:** `ProtectedRoute` allows rendering because `user` is non-null. Role is not verified.
* **Status:** **FAILED**.

---

### TC-SEC-07 & 08: PostgreSQL Row-Level Security (RLS) Verification
* **Test ID:** `TC-SEC-07` (Read) & `TC-SEC-08` (Write)
* **Target:** Remote Supabase PostgREST endpoints
* **Preconditions:** Active Supabase project connection.
* **Observed Result:** Connection blocked due to DNS failure (`tkslkeedyxcgbmliddkv.supabase.co` DNS name does not exist; project paused or inactive).
* **Status:** **NOT RUN (Environment Blocked)**.

---

### TC-SEC-09: Sharing Revocation Lifecycle
* **Test ID:** `TC-SEC-09`
* **Target Component:** `patientService.revokeAccess(sessionId)` & `test_otp_sharing_lifecycle_expiry_and_revocation`
* **Test Procedure:**
  1. Create access session with `is_active = true`.
  2. Revoke session (`is_active = false`).
  3. Validate verification logic.
* **Expected Result:** Revoked session immediately denied verification.
* **Observed Result:** `is_active == false` correctly triggers validation denial.
* **Status:** **PASS (Logical Verification)**.

---

### TC-SEC-10: Sharing Expiration Lifecycle
* **Test ID:** `TC-SEC-10`
* **Target Component:** `doctorService.verifyPatientOTP` & `test_otp_sharing_lifecycle_expiry_and_revocation`
* **Test Procedure:**
  1. Create access session with timestamp `expiry < now()`.
  2. Attempt OTP verification.
* **Expected Result:** Session rejected due to expiration.
* **Observed Result:** Expiration timestamp comparison rejects expired sessions.
* **Status:** **PASS (Logical Verification)**.

---

### TC-SEC-11: Input Validation & Type Confusion (FastAPI)
* **Test ID:** `TC-SEC-11`
* **Target Endpoint:** `POST /predict/heart`
* **Input Payloads:**
  - Case A (Type confusion): `{"age": "string_not_int"}` -> Observed: `500 Internal Server Error` (leaks internal stack).
  - Case B (SQL injection probe): `{"age": "' OR 1=1 --"}` -> Observed: `500 Internal Server Error`.
  - Case C (Empty payload): `{}` -> Observed: `200 OK` (generates misleading `Healthy` prediction with 63.55% confidence).
  - Case D (Malformed JSON): `{broken` -> Observed: `422 Unprocessable Entity` (FastAPI native parser).
* **Expected Result:** All malformed or out-of-type payloads rejected with `422 Unprocessable Entity`.
* **Status:** **FAILED**.

---

### TC-SEC-12: Audit Logging Verification
* **Test ID:** `TC-SEC-12`
* **Target:** System-wide audit trails
* **Test Procedure:** Scan codebase for `audit_logs` table, trigger, or logging service.
* **Expected Result:** All clinical access and data mutations write to tamper-evident audit table.
* **Observed Result:** Zero audit logging implementation in codebase.
* **Status:** **NOT IMPLEMENTED**.

---

## 3. Automated Test Execution Instructions

To execute the automated security test suite locally:

```powershell
# 1. Navigate to project root
cd "c:\Users\varad khodave\healthcare-platform"

# 2. Run the full pytest security suite
.\ml\venv\Scripts\python.exe -m pytest ml/tests -v

# 3. Run only FastAPI security tests
.\ml\venv\Scripts\python.exe -m pytest ml/tests/test_fastapi_security.py -v

# 4. Run the standalone security probe and performance benchmark script
.\ml\venv\Scripts\python.exe .\ml\tests\probe_security.py
```
