import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FileText,
  Pill,
  ArrowLeft,
  Calendar,
  PlusCircle,
  Download,
  FolderOpen,
  Activity,
  XCircle,
  ShieldCheck,
} from "lucide-react";

import DoctorLayout from "../../layouts/DoctorLayout";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import ExtractedRecordView from "../../components/records/ExtractedRecordView";
import doctorService from "../../services/doctorService";
import labReportService from "../../services/labReportService";
import vitalsService from "../../services/vitalsService";
import { normalizeScope } from "../../services/accessScope";

const TAB_DEFS = [
  {
    key: "records",
    label: "Medical Consultation Logs",
    icon: FileText,
    active: "border-blue-600 text-blue-600",
  },
  {
    key: "prescriptions",
    label: "Issued Prescriptions",
    icon: Pill,
    active: "border-emerald-600 text-emerald-600",
  },
  {
    key: "reports",
    label: "Lab Reports & Scans",
    icon: FolderOpen,
    active: "border-purple-600 text-purple-600",
  },
  {
    key: "vitals",
    label: "Vitals & Health Metrics",
    icon: Activity,
    active: "border-rose-600 text-rose-600",
  },
];

const SCOPE_LABELS = {
  records: "medical records",
  prescriptions: "prescriptions",
  reports: "lab reports",
  vitals: "vitals",
};

function attendingLabel(rec) {
  const extractedData = rec.extracted_data;

  if (extractedData) {
    return `Uploaded by patient (${extractedData.doctorName ||
      extractedData.hospital ||
      "source document"
      })`;
  }

  return `Attending Doctor: Dr. ${rec.doctor?.full_name || "Doctor"
    }`;
}

// Imported medicines are historical information extracted from a patient's uploaded
// document. They are intentionally not treated as doctor-issued prescriptions.
function getImportedMedications(rec) {
  const medications = rec?.extracted_data?.medications;
  return Array.isArray(medications)
    ? medications.filter((med) => med && (med.name || med.dosage || med.frequency || med.duration))
    : [];
}

