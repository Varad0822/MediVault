import { supabase } from "../lib/supabase";
import authService from "./authService";

const appointmentService = {
  // ============================
  // List Available Doctors (Resilient & Case-Insensitive)
  // ============================
  async getAvailableDoctors() {
    const { data: profiles, error: docError } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["doctor", "Doctor", "DOCTOR"]);

    if (docError) {
      console.warn("Error fetching doctor profiles:", docError.message);
      return [];
    }

    if (!profiles || profiles.length === 0) return [];

    const doctorIds = profiles.map((p) => p.id);

    const { data: detailsList } = await supabase
      .from("doctor_details")
      .select("*")
      .in("id", doctorIds);

    const detailsMap = (detailsList || []).reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {});

    return profiles.map((doc) => {
      const detailsObj = detailsMap[doc.id] || {};
      return {
        id: doc.id,
        full_name: doc.full_name,
        email: doc.email,
        specialization: detailsObj?.specialization || "General Practitioner",
        hospital_name: detailsObj?.hospital_name || "General Clinic",
        license_number: detailsObj?.license_number || "Verified License",
        contact_number: detailsObj?.contact_number || "N/A",
        experience_years: detailsObj?.experience_years || 0,
      };
    });
  },

  // ============================
  // Book Appointment (Patient)
  // ============================
  async bookAppointment({ doctorId, appointmentDate, appointmentTime, reason }) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: user.id,
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================
  // Patient Appointments (Direct Query - Independent of FK Naming)
  // ============================
  async getPatientAppointments() {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", user.id)
      .order("appointment_date", { ascending: true });

    if (error) throw error;
    if (!appointments || appointments.length === 0) return [];

    const doctorIds = [...new Set(appointments.map((a) => a.doctor_id))];

    const { data: doctorProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", doctorIds);

    const { data: doctorDetails } = await supabase
      .from("doctor_details")
      .select("*")
      .in("id", doctorIds);

    const docMap = (doctorProfiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const detailsMap = (doctorDetails || []).reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {});

    return appointments.map((app) => ({
      ...app,
      doctor: {
        ...(docMap[app.doctor_id] || { full_name: "Physician" }),
        details: detailsMap[app.doctor_id] || {},
      },
    }));
  },

  // ============================
  // Doctor Appointments (Direct Query - Independent of FK Naming)
  // ============================
  async getDoctorAppointments() {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", user.id)
      .order("appointment_date", { ascending: true });

    if (error) throw error;
    if (!appointments || appointments.length === 0) return [];

    const patientIds = [...new Set(appointments.map((a) => a.patient_id))];

    const { data: patientProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, patient_code")
      .in("id", patientIds);

    const { data: patientDetails } = await supabase
      .from("patient_details")
      .select("*")
      .in("id", patientIds);

    const patMap = (patientProfiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const detailsMap = (patientDetails || []).reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {});

    return appointments.map((app) => ({
      ...app,
      patient: {
        ...(patMap[app.patient_id] || { full_name: "Patient" }),
        details: detailsMap[app.patient_id] || {},
      },
    }));
  },

  // ============================
  // Update Appointment Status
  // ============================
  async updateAppointmentStatus(appointmentId, status, notes = null) {
    const updateData = { status };
    if (notes) updateData.notes = notes;

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default appointmentService;
