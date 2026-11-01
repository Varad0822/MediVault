// Pure helpers shared by the analyzer service, the review screen, and the history view.
// No imports, so this file is easy to unit test.

export const LAB_FLAGS = ["normal", "high", "low", "abnormal", "not_measured", "unknown"];

export const FLAG_LABELS = {
  normal: "Normal",
  high: "High",
  low: "Low",
  abnormal: "Abnormal",
  not_measured: "Not measured",
  unknown: "Not stated",
};

export const FLAG_STYLES = {
  normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  high: "bg-rose-50 text-rose-700 border-rose-200",
  low: "bg-amber-50 text-amber-800 border-amber-200",
  abnormal: "bg-rose-50 text-rose-700 border-rose-200",
  not_measured: "bg-slate-100 text-slate-500 border-slate-200",
  unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

export const OUT_OF_RANGE = ["low", "high", "abnormal"];

const clean = (v) => (typeof v === "string" ? v.trim() : "");

const NOT_MEASURED = /^(not\s*(measured|done|tested|available)|n\/?a\b|pending|no result)/i;

// "13.0–17.0", "30-400", "< 5.7", ">= 40", "Report reference: 30–400"
export function parseRange(text) {
  const t = String(text ?? "").replace(/,/g, "");
  const between = t.match(/(-?\d+(?:\.\d+)?)\s*(?:–|—|-|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (between) return { min: parseFloat(between[1]), max: parseFloat(between[2]) };
  const upper = t.match(/(?:<=?|≤|up to|below|less than)\s*(-?\d+(?:\.\d+)?)/i);
  if (upper) return { max: parseFloat(upper[1]) };
  const lower = t.match(/(?:>=?|≥|above|greater than|at least)\s*(-?\d+(?:\.\d+)?)/i);
  if (lower) return { min: parseFloat(lower[1]) };
  return null;
}

// Decide the status from the numbers in the document itself whenever possible,
// instead of trusting the model's judgement.
export function deriveFlag({ value, referenceRange, flag }) {
  const v = clean(value);
  const modelFlag = LAB_FLAGS.includes(flag) ? flag : "unknown";

  if (NOT_MEASURED.test(v)) return "not_measured";
  if (!v) return modelFlag === "not_measured" ? "not_measured" : "unknown";

  const plain = v.replace(/,/g, "");
  if (/^-?\d+(?:\.\d+)?$/.test(plain)) {
    const n = parseFloat(plain);
    const range = parseRange(referenceRange);
    if (range) {
      if (range.min !== undefined && n < range.min) return "low";
      if (range.max !== undefined && n > range.max) return "high";
      return "normal";
    }
  }
  return modelFlag === "not_measured" ? "unknown" : modelFlag;
}

// Groups lab rows by panel (CBC, Chemistry, ...) and remembers each row's original index.
export function groupLabResults(labResults = []) {
  const groups = [];
  labResults.forEach((lab, index) => {
    const panel = clean(lab.panel) || "Other results";
    let group = groups.find((g) => g.panel === panel);
    if (!group) {
      group = { panel, rows: [] };
      groups.push(group);
    }
    group.rows.push({ lab, index });
  });
  return groups;
}

export function labTitle(record) {
  const panels = groupLabResults(record.labResults || [])
    .map((g) => g.panel)
    .filter((p) => p !== "Other results");
  return panels.length ? `Lab report: ${panels.join(", ")}` : "";
}

// Raw Gemini JSON -> clean record. Throws if the document had no usable content.
export function normalizeExtraction(p) {
  const result = {
    patientName: clean(p.patientName),
    hospital: clean(p.hospital),
    doctorName: clean(p.doctorName),
    collectionDate: clean(p.collectionDate),
    reportDate: clean(p.reportDate),
    clinicalIndication: clean(p.clinicalIndication),
    diagnosis: clean(p.diagnosis),
    symptoms: (p.symptoms || []).map(clean).filter(Boolean),
    medications: (p.medications || [])
      .map((m) => ({
        name: clean(m.name),
        dosage: clean(m.dosage),
        frequency: clean(m.frequency),
        duration: clean(m.duration),
      }))
      .filter((m) => m.name),
    labResults: (p.labResults || [])
      .map((l) => {
        const base = {
          panel: clean(l.panel),
          test: clean(l.test),
          value: clean(l.value),
          unit: clean(l.unit),
          referenceRange: clean(l.referenceRange).replace(/^(report\s*)?reference(\s*range)?\s*:\s*/i, ""),
        };
        return { ...base, flag: deriveFlag({ ...base, flag: clean(l.flag).toLowerCase() }) };
      })
      .filter((l) => l.test),
    allergies: clean(p.allergies),
    advice: clean(p.advice),
    followUp: clean(p.followUp),
  };

  const hasContent =
    result.diagnosis ||
    result.symptoms.length ||
    result.medications.length ||
    result.labResults.length ||
    result.advice ||
    result.clinicalIndication;
  if (!hasContent) throw new Error("No clinical information could be found in this document");

  return result;
}

export function labLine(lab) {
  if (lab.flag === "not_measured") return `${lab.test}: not measured`;
  const value = [lab.value, lab.unit].filter(Boolean).join(" ");
  const ref = lab.referenceRange ? ` (ref ${lab.referenceRange})` : "";
  const flag = lab.flag && lab.flag !== "unknown" && lab.flag !== "normal" ? ` [${lab.flag}]` : "";
  return `${lab.test}: ${value}${ref}${flag}`;
}

// Plain-text version for the existing `notes` column (keeps old screens working).
export function formatNotes(r) {
  const lines = [];

  if (r.clinicalIndication) lines.push(`Clinical indication: ${r.clinicalIndication}`);

  const dates = [
    r.collectionDate && `Collected: ${r.collectionDate}`,
    r.reportDate && `Reported: ${r.reportDate}`,
  ].filter(Boolean);
  if (dates.length) lines.push(dates.join(" | "));

  if (r.medications.length) {
    lines.push("", "Medicines:");
    r.medications.forEach((m) =>
      lines.push(`- ${[m.name, m.dosage, m.frequency, m.duration].filter(Boolean).join(", ")}`)
    );
  }

  groupLabResults(r.labResults).forEach(({ panel, rows }) => {
    lines.push("", `${panel}:`);
    rows.forEach(({ lab }) => lines.push(`- ${labLine(lab)}`));
  });

  if (r.allergies) lines.push("", `Allergies: ${r.allergies}`);
  if (r.advice) lines.push("", `Advice: ${r.advice}`);
  if (r.followUp) lines.push(`Follow-up: ${r.followUp}`);

  const meta = [
    r.hospital && `Source: ${r.hospital}`,
    r.doctorName && `Doctor: ${r.doctorName}`,
  ].filter(Boolean);
  if (meta.length) lines.push("", meta.join(" | "));

  return lines.join("\n").trim();
}