import OpenAI from "openai";
import { DOMAINS } from "@/lib/domains";

type AIReflectionScore = {
  score: number;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function scoreReflectionWithAI(
  domainId: string,
  reflection: string
): Promise<AIReflectionScore> {
  const domain = DOMAINS.find((d) => d.id === domainId);

  if (!domain) {
    throw new Error("Unknown domain.");
  }

  const trimmedReflection = reflection.trim();

  if (!trimmedReflection) {
    return {
      score: 0,
      confidence: "low",
      explanation: "No reflection provided.",
    };
  }

  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const prompt = `You are scoring a reflection answer for a Human Development Self-Assessment.

Domain: ${domain.title}
Definition: ${domain.definition}
Question: ${domain.reflection}

Score the reflection from 0 to 5 using these criteria:
- honesty / realism
- specificity
- self-awareness
- evidence of stabilizing action or developmental capacity

Important constraints:
- This is not a diagnosis.
- Do not reward fancy language.
- Reward concrete, real-life awareness.
- A person can openly describe struggle and still score well if the response is specific and self-aware.
- Return strict JSON only with keys: score, confidence, explanation.
- score must be a number from 0 to 5 in increments of 0.5.
- confidence must be low, medium, or high.
- explanation must be under 90 words.

Reflection:
${trimmedReflection}`;

  const response = await client.responses.create({
    model,
    input: prompt,
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  const rawText = response.output_text;

  if (!rawText) {
    throw new Error("AI returned an empty response.");
  }

  let parsed: any;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  const rawScore = Number(parsed.score);
  const roundedScore = Math.round(rawScore * 2) / 2;
  const clampedScore = Math.max(0, Math.min(5, roundedScore));

  const confidence =
    parsed.confidence === "low" ||
    parsed.confidence === "medium" ||
    parsed.confidence === "high"
      ? parsed.confidence
      : "medium";

  const explanation =
    typeof parsed.explanation === "string" && parsed.explanation.trim()
      ? parsed.explanation.trim()
      : "AI scoring completed.";

  if (Number.isNaN(rawScore)) {
    throw new Error("AI returned an invalid score.");
  }

  return {
    score: clampedScore,
    confidence,
    explanation,
  };
}