function ViewPatientHistory() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [allowed, setAllowed] = useState(new Set());
  const [patientDetails, setPatientDetails] = useState(null);

  const [medicalRecords, setMedicalRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [vitalsList, setVitalsList] = useState([]);

  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    if (!patientId) {
      setLoadError("Patient ID is missing from the URL.");
      setLoading(false);
      return;
    }

    loadPatientHistory();

    // Reload when the patient ID in the URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function loadPatientHistory() {
    try {
      setLoading(true);
      setLoadError("");

      setAllowed(new Set());
      setPatientDetails(null);
      setMedicalRecords([]);
      setPrescriptions([]);
      setLabReports([]);
      setVitalsList([]);
      setActiveTab("");

      // STEP 1: Resolve patient ID/code to the database UUID.
      const resolvedUUID =
        await doctorService.resolvePatientIdentifier(patientId);

      console.log("[Patient History] URL patient ID:", patientId);
      console.log("[Patient History] Resolved UUID:", resolvedUUID);

      if (!resolvedUUID) {
        throw new Error(
          `No patient found for "${patientId}". Verify the patient ID or patient code.`
        );
      }

      // STEP 2: Retrieve the active access scope from Supabase.
      const rawScope =
        await doctorService.getActiveAccessScope(resolvedUUID);

      console.log("[Patient History] Raw active scope:", rawScope);
      console.log(
        "[Patient History] Raw scope type:",
        typeof rawScope
      );

      // STEP 3: Convert the returned scope to recognized sections.
      const scope = normalizeScope(rawScope);

      console.log(
        "[Patient History] Normalized scope:",
        [...scope]
      );

      setAllowed(scope);

      // Do not fetch patient data if no recognized access exists.
      if (scope.size === 0) {
        console.warn(
          "[Patient History] No recognized access scope. " +
          "Check the active session and Supabase RPC response."
        );

        return;
      }

      // STEP 4: Fetch only the sections permitted by the scope.
      const none = Promise.resolve([]);

      const [
        details,
        records,
        rxs,
        reports,
        vitals,
      ] = await Promise.all([
        doctorService.getPatientDetails(resolvedUUID),

        scope.has("records")
          ? doctorService.getPatientMedicalHistory(resolvedUUID)
          : none,

        scope.has("prescriptions")
          ? doctorService.getPatientPrescriptions(resolvedUUID)
          : none,

        scope.has("reports")
          ? labReportService.getPatientLabReports(resolvedUUID)
          : none,

        scope.has("vitals")
          ? vitalsService.getPatientVitals(resolvedUUID)
          : none,
      ]);

      // STEP 5: Display the results in the UI.
      console.log("[Patient History] Patient details:", details);
      console.log("[Patient History] Medical records:", records);
      console.log("[Patient History] Prescriptions:", rxs);
      console.log("[Patient History] Lab reports:", reports);
      console.log("[Patient History] Vitals:", vitals);

      setPatientDetails(details);
      setMedicalRecords(Array.isArray(records) ? records : []);
      setPrescriptions(Array.isArray(rxs) ? rxs : []);
      setLabReports(Array.isArray(reports) ? reports : []);
      setVitalsList(Array.isArray(vitals) ? vitals : []);

      const firstAvailableTab = TAB_DEFS.find((tab) =>
        scope.has(tab.key)
      );

      setActiveTab(firstAvailableTab?.key || "");
    } catch (err) {
      console.error("[Patient History] Loading error:", err);

      setLoadError(
        err?.message || "Could not load this patient's medical file."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleEndSession() {
    const confirmed = window.confirm(
      "Are you sure you want to end this patient consultation session? Access will be terminated."
    );

    if (!confirmed) {
      return;
    }

    try {
      setEnding(true);

      await doctorService.endPatientSessionByPatientId(patientId);

      alert("Consultation session ended and patient access terminated.");

      navigate("/doctor-access");
    } catch (err) {
      console.error("[Patient History] End session error:", err);

      alert("Failed to end session: " + err.message);
    } finally {
      setEnding(false);
    }
  }

  if (loading) {
    return (
      <Loader
        fullScreen
        text="Loading Authorized Patient File..."
      />
    );
  }

  // Show errors or stop when no valid scope is available.
  if (loadError || allowed.size === 0) {
    return (
      <DoctorLayout title="Patient Medical Record File">
        <button
          onClick={() => navigate("/doctor-access")}
          className="mb-4 px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Back to Doctor Access
        </button>

        <EmptyState
          title={
            loadError
              ? "Could not load this file"
              : "No active access"
          }
          description={
            loadError ||
            "No recognized active access scope was returned. Check the browser console and request a new OTP if the session has expired."
          }
        />

        {/* Convenient retry after checking or refreshing the session. */}
        <button
          onClick={loadPatientHistory}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          Retry Loading
        </button>
      </DoctorLayout>
    );
  }

  const visibleTabs = TAB_DEFS.filter((tab) =>
    allowed.has(tab.key)
  );

  const counts = {
    records: medicalRecords.length,
    prescriptions: prescriptions.length,
    reports: labReports.length,
    vitals: vitalsList.length,
  };

  return (
    <DoctorLayout title="Patient Medical Record File">
      {/* Header actions */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Back to Doctor Access
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleEndSession}
            disabled={ending}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <XCircle size={15} />
            {ending ? "Ending..." : "End Consultation Session"}
          </button>

          {allowed.has("records") && (
            <Link
              to={`/add-record?patientId=${encodeURIComponent(patientId)}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <PlusCircle size={15} />
              Add Record
            </Link>
          )}

          {allowed.has("prescriptions") && (
            <Link
              to={`/add-prescription?patientId=${encodeURIComponent(patientId)}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Pill size={15} />
              Issue Prescription
            </Link>
          )}
        </div>
      </div>

      {/* Patient information */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl mb-4">
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
              <span className="text-slate-400 block font-bold uppercase">
                Age
              </span>
              <span className="font-semibold text-white">
                {patientDetails?.age ?? "Not Set"}
              </span>
            </div>

            <div className="border-l border-slate-700 pl-4">
              <span className="text-slate-400 block font-bold uppercase">
                Blood Group
              </span>
              <span className="font-bold text-teal-300">
                {patientDetails?.blood_group || "Not Set"}
              </span>
            </div>

            <div className="border-l border-slate-700 pl-4">
              <span className="text-slate-400 block font-bold uppercase">
                Known Allergies
              </span>
              <span className="font-semibold text-rose-300">
                {patientDetails?.allergies || "None"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Authorized scope */}
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 mb-6">
        <ShieldCheck size={16} className="shrink-0 mt-0.5" />

        <p>
          The patient shared:{" "}
          <strong>
            {visibleTabs
              .map((tab) => SCOPE_LABELS[tab.key])
              .join(", ")}
          </strong>
          . Other parts of their file are not available to you.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b border-slate-200 mb-6 gap-4 overflow-x-auto"
        role="tablist"
      >
        {visibleTabs.map(
          ({ key, label, icon: Icon, active }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`pb-3 text-sm font-extrabold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${activeTab === key
                  ? active
                  : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
            >
              <Icon size={18} />
              {label} ({counts[key]})
            </button>
          )
        )}
      </div>

      {/* Medical records */}
      {activeTab === "records" && allowed.has("records") && (
        medicalRecords.length === 0 ? (
          <EmptyState
            title="No Medical Records"
            description="No medical logs have been added for this patient yet."
          />
        ) : (
          <div className="space-y-4">
            {medicalRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs"
              >
                <div className="flex justify-between items-start gap-3 mb-4">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {rec.diagnosis || "Medical Record"}
                  </h3>

                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0">
                    <Calendar size={13} />
                    {rec.created_at
                      ? new Date(rec.created_at).toLocaleString()
                      : "Date unavailable"}
                  </span>
                </div>

                <ExtractedRecordView record={rec} />

                {getImportedMedications(rec).length > 0 && (
                  <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill size={16} className="text-amber-700" />
                      <h4 className="font-extrabold text-sm text-amber-900">
                        Medicines extracted from this document
                      </h4>
                    </div>
                    <p className="text-xs text-amber-800 mb-3">
                      Historical information from an uploaded document; these are not newly issued prescriptions.
                      Verify details against the original document.
                    </p>
                    <div className="space-y-2">
                      {getImportedMedications(rec).map((med, index) => (
                        <div
                          key={`${rec.id}-imported-med-${index}`}
                          className="rounded-lg border border-amber-100 bg-white p-3"
                        >
                          <p className="font-bold text-sm text-slate-900">
                            {med.name || "Medicine name not documented"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                            {med.dosage && (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
                                Dosage: {med.dosage}
                              </span>
                            )}
                            {med.frequency && (
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700">
                                Frequency: {med.frequency}
                              </span>
                            )}
                            {med.duration && (
                              <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-900">
                                Duration: {med.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <p className="text-xs text-blue-600 font-semibold mt-4 pt-3 border-t border-slate-100">
                  {attendingLabel(rec)}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Prescriptions */}
      {activeTab === "prescriptions" &&
        allowed.has("prescriptions") && (
          prescriptions.length === 0 ? (
            <EmptyState
              title="No Prescriptions"
              description="No prescriptions have been issued to this patient yet."
            />
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {rx.medicines || "Prescription"}
                    </h3>

                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Calendar size={13} />
                      {rx.created_at
                        ? new Date(rx.created_at).toLocaleDateString()
                        : "Date unavailable"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold mb-2">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      Dosage: {rx.dosage || "Not specified"}
                    </span>

                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                      Duration: {rx.duration || "Not specified"}
                    </span>
                  </div>

                  {rx.notes && (
                    <p className="text-xs text-slate-600 italic">
                      Instructions: {rx.notes}
                    </p>
                  )}

                  <p className="text-xs text-emerald-600 font-semibold mt-3">
                    Prescribing Doctor: Dr.{" "}
                    {rx.doctor?.full_name || "Doctor"}
                  </p>
                </div>
              ))}
            </div>
          )
        )}

      {/* Lab reports */}
      {activeTab === "reports" && allowed.has("reports") && (
        labReports.length === 0 ? (
          <EmptyState
            title="No Lab Reports"
            description="The patient has not uploaded any lab test documents or scans."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {labReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {report.title || "Lab Report"}
                    </h3>

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      {report.category || "Report"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono mb-3">
                    {report.file_name || "File name unavailable"}
                  </p>

                  {report.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic mb-4">
                      {report.notes}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {report.created_at
                      ? new Date(report.created_at).toLocaleDateString()
                      : "Date unavailable"}
                  </span>

                  {report.file_url ? (
                    <a
                      href={report.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      Open / Download File
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">
                      File unavailable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Vitals */}
      {activeTab === "vitals" && allowed.has("vitals") && (
        vitalsList.length === 0 ? (
          <EmptyState
            title="No Vitals History"
            description="No vitals readings have been recorded for this patient."
          />
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
                  <tr
                    key={v.id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="p-3 font-semibold">
                      {v.recorded_at
                        ? new Date(v.recorded_at).toLocaleString()
                        : "—"}
                    </td>

                    <td className="p-3 font-bold text-blue-600">
                      {v.blood_pressure_sys != null
                        ? `${v.blood_pressure_sys}/${v.blood_pressure_dia ?? "--"} mmHg`
                        : "--"}
                    </td>

                    <td className="p-3 font-bold text-rose-600">
                      {v.heart_rate != null
                        ? `${v.heart_rate} BPM`
                        : "--"}
                    </td>

                    <td className="p-3 font-bold text-purple-600">
                      {v.blood_sugar != null
                        ? `${v.blood_sugar} mg/dL`
                        : "--"}
                    </td>

                    <td className="p-3 font-semibold">
                      {v.weight_kg != null
                        ? `${v.weight_kg} kg`
                        : "--"}
                    </td>

                    <td className="p-3 font-semibold text-amber-700">
                      {v.temperature_f != null
                        ? `${v.temperature_f} °F`
                        : "--"}
                    </td>

                    <td className="p-3 text-slate-500 truncate max-w-xs">
                      {v.notes || "--"}
                    </td>
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