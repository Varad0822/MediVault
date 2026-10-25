import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FileText, Save, CheckCircle2, AlertCircle, ArrowLeft, User } from "lucide-react";

import DoctorLayout from "../../layouts/DoctorLayout";
import PageHeader from "../../components/common/PageHeader";
import doctorService from "../../services/doctorService";

function AddMedicalRecord() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patientId, setPatientId] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const paramId = searchParams.get("patientId");
    if (paramId) {
      setPatientId(paramId);
    }
  }, [searchParams]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) {
      setToast({ type: "error", text: "Please provide a valid Patient ID." });
      return;
    }

    try {
      setSaving(true);
      await doctorService.addMedicalRecord({
        patientId,
        symptoms,
        diagnosis,
        notes,
      });

      setToast({ type: "success", text: "Medical record successfully logged!" });
      setSymptoms("");
      setDiagnosis("");
      setNotes("");

      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DoctorLayout title="Add Medical Record">
      <PageHeader
        title="Clinical Consultation Entry"
        subtitle="Log patient symptoms, formal medical diagnosis, and physician clinical notes."
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

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <User size={14} className="text-blue-600" />
              Patient Unique ID
            </label>
            <input
              type="text"
              placeholder="e.g. 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Reported Symptoms & Patient Complaints
            </label>
            <textarea
              rows="3"
              placeholder="Describe symptoms observed or stated by the patient (e.g. Persistent fever, cough for 3 days, fatigue)..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Physician Diagnosis / Clinical Finding
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Acute Upper Respiratory Tract Infection (ICD-10 J06.9)"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Physician Clinical Notes & Recommendations
            </label>
            <textarea
              rows="4"
              placeholder="Additional medical observations, lab test recommendations, follow-up instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm text-slate-900"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? "Saving Record..." : "Save Medical Record"}
            </button>
          </div>
        </form>
      </div>
    </DoctorLayout>
  );
}

export default AddMedicalRecord;