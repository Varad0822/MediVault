import { supabase } from "../lib/supabase";
import authService from "./authService";

const doctorService = {
  // ============================
  // Doctor Profile (with Auto-Healing for empty details)
  // ============================
  async getDoctorProfile() {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    let { data: details, error: detailsError } = await supabase
      .from("doctor_details")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (detailsError) console.warn("Doctor details fetch notice:", detailsError.message);

    if (!details) {
      const { data: newDetails } = await supabase
        .from("doctor_details")
        .upsert({ id: user.id })
        .select()
        .single();

      details = newDetails || {};
    }

    return {
      ...profile,
      ...(details || {}),
    };
  },

  async updateDoctorProfile(profileData) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const payload = {
      id: user.id,
      specialization: profileData.specialization,
      hospital_name: profileData.hospitalName || profileData.hospital_name,
      license_number: profileData.licenseNumber || profileData.license_number,
      contact_number: profileData.contactNumber || profileData.contact_number,
      experience_years: profileData.experienceYears || profileData.experience_years ? parseInt(profileData.experienceYears || profileData.experience_years, 10) : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("doctor_details")
      .upsert(payload);

    if (error) {
      console.warn("Doctor profile update notice:", error.message);
      const { error: fallbackError } = await supabase
        .from("doctor_details")
        .upsert({
          id: user.id,
          specialization: profileData.specialization,
          hospital_name: profileData.hospitalName || profileData.hospital_name,
          license_number: profileData.licenseNumber || profileData.license_number,
        });

      if (fallbackError) throw fallbackError;
      return true;
    }

    return true;
  },

  // Helper to test if a string is a valid 36-char UUID
  isValidUUID(str) {
    if (!str || typeof str !== "string") return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
  },

  // ============================
  // Central Universal Patient Identifier Resolver
  // Resolves PAT-XXXXXX, numbers, partial UUID (e.g. 'faec'), full UUID, name, or email
  // GUARANTEE: Returns a valid 36-char UUID string or null; NEVER returns invalid non-UUID strings to Postgres!
  // ============================
  async resolvePatientIdentifier(input) {
    if (!input || typeof input !== "string") return null;
    const raw = input.trim();
    if (!raw) return null;

    // 1. If already a valid full 36-char UUID, return normalized lowercase
    if (this.isValidUUID(raw)) {
      return raw.toLowerCase();
    }

    const cleanRaw = raw.toLowerCase();
    const upper = raw.toUpperCase();
    const digitsOnly = raw.replace(/\D/g, ""); // e.g. "839201" from "PAT-839201"
    const formattedPatCode = upper.startsWith("PAT-") ? upper : `PAT-${upper}`;

    // 2. Fast check in profiles table by patient_code
    try {
      const { data: matchedByCode } = await supabase
        .from("profiles")
        .select("id, patient_code")
        .or(`patient_code.eq.${upper},patient_code.eq.${formattedPatCode}`)
        .maybeSingle();

      if (matchedByCode?.id && this.isValidUUID(matchedByCode.id)) {
        return matchedByCode.id;
      }
    } catch {
      // Continue to next resolution strategies
    }

    // 3. Fallback: Search all profiles (handles partial UUIDs like 'faec', partial PAT codes, email, or names)
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, patient_code, role");

      if (!error && profiles && profiles.length > 0) {
        // Strategy A: UUID prefix match (e.g. user entered 'faec' or 'faec8b74')
        const matchByUUIDPrefix = profiles.find((p) => {
          if (!p.id) return false;
          const pid = p.id.toLowerCase();
          const cleanPid = pid.replace(/-/g, "");
          const cleanInp = cleanRaw.replace(/-/g, "");
          return pid.startsWith(cleanRaw) || cleanPid.startsWith(cleanInp);
        });

        if (matchByUUIDPrefix?.id && this.isValidUUID(matchByUUIDPrefix.id)) {
          return matchByUUIDPrefix.id;
        }

        // Strategy B: Flexible Patient Code match (e.g. '839201' matches 'PAT-839201' or vice versa)
        const matchByCode = profiles.find((p) => {
          if (!p.patient_code) return false;
          const pCode = p.patient_code.toLowerCase();
          const pDigits = pCode.replace(/\D/g, "");
          return (
            pCode === cleanRaw ||
            pCode === `pat-${cleanRaw}` ||
            pCode.replace("pat-", "") === cleanRaw.replace("pat-", "") ||
            (digitsOnly && pDigits && (pDigits === digitsOnly || pDigits.includes(digitsOnly)))
          );
        });

        if (matchByCode?.id && this.isValidUUID(matchByCode.id)) {
          return matchByCode.id;
        }

        // Strategy C: Match by Email or Full Name
        const matchByEmailOrName = profiles.find((p) => {
          return (
            (p.email && p.email.toLowerCase() === cleanRaw) ||
            (p.full_name && p.full_name.toLowerCase() === cleanRaw)
          );
        });

        if (matchByEmailOrName?.id && this.isValidUUID(matchByEmailOrName.id)) {
          return matchByEmailOrName.id;
        }
      }
    } catch (err) {
      console.warn("Notice in profile resolution:", err.message);
    }

    return null;
  },

  // ============================
  // OTP Access Verification (Supports Short PAT-XXXXXX Code, Partial UUID 'faec', or Full UUID)
  // ============================
  async verifyPatientOTP({ patientId, otp }) {
    const currentTime = new Date().toISOString();
    const cleanOtp = (otp || "").trim();
    const cleanInput = (patientId || "").trim();

    if (!cleanOtp) {
      throw new Error("Please enter the 6-digit access OTP.");
    }
    if (!cleanInput) {
      throw new Error("Please enter the Patient ID or Short Code.");
    }

    // Strategy 1: Check active access session by OTP directly
    // This immediately yields the exact, valid 36-char patient UUID without guessing!
    const { data: sessionByOtp } = await supabase
      .from("access_sessions")
      .select("*")
      .eq("otp", cleanOtp)
      .eq("is_active", true)
      .gte("expiry", currentTime)
      .maybeSingle();

    let actualPatientUUID = null;
    let verifiedSession = sessionByOtp;

    if (sessionByOtp && this.isValidUUID(sessionByOtp.patient_id)) {
      actualPatientUUID = sessionByOtp.patient_id;
    } else {
      // Strategy 2: Try resolving via patient identifier resolver
      const resolved = await this.resolvePatientIdentifier(cleanInput);
      if (resolved && this.isValidUUID(resolved)) {
        actualPatientUUID = resolved;
        const { data: sessionByPatId } = await supabase
          .from("access_sessions")
          .select("*")
          .eq("patient_id", actualPatientUUID)
          .eq("otp", cleanOtp)
          .eq("is_active", true)
          .gte("expiry", currentTime)
          .maybeSingle();

        verifiedSession = sessionByPatId;
      }
    }

    if (!actualPatientUUID || !this.isValidUUID(actualPatientUUID)) {
      throw new Error(
        `Patient account not found for ID "${cleanInput}". Please verify the Patient ID or PAT-XXXXXX code.`
      );
    }

    if (!verifiedSession) {
      throw new Error("Invalid, revoked, or expired OTP for this Patient ID.");
    }

    const { data: patientProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email, patient_code")
      .eq("id", actualPatientUUID)
      .maybeSingle();

    return {
      session: verifiedSession,
      patient: patientProfile || {
        id: actualPatientUUID,
        full_name: "Patient Record",
        patient_code: `PAT-${actualPatientUUID.substring(0, 6).toUpperCase()}`,
      },
      resolvedPatientId: actualPatientUUID,
    };
  },

  // ============================
  // End / Terminate Patient Access Session (Doctor Side)
  // ============================
  async endPatientSession(sessionId) {
    const { error } = await supabase
      .from("access_sessions")
      .update({
        is_active: false,
      })
      .eq("id", sessionId);

    if (error) throw error;
    return true;
  },

  async endPatientSessionByPatientId(patientId) {
    const actualPatientUUID = await this.resolvePatientIdentifier(patientId);
    if (!actualPatientUUID) return false;

    const { error } = await supabase
      .from("access_sessions")
      .update({
        is_active: false,
      })
      .eq("patient_id", actualPatientUUID)
      .eq("is_active", true);

    if (error) throw error;
    return true;
  },

  // ============================
  // Authorized Patient History
  // ============================
  async getPatientMedicalHistory(patientId) {
    const actualPatientUUID = await this.resolvePatientIdentifier(patientId);
    if (!actualPatientUUID) return [];

    const { data, error } = await supabase
      .from("medical_records")
      .select(`
        *,
        doctor:profiles!medical_records_doctor_id_fkey(
          full_name
        )
      `)
      .eq("patient_id", actualPatientUUID)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPatientPrescriptions(patientId) {
    const actualPatientUUID = await this.resolvePatientIdentifier(patientId);
    if (!actualPatientUUID) return [];

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        *,
        doctor:profiles!prescriptions_doctor_id_fkey(
          full_name
        )
      `)
      .eq("patient_id", actualPatientUUID)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getPatientDetails(patientId) {
    const actualPatientUUID = await this.resolvePatientIdentifier(patientId);
    if (!actualPatientUUID) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", actualPatientUUID)
      .single();

    const { data: details } = await supabase
      .from("patient_details")
      .select("*")
      .eq("id", actualPatientUUID)
      .maybeSingle();

    return {
      ...profile,
      ...(details || {}),
      id: actualPatientUUID,
    };
  },

  // ============================
  // Add Records & Prescriptions
  // ============================
  async addMedicalRecord({ patientId, symptoms, diagnosis, notes }) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("Doctor not logged in");

    const targetUUID = await this.resolvePatientIdentifier(patientId);
    if (!targetUUID) {
      throw new Error(`Patient account not found for ID "${patientId}". Please check the Patient ID.`);
    }

    const { data, error } = await supabase
      .from("medical_records")
      .insert({
        patient_id: targetUUID,
        doctor_id: user.id,
        symptoms,
        diagnosis,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addPrescription({ patientId, medicines, dosage, duration, notes }) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("Doctor not logged in");

    const targetUUID = await this.resolvePatientIdentifier(patientId);
    if (!targetUUID) {
      throw new Error(`Patient account not found for ID "${patientId}". Please check the Patient ID.`);
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .insert({
        patient_id: targetUUID,
        doctor_id: user.id,
        medicines,
        dosage,
        duration,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================
  // Dashboard Stats
  // ============================
  async getDashboardStats() {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const [{ count: recordCount }, { count: prescriptionCount }, { data: allDoctorRecords }] = await Promise.all([
      supabase
        .from("medical_records")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", user.id),
      supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", user.id),
      supabase
        .from("medical_records")
        .select("patient_id")
        .eq("doctor_id", user.id),
    ]);

    const uniqueVisitedPatients = new Set((allDoctorRecords || []).map((r) => r.patient_id)).size;

    const { data: recentRecords } = await supabase
      .from("medical_records")
      .select(`
        *,
        patient:profiles!medical_records_patient_id_fkey(full_name, patient_code)
      `)
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      totalRecordsAdded: recordCount || 0,
      totalPrescriptionsAdded: prescriptionCount || 0,
      totalVisitedPatients: uniqueVisitedPatients || 0,
      recentRecords: recentRecords || [],
    };
  },

  // ============================
  // Visited Patients & Consultation History (Stored Records of Only Visited Patients)
  // ============================
  async getVisitedPatientsHistory() {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("Doctor not authenticated");

    // 1. Fetch all medical records documented by this doctor
    const { data: records, error: recError } = await supabase
      .from("medical_records")
      .select("*")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (recError) {
      console.warn("Notice fetching doctor medical records:", recError.message);
    }

    // 2. Fetch all prescriptions issued by this doctor
    const { data: prescriptions, error: rxError } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (rxError) {
      console.warn("Notice fetching doctor prescriptions:", rxError.message);
    }

    // 3. Fetch completed or confirmed appointments for this doctor
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", user.id)
      .in("status", ["completed", "Completed", "confirmed", "Confirmed"])
      .order("appointment_date", { ascending: false });

    if (apptError) {
      console.warn("Notice fetching doctor appointments:", apptError.message);
    }

    const safeRecords = records || [];
    const safeRx = prescriptions || [];
    const safeAppts = appointments || [];

    // Collect all unique patient IDs who visited this doctor
    const patientIdSet = new Set([
      ...safeRecords.map((r) => r.patient_id).filter(Boolean),
      ...safeRx.map((p) => p.patient_id).filter(Boolean),
      ...safeAppts.map((a) => a.patient_id).filter(Boolean),
    ]);

    const patientIds = Array.from(patientIdSet);

    if (patientIds.length === 0) {
      return {
        visits: [],
        uniquePatients: [],
        stats: {
          totalVisits: 0,
          uniquePatientCount: 0,
          totalPrescriptions: 0,
        },
      };
    }

    // 4. Retrieve patient profiles and details
    const [profilesRes, detailsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, patient_code, role, created_at")
        .in("id", patientIds),
      supabase
        .from("patient_details")
        .select("*")
        .in("id", patientIds),
    ]);

    const profileMap = (profilesRes.data || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const detailsMap = (detailsRes.data || []).reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {});

    const fullPatientMap = patientIds.reduce((acc, pid) => {
      const p = profileMap[pid] || {};
      const d = detailsMap[pid] || {};
      acc[pid] = {
        id: pid,
        full_name: p.full_name || "Patient Record",
        email: p.email || "N/A",
        patient_code: p.patient_code || `PAT-${pid.substring(0, 6).toUpperCase()}`,
        age: d.age || "N/A",
        blood_group: d.blood_group || "N/A",
        allergies: d.allergies || "None reported",
        emergency_contact: d.emergency_contact || "N/A",
        chronic_conditions: d.chronic_conditions || "None",
      };
      return acc;
    }, {});

    // 5. Structure visits from medical_records
    const visits = [];

    safeRecords.forEach((rec) => {
      // Find any prescriptions issued around this consultation
      const relatedRxs = safeRx.filter(
        (rx) =>
          rx.patient_id === rec.patient_id &&
          Math.abs(new Date(rx.created_at) - new Date(rec.created_at)) < 3600000 // within 1 hour
      );

      visits.push({
        id: rec.id,
        visitType: "Medical Consultation",
        patientId: rec.patient_id,
        patient: fullPatientMap[rec.patient_id],
        visitDateTime: rec.created_at,
        diagnosis: rec.diagnosis || "Clinical Examination",
        symptoms: rec.symptoms || "Routine check-up",
        notes: rec.notes || "",
        prescriptions: relatedRxs.map((r) => ({
          id: r.id,
          medicines: r.medicines,
          dosage: r.dosage,
          duration: r.duration,
          notes: r.notes,
        })),
        source: "medical_records",
      });
    });

    // 6. Add standalone prescriptions (if not already attached to a medical record)
    safeRx.forEach((rx) => {
      const alreadyAttached = visits.some(
        (v) =>
          v.patientId === rx.patient_id &&
          Math.abs(new Date(v.visitDateTime) - new Date(rx.created_at)) < 3600000
      );

      if (!alreadyAttached) {
        let parsedNotes = {};
        try {
          if (rx.notes && rx.notes.startsWith("{")) {
            parsedNotes = JSON.parse(rx.notes);
          }
        } catch {
          // ignore JSON parse error
        }

        visits.push({
          id: rx.id,
          visitType: "Prescription Issue",
          patientId: rx.patient_id,
          patient: fullPatientMap[rx.patient_id],
          visitDateTime: rx.created_at,
          diagnosis: parsedNotes.diagnosis || "Medical Treatment",
          symptoms: parsedNotes.chiefComplaints || "Under medical treatment",
          notes: parsedNotes.advice || rx.notes || "",
          prescriptions: [
            {
              id: rx.id,
              medicines: rx.medicines,
              dosage: rx.dosage,
              duration: rx.duration,
              notes: rx.notes,
            },
          ],
          source: "prescriptions",
        });
      }
    });

    // Sort all visits by visitDateTime descending (most recent first)
    visits.sort((a, b) => new Date(b.visitDateTime) - new Date(a.visitDateTime));

    // 7. Group into Unique Visited Patients directory
    const patientVisitsMap = visits.reduce((acc, v) => {
      if (!acc[v.patientId]) {
        acc[v.patientId] = [];
      }
      acc[v.patientId].push(v);
      return acc;
    }, {});

    const uniquePatients = patientIds.map((pid) => {
      const pVisits = patientVisitsMap[pid] || [];
      const latest = pVisits[0] || null;
      const oldest = pVisits[pVisits.length - 1] || null;

      return {
        patient: fullPatientMap[pid],
        totalVisits: pVisits.length,
        latestVisitDateTime: latest ? latest.visitDateTime : null,
        firstVisitDateTime: oldest ? oldest.visitDateTime : null,
        latestDiagnosis: latest ? latest.diagnosis : "Consultation",
        visits: pVisits,
      };
    });

    // Sort unique patients by latest visit date descending
    uniquePatients.sort((a, b) => {
      const timeA = a.latestVisitDateTime ? new Date(a.latestVisitDateTime).getTime() : 0;
      const timeB = b.latestVisitDateTime ? new Date(b.latestVisitDateTime).getTime() : 0;
      return timeB - timeA;
    });

    return {
      visits,
      uniquePatients,
      stats: {
        totalVisits: visits.length,
        uniquePatientCount: uniquePatients.length,
        totalPrescriptions: safeRx.length,
      },
    };
  },

  // ============================
  // Log / Record a Patient Consultation Visit
  // ============================
  async logPatientVisit({
    patientId,
    symptoms,
    diagnosis,
    notes,
    medicines = null,
    dosage = null,
    duration = null,
    advice = null,
  }) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("Doctor not authenticated");

    const resolvedPatientId = await this.resolvePatientIdentifier(patientId);
    if (!resolvedPatientId) throw new Error("Could not resolve Patient ID.");

    // 1. Create the Medical Consultation Record
    const { data: record, error: recError } = await supabase
      .from("medical_records")
      .insert({
        patient_id: resolvedPatientId,
        doctor_id: user.id,
        symptoms: symptoms || "General Consultation",
        diagnosis: diagnosis || "Clinical Assessment",
        notes: notes || "",
      })
      .select()
      .single();

    if (recError) throw recError;

    // 2. If medicines are prescribed, also issue structured prescription
    let prescription = null;
    if (medicines && medicines.trim()) {
      const rxNotesPayload = JSON.stringify({
        diagnosis: diagnosis || "",
        chiefComplaints: symptoms || "",
        clinicalFindings: notes || "",
        advice: advice || "",
      });

      const { data: rxData, error: rxError } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: resolvedPatientId,
          doctor_id: user.id,
          medicines: medicines.trim(),
          dosage: dosage || "1-0-1 (After Food)",
          duration: duration || "5 Days",
          notes: rxNotesPayload,
        })
        .select()
        .single();

      if (!rxError) {
        prescription = rxData;
      }
    }

    return {
      record,
      prescription,
      resolvedPatientId,
    };
  },
};

export default doctorService;
