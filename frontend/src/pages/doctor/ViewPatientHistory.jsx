import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FileText, Pill, User, Heart, AlertCircle, ArrowLeft, Stethoscope, Calendar, PlusCircle, Download, FileCode, FolderOpen, Activity, XCircle } from "lucide-react";

import DoctorLayout from "../../layouts/DoctorLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import doctorService from "../../services/doctorService";
import labReportService from "../../services/labReportService";
import vitalsService from "../../services/vitalsService";

function ViewPatientHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [patientDetails, setPatientDetails] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [vitalsList, setVitalsList] = useState([]);
  const [activeTab, setActiveTab] = useState("records");

  useEffect(() => {
    if (patientId) {
      loadPatientHistory();
    }
  }, [patientId]);

  async function loadPatientHistory() {
    try {
      setLoading(true);
      const resolvedUUID = await doctorService.resolvePatientIdentifier(patientId);
      if (!resolvedUUID) {
        alert(`No patient record found for "${patientId}". Please verify the Patient ID or code.`);
        navigate("/doctor-access");
        return;
      }

      const [details, records, rxs, reports, vitals] = await Promise.all([
        doctorService.getPatientDetails(resolvedUUID),
        doctorService.getPatientMedicalHistory(resolvedUUID),
        doctorService.getPatientPrescriptions(resolvedUUID),
        labReportService.getPatientLabReports(resolvedUUID),
        vitalsService.getPatientVitals(resolvedUUID),
      ]);

      setPatientDetails(details);
      setMedicalRecords(records);
      setPrescriptions(rxs);
      setLabReports(reports);
      setVitalsList(vitals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleEndSession = async () => {
    if (!window.confirm("Are you sure you want to end this patient consultation session now? Access will be terminated.")) {
      return;
    }

    try {
      setEnding(true);
      await doctorService.endPatientSessionByPatientId(patientId);
      alert("Consultation session ended and patient access terminated.");
      navigate("/doctor-access");
    } catch (err) {
      console.error(err);
      alert("Failed to end session: " + err.message);
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading Authorized Patient File..." />;
  }

  return (
    <DoctorLayout title="Patient Medical Record File">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
        >
          <ArrowLeft size={16} /> Back to Doctor Access
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleEndSession}
            disabled={ending}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <XCircle size={15} />
            {ending ? "Ending..." : "End Consultation Session"}
          </button>
          <Link
            to={`/add-record?patientId=${patientId}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <PlusCircle size={15} /> Add Record
          </Link>
          <Link
            to={`/add-prescription?patientId=${patientId}`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Pill size={15} /> Issue Prescription
          </Link>
        </div>
      </div>

      {/* Patient Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl mb-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg">
              {patientDetails?.full_name?.charAt(0) || "P"}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">
                {patientDetails?.full_name || "Patient Record"}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                ID: {patientDetails?.patient_code || patientId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
            <div>
              <span className="text-slate-400 block font-bold uppercase">Age</span>
              <span className="font-semibold text-white">{patientDetails?.age || "Not Set"}</span>
            </div>
            <div className="border-l border-slate-700 pl-4">
              <span className="text-slate-400 block font-bold uppercase">Blood Group</span>
              <span className="font-bold text-teal-300">{patientDetails?.blood_group || "Not Set"}</span>
            </div>
            <div className="border-l border-slate-700 pl-4">
              <span className="text-slate-400 block font-bold uppercase">Known Allergies</span>
              <span className="font-semibold text-rose-300">{patientDetails?.allergies || "None"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("records")}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === "records"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <FileText size={18} /> Medical Consultation Logs ({medicalRecords.length})
        </button>

        <button
          onClick={() => setActiveTab("prescriptions")}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === "prescriptions"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Pill size={18} /> Issued Prescriptions ({prescriptions.length})
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === "reports"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <FolderOpen size={18} /> Lab Reports & Scans ({labReports.length})
        </button>

        <button
          onClick={() => setActiveTab("vitals")}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === "vitals"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Activity size={18} /> Vitals & Health Metrics ({vitalsList.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "records" && (
        medicalRecords.length === 0 ? (
          <EmptyState title="No Medical Records" description="No medical logs have been added for this patient yet." />
        ) : (
          <div className="space-y-4">
            {medicalRecords.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-slate-900 text-base">{rec.diagnosis}</h3>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar size={13} /> {new Date(rec.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mb-2">
                  <strong className="text-slate-900">Symptoms:</strong> {rec.symptoms}
                </p>
                {rec.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                    Physician Note: "{rec.notes}"
                  </p>
                )}
                <p className="text-xs text-blue-600 font-semibold mt-3">
                  Attending Doctor: Dr. {rec.doctor?.full_name || "Doctor"}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "prescriptions" && (
        prescriptions.length === 0 ? (
          <EmptyState title="No Prescriptions" description="No prescriptions have been issued to this patient yet." />
        ) : (
          <div className="space-y-4">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-extrabold text-slate-900 text-base">{rx.medicines}</h3>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar size={13} /> {new Date(rx.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2 text-xs font-semibold mb-2">
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">Dosage: {rx.dosage}</span>
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">Duration: {rx.duration}</span>
                </div>
                {rx.notes && <p className="text-xs text-slate-600 italic">Instructions: {rx.notes}</p>}
                <p className="text-xs text-emerald-600 font-semibold mt-3">
                  Prescribing Doctor: Dr. {rx.doctor?.full_name || "Doctor"}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "reports" && (
        labReports.length === 0 ? (
          <EmptyState title="No Lab Reports" description="Patient has not uploaded any lab test documents or X-rays." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {labReports.map((report) => (
              <div key={report.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{report.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      {report.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mb-3">{report.file_name}</p>
                  {report.notes && <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic mb-4">"{report.notes}"</p>}
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString()}</span>
                  <a
                    href={report.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Download size={14} /> Open / Download File
                  </a>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === "vitals" && (
        vitalsList.length === 0 ? (
          <EmptyState title="No Vitals History" description="No vitals readings recorded for this patient." />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                  <th className="p-3">Recorded Date</th>
                  <th className="p-3">Blood Pressure</th>
                  <th className="p-3">Heart Rate</th>
                  <th className="p-3">Blood Sugar</th>
                  <th className="p-3">Weight (kg)</th>
                  <th className="p-3">Temp (°F)</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {vitalsList.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-semibold">{new Date(v.recorded_at).toLocaleString()}</td>
                    <td className="p-3 font-bold text-blue-600">{v.blood_pressure_sys ? `${v.blood_pressure_sys}/${v.blood_pressure_dia} mmHg` : "--"}</td>
                    <td className="p-3 font-bold text-rose-600">{v.heart_rate ? `${v.heart_rate} BPM` : "--"}</td>
                    <td className="p-3 font-bold text-purple-600">{v.blood_sugar ? `${v.blood_sugar} mg/dL` : "--"}</td>
                    <td className="p-3 font-semibold">{v.weight_kg ? `${v.weight_kg} kg` : "--"}</td>
                    <td className="p-3 font-semibold text-amber-700">{v.temperature_f ? `${v.temperature_f} °F` : "--"}</td>
                    <td className="p-3 text-slate-500 truncate max-w-xs">{v.notes || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </DoctorLayout>
  );
}

export default ViewPatientHistory;
