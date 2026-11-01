export const SECTIONS = [
  "records",
  "prescriptions",
  "reports",
  "vitals",
];

const ALIASES = {
  records: [
    "records",
    "record",
    "history",
    "medical_history",
    "medical_records",
    "consultations",
    "consultation_logs",
    "medical_records_only",
    "records_only",
  ],

  prescriptions: [
    "prescriptions",
    "prescription",
    "medications",
    "medicines",
    "prescriptions_only",
    "prescription_only",
  ],

  reports: [
    "reports",
    "report",
    "lab_reports",
    "labs",
    "lab",
    "scans",
    "reports_only",
    "lab_reports_only",
  ],

  vitals: [
    "vitals",
    "vital",
    "health_metrics",
    "vitals_only",
  ],
};

const ALL = [
  "all",
  "full",
  "*",
  "everything",
  "full_access",
  "full_history",
  "all_records",
];

export function normalizeScope(raw) {
  let items = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string") {
    const text = raw.trim();

    if (!text) {
      return new Set();
    }

    // Support JSON-encoded arrays or objects.
    if (text.startsWith("[") || text.startsWith("{")) {
      try {
        return normalizeScope(JSON.parse(text));
      } catch {
        items = [text];
      }
    } else {
      items = text.split(/[,|;]/);
    }
  } else if (raw && typeof raw === "object") {
    // Support objects such as:
    // { prescriptions: true, records: false }
    items = Object.entries(raw)
      .filter(([, value]) => value === true)
      .map(([key]) => key);
  } else {
    return new Set();
  }

  const keys = items
    .map((item) =>
      String(item)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
    )
    .filter(Boolean);

  const allowed = new Set();

  // Full access only when the database explicitly returns a full-access value.
  if (keys.some((key) => ALL.includes(key))) {
    SECTIONS.forEach((section) => allowed.add(section));
    return allowed;
  }

  for (const [section, aliases] of Object.entries(ALIASES)) {
    if (keys.some((key) => aliases.includes(key))) {
      allowed.add(section);
    }
  }

  const known = new Set([
    ...ALL,
    ...Object.values(ALIASES).flat(),
  ]);

  const unknown = keys.filter((key) => !known.has(key));

  if (unknown.length > 0) {
    console.warn(
      "[Access Scope] Unrecognized scope value(s):",
      unknown
    );
  }

  console.log(
    "[Access Scope] Normalized sections:",
    [...allowed]
  );

  return allowed;
}