import { DOMAINS } from "@/lib/domains";
import { AssessmentAnswers, DomainResult, OverallProfile, ReflectionAnswers, ReflectionReviewRow } from "@/types";

export function reverseScore(value: number): number {
  return 5 - value;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

export function stageFromScore(score: number): { stage: number; label: string } {
  if (score < 1) return { stage: 1, label: "Very underdeveloped" };
  if (score < 2) return { stage: 2, label: "Emerging but unstable" };
  if (score < 3) return { stage: 3, label: "Developing" };
  if (score < 4) return { stage: 4, label: "Strong and integrated" };
  return { stage: 5, label: "Deeply embodied" };
}

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((sum, word) => sum + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
}

export function basicReflectionScore(text: string, domainId: string): { score: number; notes: string[] } {
  const domain = DOMAINS.find((d) => d.id === domainId);
  if (!domain) return { score: 0, notes: ["Unknown domain."] };
  const trimmed = text.trim();
  if (!trimmed) return { score: 0, notes: ["No reflection entered yet."] };

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const positive = countMatches(trimmed, domain.positiveKeywords);
  const negative = countMatches(trimmed, domain.negativeKeywords);
  const selfAwareness = /(i notice|i tend to|i usually|i often|when i|i feel|i do)/i.test(trimmed) ? 1 : 0;
  const actionOrientation = /(i try|i practice|i breathe|i walk|i talk|i pause|i pray|i journal|i plan|i return)/i.test(trimmed) ? 1 : 0;
  const specificity = /(because|when|after|before|so i|for example)/i.test(trimmed) ? 1 : 0;

  let raw = 1;
  raw += Math.min(positive, 2) * 0.8;
  raw -= Math.min(negative, 2) * 0.6;
  raw += selfAwareness * 0.8;
  raw += actionOrientation * 0.8;
  raw += specificity * 0.6;
  raw += wordCount >= 20 ? 0.5 : 0;
  raw += wordCount >= 40 ? 0.5 : 0;

  const score = clamp(Number(raw.toFixed(2)), 0, 5);
  const notes = [];
  if (selfAwareness) notes.push("Shows self-observation.");
  if (specificity) notes.push("Uses specific examples or cause-and-effect language.");
  if (actionOrientation) notes.push("Mentions a response, practice, or stabilizing action.");
  if (negative > positive) notes.push("Shows more struggle language than stabilizing language.");
  if (wordCount < 12) notes.push("Very short response; score may be less reliable.");
  notes.push("Basic reflection scoring is heuristic only.");
  return { score, notes };
}

export function computeDomainResult(input: {
  domainId: string;
  answers: AssessmentAnswers;
  reflections: ReflectionAnswers;
  reflectionScore?: number;
  reflectionNotes?: string[];
  reflectionSource?: DomainResult["reflectionSource"];
}): DomainResult {
  const domain = DOMAINS.find((d) => d.id === input.domainId);
  if (!domain) {
    throw new Error(`Unknown domain: ${input.domainId}`);
  }

  const coreAvg = domain.core.reduce((sum, _, i) => sum + Number(input.answers[`${domain.id}_core_${i}`] ?? 0), 0) / domain.core.length;
  const contradictionAvg = domain.contradictions.reduce((sum, _, i) => sum + reverseScore(Number(input.answers[`${domain.id}_con_${i}`] ?? 0)), 0) / domain.contradictions.length;
  const reflectionMeta = input.reflectionScore !== undefined
    ? { score: clamp(input.reflectionScore, 0, 5), notes: input.reflectionNotes ?? [] }
    : basicReflectionScore(input.reflections[domain.id] ?? "", domain.id);

  const finalScore = Number((coreAvg * 0.7 + contradictionAvg * 0.15 + reflectionMeta.score * 0.15).toFixed(2));
  const stageInfo = stageFromScore(finalScore);

  return {
    domainId: domain.id,
    title: domain.title,
    coreAvg: Number(coreAvg.toFixed(2)),
    contradictionAvg: Number(contradictionAvg.toFixed(2)),
    reflectionScore: Number(reflectionMeta.score.toFixed(2)),
    finalScore,
    stage: stageInfo.stage,
    label: stageInfo.label,
    notes: reflectionMeta.notes,
    reflectionSource: input.reflectionSource ?? "basic",
  };
}

export function scoreAssessmentBasic(answers: AssessmentAnswers, reflections: ReflectionAnswers): DomainResult[] {
  return DOMAINS.map((domain) => computeDomainResult({ domainId: domain.id, answers, reflections }));
}

export function getOverallProfile(results: DomainResult[]): OverallProfile {
  const average = results.reduce((sum, r) => sum + r.finalScore, 0) / results.length;
  const sorted = [...results].sort((a, b) => a.finalScore - b.finalScore);
  const lowestThreeAvg = sorted.slice(0, 3).reduce((sum, r) => sum + r.finalScore, 0) / 3;
  const variability = Math.max(...results.map((r) => r.finalScore)) - Math.min(...results.map((r) => r.finalScore));
  const composite = lowestThreeAvg * 0.6 + average * 0.4;
  return {
    average: Number(average.toFixed(2)),
    lowestThreeAvg: Number(lowestThreeAvg.toFixed(2)),
    variability: Number(variability.toFixed(2)),
    strongest: [...results].sort((a, b) => b.finalScore - a.finalScore).slice(0, 3),
    weakest: sorted.slice(0, 3),
    ...stageFromScore(composite),
  };
}

export function applyReviewOverrides(params: {
  answers: AssessmentAnswers;
  reflections: ReflectionAnswers;
  existingResults?: DomainResult[] | null;
  reviews: ReflectionReviewRow[];
}): DomainResult[] {
  const reviewMap = new Map(params.reviews.map((review) => [review.domain_id, review]));

  return DOMAINS.map((domain) => {
    const review = reviewMap.get(domain.id);
    const hasHumanOverride = review?.human_score !== null && review?.human_score !== undefined;
    const chosenScore = hasHumanOverride
      ? Number(review?.human_score)
      : review?.ai_score !== null && review?.ai_score !== undefined
        ? Number(review.ai_score)
        : params.existingResults?.find((r) => r.domainId === domain.id)?.reflectionScore;

    const notes: string[] = [];
    if (review?.ai_explanation) notes.push(review.ai_explanation);
    if (review?.ai_confidence) notes.push(`AI confidence: ${review.ai_confidence}`);
    if (review?.human_notes) notes.push(`Human notes: ${review.human_notes}`);

    return computeDomainResult({
      domainId: domain.id,
      answers: params.answers,
      reflections: params.reflections,
      reflectionScore: chosenScore,
      reflectionNotes: notes,
      reflectionSource: hasHumanOverride ? "human_override" : review?.ai_score !== null && review?.ai_score !== undefined ? "ai" : "basic",
    });
  });
}
