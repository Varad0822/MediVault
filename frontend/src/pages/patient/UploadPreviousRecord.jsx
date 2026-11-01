import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Check,
  Bot,
  Plus,
  X,
  Pill,
  FlaskConical,
  Stethoscope,
  ClipboardList,
  FileText,
  Info,
} from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import aiRecordAnalyzerService from "../../services/aiRecordAnalyzerService";
import {
  FLAG_LABELS,
  FLAG_STYLES,
  OUT_OF_RANGE,
  deriveFlag,
  groupLabResults,
} from "../../services/recordUtils";

const emptyRecord = {
  patientName: "",
  hospital: "",
  doctorName: "",
  collectionDate: "",
  reportDate: "",
  clinicalIndication: "",
  diagnosis: "",
  symptoms: [],
  medications: [],
  labResults: [],
  allergies: "",
  advice: "",
  followUp: "",
};

const blankMedication = { name: "", dosage: "", frequency: "", duration: "" };
const blankLab = { panel: "", test: "", value: "", unit: "", referenceRange: "", flag: "unknown" };

const inputCls =
  "w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

/* ---------- small building blocks ---------- */

function Section({ icon: Icon, title, count, action, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Icon size={18} className="text-blue-600" />
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          {count != null && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function CellInput({ label, className = "", ...props }) {
  return <input aria-label={label} className={`${inputCls} ${className}`} {...props} />;
}

function AddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg px-2.5 py-1.5 transition"
    >
      <Plus size={14} /> {children}
    </button>
  );
}

function RemoveButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
    >
      <X size={16} />
    </button>
  );
}

function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (value) {
      onChange([...tags, value]);
      setDraft("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border border-slate-200 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-blue-500">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
            aria-label={`Remove ${tag}`}
            className="p-0.5 rounded-full hover:bg-blue-100"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={tags.length ? "Add another" : "Type a symptom and press Enter"}
        className="flex-1 min-w-[10rem] text-sm text-slate-900 outline-none bg-transparent"
      />
    </div>
  );
}

const th = "text-left text-xs font-semibold text-slate-500 pb-2 pr-2 whitespace-nowrap";
const td = "pr-2 py-1 align-middle";

/* ---------- page ---------- */

