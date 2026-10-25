import { supabase } from "../lib/supabase";
import authService from "./authService";

const labReportService = {
  // Helper to convert file to Base64 Data URL fallback if storage bucket is not configured
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  // ============================
  // Upload File to Supabase Storage
  // ============================
  async uploadFileToStorage(file, folderPath = "patient_reports") {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${folderPath}/${fileName}`;

    try {
      // 1. Attempt upload to 'medical_files' storage bucket in Supabase
      const { data, error } = await supabase.storage
        .from("medical_files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.warn("Supabase storage upload notice:", error.message);

        // If bucket is not created yet, fallback gracefully to Data URL for instant dev testing
        if (error.message?.toLowerCase().includes("not found") || error.message?.toLowerCase().includes("bucket")) {
          const fallbackDataUrl = await this.readFileAsDataURL(file);
          return {
            fileUrl: fallbackDataUrl,
            fileName: file.name,
            filePath: filePath,
            fileType: file.type,
            isFallback: true,
          };
        }
        throw error;
      }

      // 2. Get Public URL
      const { data: urlData } = supabase.storage
        .from("medical_files")
        .getPublicUrl(filePath);

      return {
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        filePath: filePath,
        fileType: file.type,
      };
    } catch (err) {
      console.warn("Storage upload fallback engaged:", err.message);
      const fallbackDataUrl = await this.readFileAsDataURL(file);
      return {
        fileUrl: fallbackDataUrl,
        fileName: file.name,
        filePath: filePath,
        fileType: file.type,
        isFallback: true,
      };
    }
  },

  // ============================
  // Create Lab Report Metadata
  // ============================
  async createLabReport({ title, category, file, notes, patientId = null }) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const targetPatientId = patientId || user.id;

    // 1. Upload to storage (with automatic Base64 fallback if bucket is missing)
    const uploadRes = await this.uploadFileToStorage(file, `reports/${targetPatientId}`);

    // 2. Insert metadata record into DB
    const { data, error } = await supabase
      .from("lab_reports")
      .insert({
        patient_id: targetPatientId,
        doctor_id: user.id !== targetPatientId ? user.id : null,
        title,
        category: category || "Lab Report",
        file_url: uploadRes.fileUrl,
        file_name: uploadRes.fileName,
        file_type: uploadRes.fileType,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================
  // Fetch Patient Lab Reports
  // ============================
  async getPatientLabReports(patientId = null) {
    const user = await authService.getCurrentUser();
    const targetPatientId = patientId || user?.id;

    if (!targetPatientId) throw new Error("Patient ID missing");

    const { data, error } = await supabase
      .from("lab_reports")
      .select(`
        *,
        doctor:profiles!lab_reports_doctor_id_fkey(full_name)
      `)
      .eq("patient_id", targetPatientId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ============================
  // Delete Lab Report
  // ============================
  async deleteLabReport(reportId) {
    const { error } = await supabase
      .from("lab_reports")
      .delete()
      .eq("id", reportId);

    if (error) throw error;
    return true;
  },
};

export default labReportService;
