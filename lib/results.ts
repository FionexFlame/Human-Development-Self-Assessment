import type { DomainResult, OverallProfile } from "@/types";

export function getStageInterpretation(stage: number) {
  switch (stage) {
    case 1:
      return "This area looks very underdeveloped right now. It likely needs strong support, more stability, and basic rebuilding before it can become dependable.";
    case 2:
      return "This area is emerging, but it is still unstable. There is some awareness here, though stress probably knocks it offline quickly.";
    case 3:
      return "This area is clearly developing. You have some real access here, but consistency is still the main task.";
    case 4:
      return "This area appears strong and increasingly integrated. You can likely rely on it in many real-life situations.";
    case 5:
      return "This area appears deeply embodied. It looks less like something you try to do and more like something you have become.";
    default:
      return "This area is still being assessed.";
  }
}

export function getOverallNarrative(profile: OverallProfile) {
  if (profile.variability >= 2) {
    return "Your profile looks uneven. That usually means you have real strengths, but a few weaker domains are limiting your overall stability and wholeness.";
  }
  if (profile.stage <= 2) {
    return "Your current profile suggests early-stage development in several important areas. The next step is not perfection, but strengthening basic stability, honesty, and follow-through.";
  }
  if (profile.stage === 3) {
    return "Your profile suggests meaningful growth is already happening. The main task now is building consistency so your strengths hold up under pressure.";
  }
  return "Your profile suggests strong overall development with relatively good integration. The main task now is deepening consistency and protecting weaker edges so the whole system stays aligned.";
}

export function getGrowthPriorityText(results: DomainResult[]) {
  return [...results]
    .sort((a, b) => a.finalScore - b.finalScore)
    .slice(0, 3)
    .map((item) => `${item.title}: ${item.finalScore} — ${item.stage === 1 || item.stage === 2 ? "needs stabilization first" : "needs stronger consistency"}`);
}
