import { supabase } from "../lib/supabase";
import authService from "./authService";

const vitalsService = {
  // ============================
  // Log Vitals Entry
  // ============================
  async logVitals({
    bloodPressureSys,
    bloodPressureDia,
    heartRate,
    bloodSugar,
    weightKg,
    temperatureF,
    notes,
    patientId = null,
  }) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const targetPatientId = patientId || user.id;

    const { data, error } = await supabase
      .from("health_vitals")
      .insert({
        patient_id: targetPatientId,
        blood_pressure_sys: bloodPressureSys ? parseInt(bloodPressureSys, 10) : null,
        blood_pressure_dia: bloodPressureDia ? parseInt(bloodPressureDia, 10) : null,
        heart_rate: heartRate ? parseInt(heartRate, 10) : null,
        blood_sugar: bloodSugar ? parseInt(bloodSugar, 10) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        temperature_f: temperatureF ? parseFloat(temperatureF) : null,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================
  // Get Patient Vitals History
  // ============================
  async getPatientVitals(patientId = null) {
    const user = await authService.getCurrentUser();
    const targetPatientId = patientId || user?.id;

    if (!targetPatientId) throw new Error("Patient ID missing");

    const { data, error } = await supabase
      .from("health_vitals")
      .select("*")
      .eq("patient_id", targetPatientId)
      .order("recorded_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ============================
  // Get Latest Vitals Record
  // ============================
  async getLatestVitals(patientId = null) {
    const records = await this.getPatientVitals(patientId);
    return records.length > 0 ? records[0] : null;
  },

  // ============================
  // Delete Vitals Entry
  // ============================
  async deleteVitalsEntry(vitalsId) {
    const { error } = await supabase
      .from("health_vitals")
      .delete()
      .eq("id", vitalsId);

    if (error) throw error;
    return true;
  },
};

export default vitalsService;
