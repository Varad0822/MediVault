import { useEffect, useState } from "react";
import { Pill, Clock, Stethoscope, Search, Printer, Eye, X, Download, FileText, CheckCircle2 } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import patientService from "../../services/patientService";

function PrescriptionHistory() {
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRx, setSelectedRx] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  async function loadPrescriptions() {
    try {
      setLoading(true);
      const data = await patientService.getPrescriptions();
      setPrescriptions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredPrescriptions = prescriptions.filter(
    (rx) =>
      rx.medicines?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.dosage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.doctor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrintOrDownload = () => {
    window.print();
  };

  // Safe JSON parser for structured notes
  const parseNotes = (rawNotes) => {
    if (!rawNotes) return {};
    try {
      if (rawNotes.startsWith("{") && rawNotes.endsWith("}")) {
        return JSON.parse(rawNotes);
      }
    } catch (e) {
      // Fallback if raw text
    }
    return { advice: rawNotes };
  };

  if (loading) {
    return <Loader fullScreen text="Fetching prescriptions..." />;
  }

  return (
    <PatientLayout title="Prescription History">
      {/* High-Resolution Printable CSS layout matching standard hospital Rx slip */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-hospital-rx, .printable-hospital-rx * {
            visibility: visible;
          }
          .printable-hospital-rx {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <PageHeader
        title="Prescriptions Ledger"
        subtitle="View and download official hospital Rx prescription slips."
      />

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by medicine name, dosage, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-200/60">
          Total Prescriptions: {filteredPrescriptions.length}
        </div>
      </div>

      {/* Prescriptions Grid */}
      {filteredPrescriptions.length === 0 ? (
        <EmptyState
          title="No Prescriptions Found"
          description={searchQuery ? "No prescription matches your search." : "You have no active or past prescriptions."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPrescriptions.map((rx) => {
            const parsed = parseNotes(rx.notes);

            return (
              <div
                key={rx.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Pill size={14} />
                      Official Hospital Rx Slip
                    </span>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={13} />
                      {new Date(rx.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">
                    {rx.medicines}
                  </h3>

                  {parsed.diagnosis && (
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Diagnosis: <span className="text-blue-600 uppercase">{parsed.diagnosis}</span>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200/60">
                      Dosage: {rx.dosage}
                    </span>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200/60">
                      Duration: {rx.duration}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Stethoscope size={15} className="text-emerald-600" />
                    <span>Dr. {rx.doctor?.full_name || "Doctor"}</span>
                  </div>

                  <button
                    onClick={() => setSelectedRx(rx)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Eye size={14} />
                    View & Download Rx Slip
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Official Hospital Medical Prescription Slip Modal */}
      {selectedRx && (() => {
        const parsed = parseNotes(selectedRx.notes);
        const docDetails = selectedRx.doctor?.details || {};
        const patDetails = selectedRx.patient?.details || {};
        const docName = selectedRx.doctor?.full_name || "Akshara";
        const docSpec = docDetails.specialization || "M.S.";
        const docLicense = docDetails.license_number || "MMC 2018";
        const docPhone = docDetails.contact_number || "5465647658";
        const hospitalName = docDetails.hospital_name || "SMS hospital";

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-300 relative animate-in fade-in zoom-in duration-200 printable-hospital-rx text-slate-900 font-sans">
              {/* Close Button */}
              <button
                onClick={() => setSelectedRx(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition no-print"
              >
                <X size={20} />
              </button>

              {/* Header Top Grid */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-400 pb-4 mb-3">
                {/* Left: Doctor Credentials */}
                <div className="text-left leading-tight">
                  <h2 className="text-base font-black text-slate-900">Dr. {docName}</h2>
                  <p className="text-xs text-slate-700 font-medium">{docSpec}</p>
                  <p className="text-xs text-slate-700 font-medium">Reg. No: {docLicense}</p>
                </div>

                {/* Center: Caduceus Emblem */}
                <div className="flex justify-center items-center">
                  <svg className="w-12 h-12 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C11.45 2 11 2.45 11 3V4.18C9.84 4.6 9 5.7 9 7C9 8.66 10.34 10 12 10C13.66 10 15 8.66 15 7C15 5.7 14.16 4.6 13 4.18V3C13 2.45 12.55 2 12 2ZM12 6C12.55 6 13 6.45 13 7C13 7.55 12.55 8 12 8C11.45 8 11 7.55 11 7C11 6.45 11.45 6 12 6ZM12 11C11.45 11 11 11.45 11 12V21C11 21.55 11.45 22 12 22C12.55 22 13 21.55 13 21V12C13 11.45 12.55 11 12 11Z" />
                  </svg>
                </div>

                {/* Right: Hospital Details */}
                <div className="text-right leading-tight max-w-xs">
                  <h2 className="text-base font-black text-blue-700">{hospitalName}</h2>
                  <p className="text-[11px] text-slate-700">B/503, Business Center, MG Road, Pune - 411000.</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Ph: {docPhone}, Timing: 09:00 AM - 01:00 PM, 06:00 PM - 08:00 PM | Closed: Sunday
                  </p>
                </div>
              </div>

              {/* Patient Vitals & Meta Info Bar */}
              <div className="border-b border-slate-400 pb-3 mb-3 text-xs leading-relaxed font-semibold">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold">ID: {selectedRx.patient?.patient_code || "11"} - {selectedRx.patient?.full_name?.toUpperCase() || "PATIENT"} (M) / {patDetails.age || "13"} Y</span>
                    <span className="ml-4">Mob. No.: {patDetails.emergency_contact || "9423380390"}</span>
                  </div>
                  <div className="font-bold">
                    Date: {new Date(selectedRx.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>

                <div>
                  <span>Address: PUNE</span>
                </div>

                <div className="mt-0.5 text-[11px] text-slate-800">
                  <span>Weight (Kg): 80, Height (Cm): 200 (B.M.I. = 20.00), BP: 120/80 mmHg</span>
                </div>
              </div>

              {/* Two Column: Chief Complaints & Clinical Findings */}
              <div className="border-b border-slate-400 pb-3 mb-3 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Chief Complaints</h4>
                  <div className="whitespace-pre-line text-slate-800 font-mono text-[11px] leading-snug">
                    {parsed.chiefComplaints || "* FEVER WITH CHILLS (4 DAYS)\n* HEADACHE (2 DAYS)"}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Clinical Findings</h4>
                  <div className="whitespace-pre-line text-slate-800 font-mono text-[11px] leading-snug">
                    {parsed.clinicalFindings || "* THESE ARE TEST FINDINGS FOR A TEST PATIENT\n* ENTERING SAMPLE DIAGNOSIS AND SAMPLE PRESCRIPTION"}
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="border-b border-slate-400 pb-3 mb-3 text-xs">
                <h4 className="font-bold text-slate-900 mb-0.5">Diagnosis:</h4>
                <p className="font-bold text-slate-900 uppercase tracking-wide">
                  * {parsed.diagnosis || "MALARIA"}
                </p>
              </div>

              {/* Rx Symbol & Itemized Medicines Table */}
              <div className="mb-4">
                <div className="text-xl font-bold font-serif font-black italic mb-1 text-slate-900">
                  Rx
                </div>

                <table className="w-full text-left text-xs border-collapse border-t border-b border-slate-400">
                  <thead>
                    <tr className="border-b border-slate-400 font-bold text-slate-900">
                      <th className="py-2 pr-2 w-1/2">Medicine Name</th>
                      <th className="py-2 px-2 w-1/4">Dosage</th>
                      <th className="py-2 pl-2 w-1/4 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-slate-900 font-semibold text-[11px]">
                    <tr>
                      <td className="py-3 pr-2">
                        <div className="font-bold text-sm">1) {selectedRx.medicines}</div>
                      </td>
                      <td className="py-3 px-2">
                        {selectedRx.dosage}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {selectedRx.duration}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Advice */}
              <div className="mb-4 text-xs">
                <h4 className="font-bold text-slate-900 mb-1">Advice:</h4>
                <div className="whitespace-pre-line text-slate-800 font-mono text-[11px] leading-snug">
                  {parsed.advice || "* TAKE BED REST\n* DO NOT EAT OUTSIDE FOOD\n* EAT EASY TO DIGEST FOOD LIKE BOILED RICE WITH DAAL"}
                </div>
              </div>

              {/* Follow Up Date */}
              <div className="mb-6 text-xs font-bold text-slate-900">
                Follow Up: {parsed.followUpDate || "04-09-2023"}
              </div>

              {/* Footer Generics Note */}
              <div className="pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 italic">
                Substitute with equivalent Generics as required.
              </div>

              {/* Print & Download Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 no-print mt-6">
                <button
                  onClick={handlePrintOrDownload}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2"
                >
                  <Printer size={16} />
                  Print / Download PDF Prescription
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </PatientLayout>
  );
}

export default PrescriptionHistory;