import { supabase } from "../lib/supabase";
import authService from "./authService";
import labReportService from "./labReportService";
import { normalizeExtraction, formatNotes, labTitle } from "./recordUtils";

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || "")
  .trim()
  .replace(/^["']|["']$/g, "");

const CONFIGURED_MODEL = import.meta.env.VITE_GEMINI_MODEL || "";
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_TIMEOUT_MS = 60000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const MIME_BY_EXT = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
};

const PROMPT = `You are a clinical documentation assistant. Read the attached medical document
(prescription, lab report, discharge summary, or clinical note) and extract these fields:

- patientName
- hospital: the hospital, clinic, or laboratory that issued the document
- doctorName: the ordering or attending doctor
- collectionDate: the date the sample was collected or the patient was seen, exactly as written
- reportDate: the date the report was issued, exactly as written
- clinicalIndication: the stated reason for the visit or test
- diagnosis: ONLY a diagnosis that the document explicitly states
- symptoms: short complaint phrases that the document states, one per item
- medications: a list of { name, dosage, frequency, duration }, copied exactly as written
- labResults: a list of { panel, test, value, unit, referenceRange, flag }
- allergies, advice, followUp: as written in the document
- legibilityScore: integer 0-100 for how legible and complete the document was

Rules:
- Use ONLY information actually written in the document. Never guess, infer, or invent values.
- Do NOT create a diagnosis from lab values or symptoms. If no diagnosis is stated, return null.
- If a field is missing, blank, or marked "not documented", return null.
- collectionDate and reportDate are different. Never merge or swap them.
- If a test says "Not measured" or has no result, set value to null and flag to not_measured.
- Copy medicine names, doses, and lab values exactly as printed.`;

const str = { type: "STRING", nullable: true };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    patientName: str,
    hospital: str,
    doctorName: str,
    collectionDate: str,
    reportDate: str,
    clinicalIndication: str,
    diagnosis: str,
    symptoms: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    medications: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: str,
          dosage: str,
          frequency: str,
          duration: str,
        },
      },
    },
    labResults: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          panel: str,
          test: str,
          value: str,
          unit: str,
          referenceRange: str,
          flag: { type: "STRING" },
        },
      },
    },
    allergies: str,
    advice: str,
    followUp: str,
    legibilityScore: { type: "INTEGER" },
  },
  required: [
    "diagnosis",
    "symptoms",
    "medications",
    "labResults",
    "legibilityScore",
  ],
};

