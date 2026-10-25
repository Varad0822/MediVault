import { useEffect, useState } from "react";
import { User, Heart, AlertCircle, Phone, Save, CheckCircle2, Shield, Key, Copy, Check } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";

import patientService from "../../services/patientService";

function PatientProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    role: "",
    patient_code: "",
    age: "",
    blood_group: "",
    allergies: "",
    emergency_contact: "",
    chronic_conditions: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await patientService.getPatientProfile();

      setForm({
        full_name: data.full_name || "",
        role: data.role || "",
        patient_code: data.patient_code || "PAT-839201",
        age: data.age || "",
        blood_group: data.blood_group || "",
        allergies: data.allergies || "",
        emergency_contact: data.emergency_contact || "",
        chronic_conditions: data.chronic_conditions || "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await patientService.updatePatientProfile(form);
      setToast({ type: "success", text: "Medical profile updated successfully!" });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  const copyPatientCode = () => {
    if (!form.patient_code) return;
    navigator.clipboard.writeText(form.patient_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return <Loader fullScreen text="Loading Patient Medical Profile..." />;
  }

  return (
    <PatientLayout title="Patient Medical Profile">
      <PageHeader
        title="Medical & Emergency Profile"
        subtitle="Keep your critical medical information, emergency contacts, and allergies up to date."
      />

      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm font-semibold border ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Readonly Identity Section */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <Key size={14} className="text-purple-600" />
                Short Patient Unique ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.patient_code}
                  disabled
                  className="w-full border border-slate-200 rounded-xl p-3 bg-purple-50 text-purple-900 font-mono font-black text-sm cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={copyPatientCode}
                  className="p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition text-slate-700 shrink-0"
                  title="Copy Patient ID"
                >
                  {copiedCode ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <User size={14} className="text-blue-600" />
                Full Registered Name
              </label>
              <input
                type="text"
                value={form.full_name}
                disabled
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                <Shield size={14} className="text-blue-600" />
                Account Authorization Role
              </label>
              <input
                type="text"
                value={form.role ? `${form.role.toUpperCase()} (Verified)` : "PATIENT"}
                disabled
                className="w-full border border-slate-200 rounded-xl p-3 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed text-sm"
              />
            </div>
          </div>

          {/* Vitals & Medical Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Age (Years)
              </label>
              <input
                type="number"
                name="age"
                placeholder="e.g. 32"
                value={form.age}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Blood Group
              </label>
              <select
                name="blood_group"
                value={form.blood_group}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm text-slate-900 bg-white"
              >
                <option value="">Select Blood Type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <Phone size={14} className="text-rose-500" />
              Emergency Contact (Phone & Relation)
            </label>
            <input
              type="text"
              name="emergency_contact"
              placeholder="e.g. +1 555-0192 (Spouse)"
              value={form.emergency_contact}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm text-slate-900"
            />
          </div>

          {/* Known Allergies */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <AlertCircle size={14} className="text-amber-500" />
              Known Allergies (Food, Penicillin, Latex, etc.)
            </label>
            <textarea
              rows="3"
              name="allergies"
              placeholder="List any medication or environmental allergies..."
              value={form.allergies}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm text-slate-900"
            />
          </div>

          {/* Chronic Conditions */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <Heart size={14} className="text-purple-500" />
              Pre-existing Conditions / Medical Notes
            </label>
            <textarea
              rows="3"
              name="chronic_conditions"
              placeholder="e.g. Asthma, Hypertension, Type 2 Diabetes..."
              value={form.chronic_conditions}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition text-sm text-slate-900"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? "Saving Changes..." : "Save Medical Profile"}
            </button>
          </div>
        </form>
      </div>
    </PatientLayout>
  );
}

export default PatientProfile;