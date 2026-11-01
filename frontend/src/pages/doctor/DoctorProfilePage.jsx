import { useEffect, useState } from "react";
import {
  Stethoscope,
  Building2,
  Award,
  Phone,
  Clock,
  Save,
  CheckCircle2,
  UserCheck,
  X,
  ShieldCheck,
  Activity,
} from "lucide-react";

import DoctorLayout from "../../layouts/DoctorLayout";
import Loader from "../../components/common/Loader";
import doctorService from "../../services/doctorService";

function DoctorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    specialization: "",
    hospital_name: "",
    license_number: "",
    contact_number: "",
    experience_years: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const profileData = await doctorService.getDoctorProfile();
      setDoctorProfile(profileData);
      setForm({
        full_name: profileData.full_name || "",
        specialization: profileData.specialization || "",
        hospital_name: profileData.hospital_name || "",
        license_number: profileData.license_number || "",
        contact_number: profileData.contact_number || "",
        experience_years: profileData.experience_years || "",
      });
    } catch (err) {
      console.error("Error loading profile:", err);
      showToast("error", err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await doctorService.updateDoctorProfile(form);
      setDoctorProfile((prev) => ({ ...prev, ...form }));
      showToast("success", "Doctor credentials and profile updated successfully!");
    } catch (err) {
      console.error(err);
      showToast("error", err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading Doctor Profile..." />;
  }

  return (
    <DoctorLayout title="Doctor Profile">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Doctor Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your professional credentials and clinic information displayed on prescriptions and consultation slips.
          </p>
        </div>
        {/* Profile Summary Badge */}
        {doctorProfile && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-blue-600/20">
              {(doctorProfile.full_name || "D").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">
                Dr. {doctorProfile.full_name || "Doctor"}
              </p>
              <p className="text-xs text-blue-700 font-semibold">
                {doctorProfile.specialization || "Physician"} •{" "}
                {doctorProfile.hospital_name || "Healthcare Clinic"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-xs font-bold border animate-in fade-in ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="max-w-4xl space-y-6">
        {/* Credentials Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UserCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Physician Credentials &amp; Professional Profile
              </h3>
              <p className="text-xs text-slate-500">
                This information is displayed on patient prescriptions, consultation slips, and appointment agendas.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Readonly Verified Name */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <UserCheck size={14} className="text-blue-600" />
                Verified Physician Name (from account)
              </label>
              <input
                type="text"
                value={`Dr. ${form.full_name || doctorProfile?.full_name || "Doctor"}`}
                disabled
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-100 text-slate-700 font-bold cursor-not-allowed text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                Name is locked to your verified account identity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Specialization */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Stethoscope size={14} className="text-blue-600" />
                  Medical Specialization
                </label>
                <input
                  type="text"
                  name="specialization"
                  placeholder="e.g. Cardiology, Internal Medicine, Pediatrics"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>

              {/* Hospital Name */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Building2 size={14} className="text-blue-600" />
                  Hospital / Clinical Affiliation
                </label>
                <input
                  type="text"
                  name="hospital_name"
                  placeholder="e.g. Apollo Multi-Specialty Hospital, Pune"
                  value={form.hospital_name}
                  onChange={(e) => setForm({ ...form, hospital_name: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>

              {/* License Number */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Award size={14} className="text-purple-600" />
                  Medical Board Registration Number
                </label>
                <input
                  type="text"
                  name="license_number"
                  placeholder="e.g. MMC-2018-84920"
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Phone size={14} className="text-emerald-600" />
                  Clinic Contact Telephone
                </label>
                <input
                  type="text"
                  name="contact_number"
                  placeholder="e.g. +91 98220 12345"
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
                />
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                <Clock size={14} className="text-amber-600" />
                Years of Clinical Practice Experience
              </label>
              <input
                type="number"
                name="experience_years"
                placeholder="e.g. 12"
                value={form.experience_years}
                onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                className="w-full md:w-48 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? "Saving Credentials..." : "Save Professional Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Professional Summary Card (read-only display) */}
        {doctorProfile && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-blue-600" />
              <h4 className="font-extrabold text-slate-900 text-sm">Current Profile Summary</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Specialization", value: doctorProfile.specialization || "Not Set" },
                { label: "Hospital", value: doctorProfile.hospital_name || "Not Set" },
                { label: "Reg. No.", value: doctorProfile.license_number || "Not Set" },
                { label: "Contact", value: doctorProfile.contact_number || "Not Set" },
                { label: "Experience", value: doctorProfile.experience_years ? `${doctorProfile.experience_years} Years` : "Not Set" },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DoctorLayout>
  );
}

export default DoctorProfilePage;
