import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
    import.meta.env.VITE_GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: import.meta.env.VITE_GEMINI_MODEL,
    generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 2048,
    },
});

const llmService = {
    async analyzeMedicalDocument(documentText) {
        try {
            const prompt = `
You are an expert medical document analysis AI.

Analyze the following medical document.

Return ONLY valid JSON.

Do not return markdown.
Do not return explanation.
Do not wrap inside \`\`\`.

Return exactly in this format:

{
  "hospital": "",
  "doctorName": "",
  "patientName": "",
  "visitDate": "",
  "diagnosis": "",
  "symptoms": [],
  "medications": [],
  "tests": [],
  "notes": "",
  "confidenceScore": 95
}

Medical Document:

${documentText}
`;

            const result = await model.generateContent(prompt);

            const response = await result.response;

            const text = response
                .text()
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            return JSON.parse(text);

        } catch (error) {
            console.error("Gemini Error:", error);
            throw error;
        }
    },
};

export default llmService;