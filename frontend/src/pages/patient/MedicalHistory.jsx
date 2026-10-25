import { useEffect, useState } from "react";
import { Search, Calendar, FileText, UserCheck, Stethoscope, Eye, X } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import patientService from "../../services/patientService";

function MedicalHistory() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      const data = await patientService.getMedicalRecords();
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = records.filter(
    (rec) =>
      rec.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.symptoms?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.doctor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Loader fullScreen text="Fetching medical logs..." />;
  }

  return (
    <PatientLayout title="Medical History Ledger">
      <PageHeader
        title="Clinical & Medical Records"
        subtitle="Complete chronological ledger of medical consultations, symptoms, and physician diagnoses."
      />

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by diagnosis, symptoms, or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-200/60">
          Total Logs: {filteredRecords.length}
        </div>
      </div>

      {/* Record Cards Timeline Grid */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No Matching Records"
          description={searchQuery ? "No medical logs match your query." : "You have no medical records yet."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <FileText size={13} />
                    Diagnosis
                  </span>
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                    <Calendar size={13} />
                    {new Date(record.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                  {record.diagnosis}
                </h3>

                <p className="text-xs text-slate-600 mb-4 line-clamp-3">
                  <strong className="text-slate-800">Reported Symptoms:</strong> {record.symptoms}
                </p>

                {record.notes && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 mb-4 italic">
                    "{record.notes}"
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Stethoscope size={15} className="text-blue-600" />
                  <span>Dr. {record.doctor?.full_name || "Physician"}</span>
                </div>

                <button
                  onClick={() => setSelectedRecord(record)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                >
                  <Eye size={14} />
                  View Record
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Medical Record Detail
                </h3>
                <p className="text-xs text-slate-500">
                  Logged on {new Date(selectedRecord.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">Diagnosis</p>
                <p className="font-bold text-slate-900 text-base mt-0.5">{selectedRecord.diagnosis}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">Symptoms</p>
                <p className="mt-0.5 text-slate-800">{selectedRecord.symptoms}</p>
              </div>

              {selectedRecord.notes && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase">Physician Clinical Notes</p>
                  <p className="mt-0.5 text-slate-800">{selectedRecord.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-500">Attending Physician:</span>
                <span className="font-bold text-blue-600">Dr. {selectedRecord.doctor?.full_name || "Doctor"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}

export default MedicalHistory;