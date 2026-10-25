import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Sparkles, FileText, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Eye, Edit3, ShieldCheck, Check, Bot } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import aiRecordAnalyzerService from "../../services/aiRecordAnalyzerService";

function UploadPreviousRecord() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Upload, 2: Analyzing, 3: Review & Import
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");

  // Extracted Fields State
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [notes, setNotes] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(95);
  const [isAiPowered, setIsAiPowered] = useState(true);

  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleStartAnalysis = async (e) => {
    e.preventDefault();
    if (!selectedFile && !pastedText.trim()) {
      setToast({ type: "error", text: "Please upload a past record file or paste report summary text." });
      return;
    }

    setStep(2); // Analyzing

    try {
      const result = await aiRecordAnalyzerService.analyzeMedicalDocument({
        file: selectedFile,
        textContent: pastedText,
        fileName: selectedFile ? selectedFile.name : "",
      });

      setDiagnosis(result.diagnosis);
      setSymptoms(result.symptoms);
      setDoctorName(result.doctorName);
      setNotes(result.notes);
      setConfidenceScore(result.confidenceScore || 95);
      setIsAiPowered(result.isAiPowered ?? true);

      setStep(3); // Review
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: "Failed to analyze document: " + (err.message || "Unknown error") });
      setStep(1);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      await aiRecordAnalyzerService.importAnalyzedRecord({
        diagnosis,
        symptoms,
        notes,
        doctorName,
        file: selectedFile,
      });

      setToast({ type: "success", text: "Past record successfully analyzed and imported into your official Medical History!" });
      setTimeout(() => {
        navigate("/medical-history");
      }, 2000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message || "Failed to import record." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <PatientLayout title="Analyze Past Record">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Gemini AI Medical Record Analyzer"
          subtitle="Upload past hospital discharge summaries, prescriptions, or lab reports to extract parameters using Gemini Vision AI."
        />
        <button
          onClick={() => navigate(-1)}
          className="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

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

      {/* Progress Steps Indicator */}
      <div className="flex items-center justify-center max-w-xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
            1
          </div>
          <span className="text-xs font-bold text-slate-700">Upload File</span>
        </div>
        <div className="w-12 h-0.5 bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
            2
          </div>
          <span className="text-xs font-bold text-slate-700">AI Vision Scanning</span>
        </div>
        <div className="w-12 h-0.5 bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
            3
          </div>
          <span className="text-xs font-bold text-slate-700">Review & Import</span>
        </div>
      </div>

      {/* STEP 1: Upload / Input */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Upload Medical Record for AI Extraction
              </h3>
              <p className="text-xs text-slate-500">
                Supports photos of prescriptions, scanned lab reports (PNG/JPG), PDFs, and text.
              </p>
            </div>
          </div>

          <form onSubmit={handleStartAnalysis} className="space-y-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Option A: Upload Record File (Photo, Scan, PDF)
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                <Upload size={32} className="mx-auto text-blue-500 mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {selectedFile ? selectedFile.name : "Click to select medical report image or PDF"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Supports PNG, JPG, JPEG, PDF, TXT</p>
                <input
                  type="file"
                  accept="application/pdf,image/*,.txt"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="hidden"
                  id="record-file-upload"
                />
                <label
                  htmlFor="record-file-upload"
                  className="mt-3 inline-block px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition"
                >
                  Choose File
                </label>
              </div>
            </div>

            <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              — OR —
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Option B: Paste Report Text / Summary
              </label>
              <textarea
                rows="4"
                placeholder="Paste consultation summary, symptoms, or hospital discharge text..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles size={18} /> Analyze with Gemini Vision AI
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: Analyzing Loading Screen */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-xs max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
            <RefreshCw size={32} className="animate-spin text-blue-600" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">
            Analyzing Medical Document with Gemini AI...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Running vision OCR and clinical NLP to extract physician diagnoses, reported symptoms, attending doctor, and prescription notes directly from the document...
          </p>
        </div>
      )}

      {/* STEP 3: Review Extracted Data & Confirm */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Extracted Clinical Details
                </h3>
                <p className="text-xs text-slate-500">
                  Review and edit the extracted parameters before importing into your history.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAiPowered && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Bot size={13} /> Gemini Vision Extracted
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles size={12} /> {confidenceScore}% Confidence
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Extracted Medical Diagnosis / Finding
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Extracted Symptoms & Complaints
              </label>
              <textarea
                rows="3"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Original Attending Doctor / Hospital
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Attached File Status
                </label>
                <input
                  type="text"
                  value={selectedFile ? selectedFile.name : "Text Input (No File)"}
                  disabled
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-500 bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Prescription, Medicines & Clinical Notes
              </label>
              <textarea
                rows="4"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 font-medium"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              Re-analyze Another Record
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={importing}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
            >
              <Check size={18} />
              {importing ? "Importing Record..." : "Confirm & Import to Medical History"}
            </button>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}

export default UploadPreviousRecord;