function UploadPreviousRecord() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Upload, 2: Analyzing, 3: Review & Import
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");

  const [record, setRecord] = useState(emptyRecord);
  const [confidenceScore, setConfidenceScore] = useState(null);

  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);

  const update = (field, value) => setRecord((r) => ({ ...r, [field]: value }));
  const updateRow = (field, index, key, value) =>
    setRecord((r) => ({
      ...r,
      [field]: r[field].map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  const addRow = (field, blank) => setRecord((r) => ({ ...r, [field]: [...r[field], { ...blank }] }));
  const removeRow = (field, index) =>
    setRecord((r) => ({ ...r, [field]: r[field].filter((_, i) => i !== index) }));

  // Editing a result or its range re-derives the status from the numbers.
  const updateLab = (index, key, value) =>
    setRecord((r) => ({
      ...r,
      labResults: r.labResults.map((lab, i) => {
        if (i !== index) return lab;
        const next = { ...lab, [key]: value };
        if (key === "value" || key === "referenceRange") next.flag = deriveFlag(next);
        return next;
      }),
    }));

  const handleStartAnalysis = async (e) => {
    e.preventDefault();
    setToast(null);

    if (!selectedFile && !pastedText.trim()) {
      setToast({ type: "error", text: "Upload a record file or paste the report text first." });
      return;
    }

    setStep(2);

    try {
      const result = await aiRecordAnalyzerService.analyzeMedicalDocument({
        file: selectedFile,
        textContent: pastedText,
      });

      const { confidenceScore: score, isAiPowered, ...extracted } = result;
      setRecord({ ...emptyRecord, ...extracted });
      setConfidenceScore(score);
      setStep(3);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: "Could not analyze the document. " + (err.message || "Unknown error") });
      setStep(1);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      await aiRecordAnalyzerService.importAnalyzedRecord({
        record: {
          ...record,
          medications: record.medications.filter((m) => m.name.trim()),
          labResults: record.labResults.filter((l) => l.test.trim()),
        },
        file: selectedFile,
      });

      setToast({ type: "success", text: "Record imported into your medical history." });
      setTimeout(() => navigate("/medical-history"), 1800);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message || "Failed to import record." });
    } finally {
      setImporting(false);
    }
  };

  const resetToUpload = () => {
    setRecord(emptyRecord);
    setConfidenceScore(null);
    setToast(null);
    setStep(1);
  };

  // What the document did not contain. These stay blank instead of being guessed.
  const missing = [
    !record.diagnosis.trim() && "a diagnosis",
    record.medications.length === 0 && "medicines",
    !record.allergies.trim() && "allergy information",
    !record.advice.trim() && "advice",
    !record.followUp.trim() && "follow-up timing",
  ].filter(Boolean);

  const outOfRange = record.labResults.filter((l) => OUT_OF_RANGE.includes(l.flag)).length;
  const notMeasured = record.labResults.filter((l) => l.flag === "not_measured").length;

  return (
    <PatientLayout title="Analyze Past Record">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Gemini AI Medical Record Analyzer"
          subtitle="Upload past discharge summaries, prescriptions, or lab reports and review the extracted details."
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
          role="alert"
          className={`mb-6 p-4 rounded-xl flex items-start gap-2 text-sm font-semibold border ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span className="break-words min-w-0">{toast.text}</span>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-center max-w-xl mx-auto mb-8">
        {[
          ["Upload file", 1, "bg-blue-600"],
          ["AI scanning", 2, "bg-blue-600"],
          ["Review and import", 3, "bg-emerald-600"],
        ].map(([label, n, active], i) => (
          <div key={n} className="flex items-center">
            {i > 0 && <div className="w-10 h-0.5 bg-slate-200 mx-2" />}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step >= n ? `${active} text-white` : "bg-slate-200 text-slate-500"
                }`}
              >
                {n}
              </div>
              <span className="text-xs font-bold text-slate-700">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Upload a medical record</h3>
              <p className="text-xs text-slate-500">
                Photos of prescriptions, scanned lab reports (PNG/JPG), PDFs, and text files.
              </p>
            </div>
          </div>

          <form onSubmit={handleStartAnalysis} className="space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Option A: Upload a file</span>
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition">
                <Upload size={32} className="mx-auto text-blue-500 mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {selectedFile ? selectedFile.name : "Select a medical report image or PDF"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, PDF, or TXT. Up to 15 MB.</p>
                <input
                  type="file"
                  accept="application/pdf,image/*,.txt"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="hidden"
                  id="record-file-upload"
                />
                <label
                  htmlFor="record-file-upload"
                  className="mt-3 inline-block px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Choose file
                </label>
              </div>
            </div>

            <div className="text-center text-xs font-semibold text-slate-400">or</div>

            <div>
              <label htmlFor="pasted-text" className="text-xs font-bold text-slate-700 block mb-2">
                Option B: Paste the report text
              </label>
              <textarea
                id="pasted-text"
                rows="4"
                placeholder="Paste a consultation summary, symptoms, or discharge text"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles size={18} /> Analyze with Gemini
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: Analyzing */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-xs max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
            <RefreshCw size={32} className="animate-spin" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">Reading your document</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Extracting the diagnosis, symptoms, medicines, lab values, and advice. This usually takes
            10 to 30 seconds.
          </p>
        </div>
      )}

      {/* STEP 3: Structured review */}
      {step === 3 && (
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">Review extracted details</h3>
                <p className="text-xs text-slate-500 truncate">
                  {selectedFile ? selectedFile.name : "Pasted text"}. Correct anything that looks wrong
                  before importing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Bot size={13} /> Read by Gemini
              </span>
              {confidenceScore != null && (
                <span
                  title="Gemini's own estimate of how readable and complete the document was. It is not a measure of accuracy."
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  Legibility {confidenceScore}%
                </span>
              )}
            </div>
          </div>

          {missing.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              <Info size={16} className="shrink-0 mt-0.5 text-slate-500" />
              <p>
                This document does not state {missing.join(", ")}. Those fields are left blank rather
                than guessed. Add them yourself if you have the information.
              </p>
            </div>
          )}

          {/* Document details */}
          <Section icon={FileText} title="Document details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Patient name">
                <input className={inputCls} value={record.patientName} onChange={(e) => update("patientName", e.target.value)} />
              </Field>
              <Field label="Hospital, clinic, or laboratory">
                <input className={inputCls} value={record.hospital} onChange={(e) => update("hospital", e.target.value)} />
              </Field>
              <Field label="Ordering or attending doctor">
                <input className={inputCls} value={record.doctorName} onChange={(e) => update("doctorName", e.target.value)} />
              </Field>
              <Field label="Allergies">
                <input className={inputCls} value={record.allergies} onChange={(e) => update("allergies", e.target.value)} placeholder="Not stated in the document" />
              </Field>
              <Field label="Collection or visit date">
                <input className={inputCls} value={record.collectionDate} onChange={(e) => update("collectionDate", e.target.value)} />
              </Field>
              <Field label="Report date">
                <input className={inputCls} value={record.reportDate} onChange={(e) => update("reportDate", e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Diagnosis and symptoms */}
          <Section icon={Stethoscope} title="Diagnosis and symptoms">
            <div className="space-y-4">
              <Field label="Reason for visit or test">
                <textarea rows="2" className={inputCls} value={record.clinicalIndication} onChange={(e) => update("clinicalIndication", e.target.value)} placeholder="Not stated in the document" />
              </Field>
              <Field label="Diagnosis">
                <input
                  className={`${inputCls} text-base font-semibold py-2`}
                  value={record.diagnosis}
                  onChange={(e) => update("diagnosis", e.target.value)}
                  placeholder="No diagnosis stated in the document"
                />
              </Field>
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1">Symptoms</span>
                <TagInput tags={record.symptoms} onChange={(tags) => update("symptoms", tags)} />
              </div>
            </div>
          </Section>

          {/* Medicines */}
          <Section
            icon={Pill}
            title="Medicines"
            count={record.medications.length}
            action={<AddButton onClick={() => addRow("medications", blankMedication)}>Add medicine</AddButton>}
          >
            {record.medications.length === 0 ? (
              <p className="text-sm text-slate-500">No medicines are listed in this document.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <th className={th}>Medicine</th>
                      <th className={th}>Dose</th>
                      <th className={th}>How often</th>
                      <th className={th}>Duration</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {record.medications.map((m, i) => (
                      <tr key={i}>
                        <td className={td}><CellInput label="Medicine name" className="font-medium" value={m.name} onChange={(e) => updateRow("medications", i, "name", e.target.value)} /></td>
                        <td className={td}><CellInput label="Dose" value={m.dosage} onChange={(e) => updateRow("medications", i, "dosage", e.target.value)} /></td>
                        <td className={td}><CellInput label="How often" value={m.frequency} onChange={(e) => updateRow("medications", i, "frequency", e.target.value)} /></td>
                        <td className={td}><CellInput label="Duration" value={m.duration} onChange={(e) => updateRow("medications", i, "duration", e.target.value)} /></td>
                        <td className="py-1"><RemoveButton label={`Remove ${m.name || "medicine"}`} onClick={() => removeRow("medications", i)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Lab results, grouped by panel */}
          <Section
            icon={FlaskConical}
            title="Lab results"
            count={record.labResults.length}
            action={<AddButton onClick={() => addRow("labResults", blankLab)}>Add result</AddButton>}
          >
            {record.labResults.length === 0 ? (
              <p className="text-sm text-slate-500">No lab values are listed in this document.</p>
            ) : (
              <>
                <p className="text-sm text-slate-700 mb-4">
                  <span className="font-semibold">{outOfRange}</span> of {record.labResults.length} results
                  are outside the range printed on the report
                  {notMeasured > 0 && `, and ${notMeasured} ${notMeasured === 1 ? "was" : "were"} not measured`}.
                </p>

                {groupLabResults(record.labResults).map(({ panel, rows }) => (
                  <div key={panel} className="mb-6 last:mb-0">
                    <h5 className="text-sm font-semibold text-slate-800 mb-2">{panel}</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px]">
                        <thead>
                          <tr>
                            <th className={th}>Test</th>
                            <th className={th}>Result</th>
                            <th className={th}>Unit</th>
                            <th className={th}>Reference range</th>
                            <th className={th}>Status</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(({ lab, index }) => (
                            <tr key={index} className={OUT_OF_RANGE.includes(lab.flag) ? "bg-rose-50/50" : ""}>
                              <td className={td}><CellInput label="Test name" className="font-medium" value={lab.test} onChange={(e) => updateLab(index, "test", e.target.value)} /></td>
                              <td className={`${td} w-28`}>
                                <CellInput
                                  label="Result"
                                  className={OUT_OF_RANGE.includes(lab.flag) ? "font-bold" : ""}
                                  value={lab.value}
                                  placeholder={lab.flag === "not_measured" ? "Not measured" : ""}
                                  onChange={(e) => updateLab(index, "value", e.target.value)}
                                />
                              </td>
                              <td className={`${td} w-28`}><CellInput label="Unit" value={lab.unit} onChange={(e) => updateLab(index, "unit", e.target.value)} /></td>
                              <td className={`${td} w-36`}><CellInput label="Reference range" value={lab.referenceRange} onChange={(e) => updateLab(index, "referenceRange", e.target.value)} /></td>
                              <td className={`${td} w-36`}>
                                <select
                                  aria-label="Status"
                                  value={lab.flag}
                                  onChange={(e) => updateLab(index, "flag", e.target.value)}
                                  className={`w-full rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${FLAG_STYLES[lab.flag] || FLAG_STYLES.unknown}`}
                                >
                                  {Object.entries(FLAG_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-1"><RemoveButton label={`Remove ${lab.test || "result"}`} onClick={() => removeRow("labResults", index)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </Section>

          {/* Advice */}
          <Section icon={ClipboardList} title="Advice and follow-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Doctor's advice">
                <textarea rows="3" className={inputCls} value={record.advice} onChange={(e) => update("advice", e.target.value)} placeholder="Not stated in the document" />
              </Field>
              <Field label="Follow-up">
                <textarea rows="3" className={inputCls} value={record.followUp} onChange={(e) => update("followUp", e.target.value)} placeholder="Not stated in the document" />
              </Field>
            </div>
          </Section>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-slate-500">
              {record.medications.length} medicines, {record.labResults.length} lab results,{" "}
              {record.symptoms.length} symptoms
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToUpload}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Analyze another record
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
              >
                <Check size={18} />
                {importing ? "Importing" : "Import to medical history"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}

export default UploadPreviousRecord;