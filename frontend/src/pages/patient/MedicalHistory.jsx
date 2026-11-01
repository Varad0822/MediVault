import { useEffect, useState } from "react";
import {
  Search,
  Calendar,
  FileText,
  FlaskConical,
  Pill,
  Stethoscope,
  Eye,
  X,
  Upload,
  Trash2,
} from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import ExtractedRecordView from "../../components/records/ExtractedRecordView";
import patientService from "../../services/patientService";
import { OUT_OF_RANGE } from "../../services/recordUtils";

/* ---------- helpers ---------- */

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const isImported = (rec) => Boolean(rec.extracted_data);

const isLabOnly = (rec) => {
  const d = rec.extracted_data;

  return (
    Boolean(d) &&
    !(d.diagnosis || "").trim() &&
    (d.labResults || []).length > 0
  );
};

function attendingLabel(rec) {
  const d = rec.extracted_data;

  if (d) {
    return d.doctorName || d.hospital || "Uploaded document";
  }

  return `Dr. ${rec.doctor?.full_name || "Physician"}`;
}

function summarize(rec) {
  const d = rec.extracted_data;

  if (!d) return null;

  const labs = d.labResults || [];

  return {
    labs: labs.length,
    outOfRange: labs.filter((l) =>
      OUT_OF_RANGE.includes(l.flag)
    ).length,
    medicines: (d.medications || []).length,
    symptoms: d.symptoms || [],
  };
}

