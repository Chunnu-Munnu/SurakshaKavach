import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const generateAIExplanation = async (device, context) => {
  try {

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const prompt = `
You are a Senior AI Cyber Defense Architect for GhostPrint-MLE, an advanced IoT security platform.

Device Intelligence Context:
${context}

Anomalous Device State:
- ID: ${device.id}
- Label: ${device.name}
- Class: ${device.device_class}
- Status: ${device.state}
- Trust Score: ${device.trust_score?.toFixed(1)}

Detection Sensitivity:
- Isolation Forest: ${device.anomaly_scores?.isolation_forest?.toFixed(4)}
- Temporal LSTM: ${device.anomaly_scores?.temporal?.toFixed(4)}
- ADWIN Drift: ${device.anomaly_scores?.statistical?.toFixed(4)}
- Peer Graph GAT: ${device.anomaly_scores?.peer?.toFixed(4)}

Generate a **GhostPrint Cognitive Audit**:
• Explain why this trust score occurred
• Mention possible attack vectors (C2, beaconing, lateral movement)
• Use SOC terminology
• Maximum 150 words
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    return text || "Neural Audit Inconclusive.";

  } catch (error) {

    console.error("Gemini Error:", error);

    return `Cognitive Link Error: ${error.message}`;
  }
};