import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { applyReviewOverrides, getOverallProfile } from "@/lib/scoring";
import { SubmissionRow, ReflectionReviewRow } from "@/types";
import { getAdminPassword, ADMIN_COOKIE } from "@/lib/auth";

function isAuthorized(request: NextRequest) {
  const expected = getAdminPassword();
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(expected) && cookie === expected;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ reviewId: string }> }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { reviewId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const humanScore = body.humanScore === null || body.humanScore === undefined || body.humanScore === "" ? null : Number(body.humanScore);
    const humanNotes = typeof body.humanNotes === "string" ? body.humanNotes : null;
    const status = body.status === "reviewed" ? "reviewed" : "pending";

    if (humanScore !== null && (!Number.isFinite(humanScore) || humanScore < 0 || humanScore > 5)) {
      return NextResponse.json({ error: "humanScore must be between 0 and 5." }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: reviewRow, error: reviewError } = await supabase
      .from("reflection_reviews")
      .update({
        human_score: humanScore,
        human_notes: humanNotes,
        final_score: humanScore,
        status,
      })
      .eq("id", reviewId)
      .select("id, submission_id, domain_id, ai_score, ai_confidence, ai_explanation, human_score, human_notes, final_score, status, created_at, updated_at")
      .single();

    if (reviewError || !reviewRow) {
      throw reviewError || new Error("Review not found.");
    }

    const submissionId = reviewRow.submission_id;

    const [{ data: submissionRow, error: submissionError }, { data: allReviews, error: allReviewsError }] = await Promise.all([
      supabase
        .from("assessment_submissions")
        .select("id, participant_name, scoring_mode, answers, reflections, domain_results, overall_profile, review_status, human_override, created_at, updated_at")
        .eq("id", submissionId)
        .single(),
      supabase
        .from("reflection_reviews")
        .select("id, submission_id, domain_id, ai_score, ai_confidence, ai_explanation, human_score, human_notes, final_score, status, created_at, updated_at")
        .eq("submission_id", submissionId),
    ]);

    if (submissionError || !submissionRow) {
      throw submissionError || new Error("Submission not found.");
    }
    if (allReviewsError || !allReviews) {
      throw allReviewsError || new Error("Could not load related reviews.");
    }

    const typedSubmission = submissionRow as SubmissionRow;
    const typedReviews = allReviews as ReflectionReviewRow[];

    const recomputedResults = applyReviewOverrides({
      answers: typedSubmission.answers,
      reflections: typedSubmission.reflections,
      existingResults: typedSubmission.domain_results,
      reviews: typedReviews,
    });
    const recomputedOverall = getOverallProfile(recomputedResults);

    const humanOverrideMap = typedReviews.reduce<Record<string, { score: number; notes?: string }>>((acc, row) => {
      if (row.human_score !== null && row.human_score !== undefined) {
        acc[row.domain_id] = {
          score: Number(row.human_score),
          notes: row.human_notes ?? undefined,
        };
      }
      return acc;
    }, {});

    const allReviewed = typedReviews.every((row) => row.status === "reviewed");

    const { error: updateSubmissionError } = await supabase
      .from("assessment_submissions")
      .update({
        domain_results: recomputedResults,
        overall_profile: recomputedOverall,
        human_override: humanOverrideMap,
        review_status: allReviewed ? "reviewed" : "pending",
      })
      .eq("id", submissionId);

    if (updateSubmissionError) throw updateSubmissionError;

    return NextResponse.json({
      ok: true,
      review: reviewRow,
      submissionId,
      results: recomputedResults,
      overall: recomputedOverall,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error." }, { status: 500 });
  }
}
