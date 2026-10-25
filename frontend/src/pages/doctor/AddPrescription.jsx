import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Pill, Save, CheckCircle2, AlertCircle, ArrowLeft, User, Clock, Stethoscope, Sparkles, FileText, Activity, Calendar } from "lucide-react";

import DoctorLayout from "../../layouts/DoctorLayout";
import PageHeader from "../../components/common/PageHeader";
import doctorService from "../../services/doctorService";

function AddPrescription() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [clinicalFindings, setClinicalFindings] = useState("");
  const [medicines, setMedicines] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const paramId = searchParams.get("patientId");
    if (paramId) {
      setPatientId(paramId);
    }
  }, [searchParams]);

  const handleQuickDosage = (code) => {
    setDosage(code);
  };

  const handleQuickDuration = (dur) => {
    setDuration(dur);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) {
      setToast({ type: "error", text: "Please provide a valid Patient ID." });
      return;
    }

    try {
      setSaving(true);

      // Combine structured clinical data into notes string for backwards compatibility
      const fullNotesPayload = JSON.stringify({
        diagnosis,
        chiefComplaints,
        clinicalFindings,
        advice,
        followUpDate,
      });

      await doctorService.addPrescription({
        patientId,
        medicines,
        dosage,
        duration,
        notes: fullNotesPayload,
      });

      setToast({ type: "success", text: "Official Hospital Prescription issued successfully!" });
      setMedicines("");
      setDosage("");
      setDuration("");
      setDiagnosis("");
      setChiefComplaints("");
      setClinicalFindings("");
      setAdvice("");
      setFollowUpDate("");

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
    <DoctorLayout title="Add Prescription">
      <PageHeader
        title="Official Hospital Rx Prescription Writer"
        subtitle="Issue official digital prescriptions with Chief Complaints, Clinical Findings, Diagnosis, Medicines, and Advice."
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
        <form onSubmit={handleSave} className="space-y-6">
          {/* Patient ID */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <User size={14} className="text-emerald-600" />
              Patient Unique ID / Short Code (e.g. PAT-839201)
            </label>
            <input
              type="text"
              placeholder="e.g. PAT-839201 or 9b1deb4d-3b7d-..."
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm font-mono font-bold text-slate-900"
            />
          </div>

          {/* Chief Complaints & Clinical Findings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Chief Complaints
              </label>
              <textarea
                rows="3"
                placeholder="* FEVER WITH CHILLS (4 DAYS)&#10;* HEADACHE (2 DAYS)"
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Clinical Findings & Test Observations
              </label>
              <textarea
                rows="3"
                placeholder="* TEST FINDINGS FOR PATIENT&#10;* ENTERING DIAGNOSIS OBSERVATION"
                value={clinicalFindings}
                onChange={(e) => setClinicalFindings(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Primary Diagnosis */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Diagnosis
            </label>
            <input
              type="text"
              placeholder="e.g. MALARIA / ACUTE FEBRILE ILLNESS"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm font-bold text-slate-900 uppercase"
            />
          </div>

          {/* Prescribed Medicines */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <Pill size={14} className="text-emerald-600" />
              Prescribed Medicines (Format: 1) TAB. NAME, 2) TAB. NAME...)
            </label>
            <textarea
              rows="4"
              placeholder="1) TAB. ABCIXIMAB&#10;2) TAB. VOMILAST (DOXYLAMINE 10MG + PYRIDOXINE 10 MG)&#10;3) CAP. ZOCLAR 500"
              value={medicines}
              onChange={(e) => setMedicines(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm font-bold text-slate-900"
            />
          </div>

          {/* Dosage & Duration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Dosage Schedule
              </label>
              <input
                type="text"
                placeholder="e.g. 1 Morning, 1 Night (After Food)"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm font-bold text-slate-900 mb-2"
              />

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDosage("1 Morning, 1 Night (After Food)")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-bold rounded-lg transition"
                >
                  1 Morning, 1 Night (After Food)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDosage("1 Morning")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-bold rounded-lg transition"
                >
                  1 Morning
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDosage("1 Night")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-bold rounded-lg transition"
                >
                  1 Night
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Duration & Total Count
              </label>
              <input
                type="text"
                placeholder="e.g. 8 Days (Tot: 16 Tab)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm font-bold text-slate-900 mb-2"
              />

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDuration("3 Days (Tot: 3 Cap)")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold rounded-lg transition"
                >
                  3 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration("4 Days (Tot: 4 Tab)")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold rounded-lg transition"
                >
                  4 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration("8 Days (Tot: 16 Tab)")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-bold rounded-lg transition"
                >
                  8 Days
                </button>
              </div>
            </div>
          </div>

          {/* Advice & Follow Up Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Physician Advice & Diet Guidance
              </label>
              <textarea
                rows="3"
                placeholder="* TAKE BED REST&#10;* DO NOT EAT OUTSIDE FOOD&#10;* EAT EASY TO DIGEST FOOD LIKE BOILED RICE WITH DAAL"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                <Calendar size={14} className="text-blue-600" />
                Follow Up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-emerald-600 text-sm text-slate-900 font-bold"
              />
            </div>
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
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? "Issuing Hospital Rx..." : "Issue Official Hospital Prescription"}
            </button>
          </div>
        </form>
      </div>
    </DoctorLayout>
  );
}

export default AddPrescription;