function searchText(rec) {
  const d = rec.extracted_data || {};

  return [
    rec.diagnosis,
    rec.symptoms,
    rec.doctor?.full_name,
    d.doctorName,
    d.hospital,
    ...(d.medications || []).map((m) => m.name),
    ...(d.labResults || []).map((l) => l.test),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function Pill2({ tone = "slate", icon: Icon, children }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

/* ---------- page ---------- */

function MedicalHistory() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [deletingRecordId, setDeletingRecordId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  // Close the details modal using Escape.
  useEffect(() => {
    if (!selectedRecord) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setSelectedRecord(null);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedRecord]);

  async function loadHistory() {
    try {
      setLoading(true);

      const data = await patientService.getMedicalRecords();

      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load medical history:", err);
      setDeleteError(
        err?.message || "Could not load your medical records."
      );
    } finally {
      setLoading(false);
    }
  }

  // Delete any medical record owned by the currently logged-in patient.
  async function handleDeleteRecord(record) {
    if (deletingRecordId !== null) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.diagnosis || "this medical record"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingRecordId(record.id);
      setDeleteError("");
      setDeleteSuccess("");

      if (
        typeof patientService.deleteMedicalRecord !== "function"
      ) {
        throw new Error(
          "Delete service is missing. Please check patientService.js."
        );
      }

      await patientService.deleteMedicalRecord(record.id);

      setRecords((current) =>
        current.filter((item) => item.id !== record.id)
      );

      setSelectedRecord((current) =>
        current?.id === record.id ? null : current
      );

      setDeleteSuccess("Medical record deleted successfully.");
    } catch (err) {
      console.error("Failed to delete medical record:", err);

      setDeleteError(
        err?.message || "Could not delete this medical record."
      );
    } finally {
      setDeletingRecordId(null);
    }
  }

  const query = searchQuery.trim().toLowerCase();

  const filteredRecords = records.filter(
    (rec) => !query || searchText(rec).includes(query)
  );

  if (loading) {
    return <Loader fullScreen text="Fetching medical logs..." />;
  }

  return (
    <PatientLayout title="Medical History Ledger">
      <PageHeader
        title="Clinical & Medical Records"
        subtitle="Complete chronological ledger of medical consultations, lab reports, and diagnoses."
      />

      {/* Delete feedback */}
      {deleteError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-3"
        >
          <span>{deleteError}</span>

          <button
            type="button"
            onClick={() => setDeleteError("")}
            aria-label="Dismiss error"
            className="font-bold"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {deleteSuccess && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {deleteSuccess}
        </div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            aria-label="Search records"
            placeholder="Search diagnosis, symptoms, medicines, lab tests, or doctor"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-200/60">
          Total records: {filteredRecords.length}
        </div>
      </div>

      {/* Medical record cards */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No Matching Records"
          description={
            searchQuery
              ? "No medical logs match your query."
              : "You have no medical records yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecords.map((record) => {
            const summary = summarize(record);
            const labOnly = isLabOnly(record);
            const collected = record.extracted_data?.collectionDate;

            return (
              <div
                key={record.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill2
                        tone="blue"
                        icon={labOnly ? FlaskConical : FileText}
                      >
                        {labOnly ? "Lab report" : "Diagnosis"}
                      </Pill2>

                      {isImported(record) && (
                        <Pill2 tone="indigo" icon={Upload}>
                          Uploaded by patient
                        </Pill2>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1 shrink-0">
                      <Calendar size={13} />
                      {formatDate(record.created_at)}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 mb-1">
                    {record.diagnosis || "Medical Record"}
                  </h3>

                  {collected && (
                    <p className="text-xs text-slate-500 mb-3">
                      Collected {collected}
                    </p>
                  )}

                  {summary ? (
                    <div className="space-y-3 mb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {summary.labs > 0 && (
                          <Pill2
                            tone={
                              summary.outOfRange > 0
                                ? "rose"
                                : "emerald"
                            }
                            icon={FlaskConical}
                          >
                            {summary.outOfRange} of {summary.labs} labs
                            out of range
                          </Pill2>
                        )}

                        {summary.medicines > 0 && (
                          <Pill2 icon={Pill}>
                            {summary.medicines}{" "}
                            {summary.medicines === 1
                              ? "medicine"
                              : "medicines"}
                          </Pill2>
                        )}
                      </div>

                      {summary.symptoms.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {summary.symptoms
                            .slice(0, 3)
                            .map((symptom, index) => (
                              <span
                                key={`${symptom}-${index}`}
                                className="bg-slate-50 text-slate-700 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs"
                              >
                                {symptom}
                              </span>
                            ))}

                          {summary.symptoms.length > 3 && (
                            <span className="text-xs text-slate-400">
                              +{summary.symptoms.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {record.symptoms && (
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                          <strong className="text-slate-800">
                            Reported symptoms:
                          </strong>{" "}
                          {record.symptoms}
                        </p>
                      )}

                      {record.notes && (
                        <p className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 mb-4 line-clamp-3 whitespace-pre-line">
                          {record.notes}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Card actions: View and Delete for every record */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
                    <Stethoscope
                      size={15}
                      className="text-blue-600 shrink-0"
                    />

                    <span className="truncate">
                      {attendingLabel(record)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setDeleteSuccess("");
                        setSelectedRecord(record);
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(record)}
                      disabled={deletingRecordId !== null}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Delete ${record.diagnosis || "medical record"}`}
                    >
                      <Trash2 size={14} />
                      {deletingRecordId === record.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
     {/* Record details modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  {isLabOnly(selectedRecord) ? (
                    <FlaskConical size={22} />
                  ) : (
                    <FileText size={22} />
                  )}
                </div>

                <div className="min-w-0">
                  <h3
                    id="record-title"
                    className="text-lg font-extrabold text-slate-900"
                  >
                    {selectedRecord.diagnosis || "Medical Record"}
                  </h3>

                  {isLabOnly(selectedRecord) && (
                    <p className="text-xs text-slate-500 italic mt-0.5">
                      No diagnosis is stated in this report.
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mt-1">
                    Logged on{" "}
                    {new Date(
                      selectedRecord.created_at
                    ).toLocaleString()}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {isImported(selectedRecord) && (
                      <Pill2 tone="indigo" icon={Upload}>
                        Uploaded by patient, not verified by a doctor
                      </Pill2>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto p-6">
              <ExtractedRecordView record={selectedRecord} />
            </div>

            {/* Modal footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500">
                {isImported(selectedRecord)
                  ? "Source"
                  : "Attending physician"}
              </span>

              <span className="font-bold text-blue-600 text-right">
                {attendingLabel(selectedRecord)}
              </span>

              <button
                type="button"
                onClick={() => handleDeleteRecord(selectedRecord)}
                disabled={deletingRecordId !== null}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deletingRecordId === selectedRecord.id
                  ? "Deleting..."
                  : "Delete record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}

export default MedicalHistory;