import { supabase } from "../lib/supabase";
import authService from "./authService";

const patientService = {
  // Helper to generate unique 6-digit Patient Code
  generateShortPatientCode() {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    return `PAT-${randomDigits}`;
  },

  // ============================
  // Complete Patient Profile
  // ============================
  async getPatientProfile() {
    const user = await authService.getCurrentUser();

    if (!user) throw new Error("User not found");

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    // Auto-generate patient_code if missing
    if (!profile.patient_code && profile.role === "patient") {
      const newCode = this.generateShortPatientCode();

      const { data: updatedProfile } = await supabase
        .from("profiles")
        .update({ patient_code: newCode })
        .eq("id", user.id)
        .select()
        .single();

      if (updatedProfile) {
        profile = updatedProfile;
      } else {
        profile.patient_code = newCode;
      }
    }

    // Get patient details
    const { data: details, error: detailsError } = await supabase
      .from("patient_details")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (detailsError) throw detailsError;

    return {
      ...profile,
      ...(details || {}),
    };
  },

  // ============================
  // Medical Records
  // ============================
  async getMedicalRecords() {
    const user = await authService.getCurrentUser();

    if (!user) throw new Error("User not found");

    const { data, error } = await supabase
      .from("medical_records")
      .select(`
        *,
        doctor:profiles!medical_records_doctor_id_fkey(
          full_name
        )
      `)
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  // ============================
  // Delete Medical Record
  // ============================
  async deleteMedicalRecord(recordId) {
    const user = await authService.getCurrentUser();

    if (!user) {
      throw new Error("User not found. Please log in again.");
    }

    if (!recordId) {
      throw new Error("Medical record ID is required.");
    }

    const { data, error } = await supabase
      .from("medical_records")
      .delete()
      .eq("id", recordId)
      .eq("patient_id", user.id)
      .select("id");

    if (error) {
      throw new Error(`Could not delete medical record: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        "Record was not deleted. Check your permissions or confirm that the record belongs to you."
      );
    }

    return true;
  },

  // ============================
  // Prescriptions
  // ============================
  async getPrescriptions() {
    const user = await authService.getCurrentUser();

    if (!user) throw new Error("User not found");

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        *,
        doctor:profiles!prescriptions_doctor_id_fkey(
          full_name
        )
      `)
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  // ============================
  // Active Access Sessions
  // ============================
  async getAccessSessions() {
    const user = await authService.getCurrentUser();

    if (!user) throw new Error("User not found");

    const { data, error } = await supabase
      .from("access_sessions")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  // ============================
  // Generate OTP
  // ============================
  async generateOTP({ otp, scope, expiry }) {
    const user = await authService.getCurrentUser();

    if (!user) throw new Error("User not found");

    const { data, error } = await supabase
      .from("access_sessions")
      .insert({
        patient_id: user.id,
        otp,
        scope,
        expiry,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  // ============================
  // Revoke OTP
  // ============================
  async revokeAccess(sessionId) {
    const { error } = await supabase
      .from("access_sessions")
      .update({
        is_active: false,
      })
      .eq("id", sessionId);

    if (error) throw error;

    return true;
  },

  // ============================
  // Dashboard Statistics
  // ============================
  async getDashboardStats() {
    const [records, prescriptions, sessions] = await Promise.all([
      this.getMedicalRecords(),
      this.getPrescriptions(),
      this.getAccessSessions(),
    ]);

    return {
      totalRecords: records.length,
      totalPrescriptions: prescriptions.length,
      activeSessions: sessions.filter(
        (s) => s.is_active && new Date(s.expiry) > new Date()
      ).length,
    };
  },

  // ==============================
  // Update Patient Profile
  // ==============================
  async updatePatientProfile(profileData) {
    const user = await authService.getCurrentUser();

    if (!user) throw new Error("User not found");

    const payload = {
      id: user.id,
      age: profileData.age ? parseInt(profileData.age, 10) : null,
      blood_group: profileData.blood_group,
      allergies: profileData.allergies,
      emergency_contact: profileData.emergency_contact,
      chronic_conditions: profileData.chronic_conditions,
      updated_at: new Date().toISOString(),
    };

    // 1. Try full upsert
    const { error } = await supabase
      .from("patient_details")
      .upsert(payload);

    if (error) {
      console.warn("Patient details full upsert notice:", error.message);

      // 2. If a column is missing, fallback to core columns
      if (error.message?.includes("column") || error.code === "PGRST204") {
        const { error: fallbackError } = await supabase
          .from("patient_details")
          .upsert({
            id: user.id,
            age: profileData.age ? parseInt(profileData.age, 10) : null,
            blood_group: profileData.blood_group,
            allergies: profileData.allergies,
          });

        if (fallbackError) throw fallbackError;
        return true;
      }

      throw error;
    }

    return true;
  },
};

export default patientService;