const aiRecordAnalyzerService = {
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  },

  readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => resolve(event.target.result || "");
      reader.onerror = reject;

      reader.readAsText(file);
    });
  },

  async listAvailableModels() {
    const response = await fetch(
      `${GEMINI_BASE}/models?pageSize=100`,
      {
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Could not list Gemini models.");
    }

    return (data.models || [])
      .filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent")
      )
      .map((model) => model.name.replace("models/", ""));
  },

  async callGemini(model, parts) {
    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      GEMINI_TIMEOUT_MS
    );

    try {
      const response = await fetch(
        `${GEMINI_BASE}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
            },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");

        const error = new Error(
          `HTTP ${response.status} ${body.substring(0, 200)}`
        );

        error.fatal =
          response.status === 401 ||
          response.status === 403 ||
          /API key/i.test(body);

        throw error;
      }

      const data = await response.json();

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        const reason =
          data.promptFeedback?.blockReason ||
          data.candidates?.[0]?.finishReason ||
          "empty response";

        throw new Error(`No output from model (${reason})`);
      }

      return text;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out");
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }
  },

  parseResult(rawText) {
    const jsonText = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(jsonText);

    return {
      ...normalizeExtraction(parsed),
      confidenceScore: Number.isFinite(parsed.legibilityScore)
        ? parsed.legibilityScore
        : null,
      isAiPowered: true,
    };
  },

  async analyzeMedicalDocument({
    file = null,
    textContent = "",
  }) {
    if (!GEMINI_API_KEY) {
      throw new Error(
        "VITE_GEMINI_API_KEY is empty. Add it to frontend/.env " +
          "as VITE_GEMINI_API_KEY=your_key, then restart the dev server."
      );
    }

    const parts = [{ text: PROMPT }];

    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          "File is larger than 15 MB. Please upload a smaller file."
        );
      }

      const extension = file.name.split(".").pop().toLowerCase();

      if (extension === "txt" || file.type === "text/plain") {
        parts.push({
          text: `Document text:\n${await this.readTextFile(file)}`,
        });
      } else {
        const mimeType = file.type || MIME_BY_EXT[extension];

        if (!mimeType) {
          throw new Error(`Unsupported file type: .${extension}`);
        }

        parts.push({
          inlineData: {
            mimeType,
            data: await this.fileToBase64(file),
          },
        });
      }
    }

    if (textContent.trim()) {
      parts.push({
        text: `Pasted text:\n${textContent}`,
      });
    }

    const models = [
      ...new Set(
        [CONFIGURED_MODEL, ...CANDIDATE_MODELS].filter(Boolean)
      ),
    ];

    const errors = [];

    for (const model of models) {
      try {
        const result = await this.callGemini(model, parts);
        return this.parseResult(result);
      } catch (error) {
        console.warn(
          `Gemini model ${model} failed:`,
          error.message
        );

        errors.push(`${model}: ${error.message}`);

        if (error.fatal) {
          break;
        }
      }
    }

    throw new Error(
      `Gemini analysis failed. ${errors.join(" | ")}`
    );
  },

  async importAnalyzedRecord({ record, file }) {
    const user = await authService.getCurrentUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    /*
     * IMPORTANT:
     * This is the currently existing doctor-selection logic.
     * In a production system, use the actual authorized doctor
     * associated with the patient's consultation/session.
     */
    const { data: doctors, error: doctorLookupError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("role", "doctor")
        .limit(1);

    if (doctorLookupError) {
      throw new Error(
        `Could not identify the doctor: ${doctorLookupError.message}`
      );
    }

    const targetDoctorId =
      doctors && doctors.length > 0
        ? doctors[0].id
        : user.id;

    const row = {
      patient_id: user.id,
      doctor_id: targetDoctorId,
      symptoms: Array.isArray(record.symptoms)
        ? record.symptoms.join(", ")
        : "",
      diagnosis:
        String(record.diagnosis || "").trim() ||
        labTitle(record) ||
        "Imported medical record",
      notes: formatNotes(record),
    };

    // STEP 1: Save the imported medical record.
    let { data: saved, error } = await supabase
      .from("medical_records")
      .insert({
        ...row,
        extracted_data: {
          schemaVersion: 1,
          ...record,
        },
      })
      .select()
      .single();

    // Compatibility fallback if extracted_data is not yet a database column.
    if (error && /extracted_data/i.test(error.message || "")) {
      const fallback = await supabase
        .from("medical_records")
        .insert(row)
        .select()
        .single();

      saved = fallback.data;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    // STEP 2: Prepare the medicines extracted from the document.
    const extractedMedications = Array.isArray(record.medications)
      ? record.medications.filter((medicine) =>
          String(medicine?.name || "").trim()
        )
      : [];

    // STEP 3: Insert extracted medicines into prescriptions.
    if (extractedMedications.length > 0) {
      const prescriptionRows = extractedMedications.map(
        (medicine) => {
          const frequency = String(
            medicine.frequency || ""
          ).trim();

          const notes = [
            "IMPORTED HISTORICAL MEDICATION — not a newly issued prescription.",
            record.doctorName
              ? `Document doctor: ${record.doctorName}`
              : "",
            record.hospital
              ? `Source facility: ${record.hospital}`
              : "",
            frequency
              ? `Frequency: ${frequency}`
              : "",
            record.reportDate
              ? `Document report date: ${record.reportDate}`
              : "",
            record.collectionDate
              ? `Visit/collection date: ${record.collectionDate}`
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return {
            patient_id: user.id,
            doctor_id: targetDoctorId,
            medicines: String(medicine.name).trim(),
            dosage:
              String(medicine.dosage || "").trim() || null,
            duration:
              String(medicine.duration || "").trim() || null,
            notes,
          };
        }
      );

      if (extractedMedications.length > 0) {
        const medicationsForImport = extractedMedications.map((medicine) => ({
          name: String(medicine.name || "").trim(),
          dosage: String(medicine.dosage || "").trim(),
          duration: String(medicine.duration || "").trim(),
          frequency: String(medicine.frequency || "").trim(),
          doctorName: String(record.doctorName || "").trim(),
          hospital: String(record.hospital || "").trim(),
          reportDate: String(record.reportDate || "").trim(),
        }));

        const { data: insertedCount, error: prescriptionError } =
          await supabase.rpc("import_patient_prescriptions", {
            p_medications: medicationsForImport,
          });

        if (prescriptionError) {
          console.error(
            "Could not import historical medications:",
            prescriptionError
          );

          throw new Error(
            "The medical record was saved, but the extracted medicines " +
              "could not be added to prescriptions: " +
              prescriptionError.message
          );
        }

        console.log(
          `Imported ${insertedCount} historical medication(s).`
        );
      }
    }

    // STEP 4: Upload the source file if provided.
    if (file) {
      try {
        await labReportService.createLabReport({
          title: `Past Record: ${row.diagnosis}`,
          category: "Lab Report",
          file,
          notes:
            `Imported report document.${
              record.doctorName
                ? ` Physician: ${record.doctorName}`
                : ""
            }`,
          patientId: user.id,
        });
      } catch (fileError) {
        console.warn(
          "Storage upload notice during past record import:",
          fileError
        );
      }
    }

    return saved;
  },
};

export default aiRecordAnalyzerService;