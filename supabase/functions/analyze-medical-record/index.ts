// supabase/functions/analyze-medical-record/index.ts
//
// Deploy with:
//   supabase functions deploy analyze-medical-record
//
// Set your key once (never expose this in frontend code):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Called from the frontend via supabase.functions.invoke("analyze-medical-record", { body: {...} })

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = "claude-sonnet-4-6"; // vision-capable

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a clinical document parser. You will be shown a scanned medical
report, discharge summary, lab report, or prescription (as an image or PDF), or given pasted
report text. Extract the following fields as accurately as possible from ONLY what is actually
present in the document. Do not invent or guess information that is not there.

Respond with ONLY a raw JSON object (no markdown fences, no preamble) in exactly this shape:

{
  "diagnosis": "string - the diagnosis, impression, or main clinical finding. If genuinely not present, use an empty string.",
  "symptoms": "string - reported symptoms or chief complaints, comma separated. If none found, use an empty string.",
  "doctorName": "string - attending doctor / physician / hospital name, including 'Dr.' prefix if present. If not found, use an empty string.",
  "notes": "string - relevant clinical notes, treatment, advice, or remarks. If none found, use an empty string.",
  "confidenceScore": "number 0-100 - your genuine confidence that these fields were correctly read from the document. Use a LOW score (below 50) if the image is blank, unreadable, unrelated to medicine, or if you could not confidently extract most fields."
}`;

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!ANTHROPIC_API_KEY) {
    return errorResponse("ANTHROPIC_API_KEY is not configured on the server.", 500);
  }

  try {
    const { fileBase64, fileMediaType, textContent, fileName } = await req.json();

    if (!fileBase64 && !textContent?.trim()) {
      return errorResponse("Provide either a file or pasted text to analyze.");
    }

    // Build the user message content blocks
    const contentBlocks: Record<string, unknown>[] = [];

    if (fileBase64 && fileMediaType) {
      if (fileMediaType === "application/pdf") {
        contentBlocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
        });
      } else if (fileMediaType.startsWith("image/")) {
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: fileMediaType, data: fileBase64 },
        });
      }
      // Unsupported binary types just fall through to text-only below
    }

    let instructionText = `File name: ${fileName || "unknown"}\n`;
    if (textContent?.trim()) {
      instructionText += `\nPasted/additional text from the patient:\n${textContent.trim()}\n`;
    }
    instructionText += `\nExtract the clinical fields as instructed and return ONLY the JSON object.`;

    contentBlocks.push({ type: "text", text: instructionText });

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: contentBlocks }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return errorResponse("AI analysis failed. Please try again.", 502);
    }

    const data = await anthropicRes.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    const rawText = (textBlock?.text || "").trim();

    // Strip markdown fences if the model added them despite instructions
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse model output as JSON:", rawText);
      return errorResponse("Could not parse AI response. Please try again.", 502);
    }

    const result = {
      diagnosis: parsed.diagnosis || "",
      symptoms: parsed.symptoms || "",
      doctorName: parsed.doctorName || "",
      notes: parsed.notes || "",
      confidenceScore:
        typeof parsed.confidenceScore === "number"
          ? Math.max(0, Math.min(100, Math.round(parsed.confidenceScore)))
          : 50,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-medical-record error:", err);
    return errorResponse("Unexpected server error during analysis.", 500);
  }
});