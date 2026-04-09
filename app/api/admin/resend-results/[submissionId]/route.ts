import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminPassword } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import { applyReviewOverrides, getOverallProfile } from "@/lib/scoring";
import { sendAssessmentResultEmail } from "@/lib/email";
import type { ReflectionReviewRow, SubmissionRow } from "@/types";

function isAuthorized(request: NextRequest) {
  const expected = getAdminPassword();
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(expected) && cookie === expected;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { submissionId } = await params;

  try {
    const supabase = getServiceSupabase();

    const [{ data: submission }, { data: reviews }] = await Promise.all([
      supabase
        .from("assessment_submissions")
        .select(
          "id, participant_name, participant_email, participant_id, scoring_mode, answers, reflections, domain_results, overall_profile, review_status, human_override, public_token, email_delivery_status, emailed_at, created_at, updated_at"
        )
        .eq("id", submissionId)
        .single(),
      supabase
        .from("reflection_reviews")
        .select(
          "id, submission_id, domain_id, ai_score, ai_confidence, ai_explanation, human_score, human_notes, final_score, status, created_at, updated_at"
        )
        .eq("submission_id", submissionId),
    ]);

    const row = submission as SubmissionRow | null;

    if (!row?.participant_email || !row.public_token) {
      return NextResponse.json(
        { error: "Submission is missing email or token." },
        { status: 400 }
      );
    }

    const { data: participant } = await supabase
      .from("assessment_participants")
      .select("id, unsubscribe_token, service_emails_opt_in")
      .eq("id", row.participant_id)
      .single();

    if (!participant?.service_emails_opt_in || !participant.unsubscribe_token) {
      await supabase.from("email_events").insert({
        participant_id: row.participant_id,
        submission_id: submissionId,
        email: row.participant_email,
        category: "admin_resend",
        event_type: "suppressed",
        provider_message: "Admin resend blocked because service email preference is off.",
      });

      return NextResponse.json(
        { error: "Service email preference is off for this participant." },
        { status: 400 }
      );
    }

    const reviewRows = (reviews ?? []) as ReflectionReviewRow[];

    const computedResults = reviewRows.length
      ? applyReviewOverrides({
          answers: row.answers,
          reflections: row.reflections,
          existingResults: row.domain_results,
          reviews: reviewRows,
        })
      : row.domain_results || [];

    const overall = getOverallProfile(computedResults);

    const isFinal =
      row.review_status === "reviewed" ||
      row.review_status === "finalized" ||
      row.human_override === true ||
      reviewRows.some(
        (review) =>
          review.status === "reviewed" ||
          review.status === "approved" ||
          review.human_score != null ||
          review.final_score != null
      );

    await supabase.from("email_events").insert({
      participant_id: row.participant_id,
      submission_id: submissionId,
      email: row.participant_email,
      category: "admin_resend",
      event_type: "attempted",
      provider_message: isFinal
        ? "Admin triggered final results resend."
        : "Admin triggered initial results resend.",
    });

    const sendResult = await sendAssessmentResultEmail({
      to: row.participant_email,
      participantName: row.participant_name || "there",
      submissionId: row.id,
      publicToken: row.public_token,
      unsubscribeToken: participant.unsubscribe_token,
      overall,
      results: computedResults,
      isFinal,
    });

    await supabase
      .from("assessment_submissions")
      .update({
        email_delivery_status: sendResult.ok
          ? "sent"
          : sendResult.skipped
          ? "pending"
          : "failed",
        emailed_at: sendResult.ok ? new Date().toISOString() : null,
      })
      .eq("id", submissionId);

    await supabase.from("email_events").insert({
      participant_id: row.participant_id,
      submission_id: submissionId,
      email: row.participant_email,
      category: "admin_resend",
      event_type: sendResult.ok
        ? "sent"
        : sendResult.skipped
        ? "preview_only"
        : "failed",
      provider_message: sendResult.ok
        ? isFinal
          ? "Admin final results resend sent."
          : "Admin initial results resend sent."
        : sendResult.skipped
        ? "SMTP not configured; preview only."
        : "Admin resend failed.",
    });

    return NextResponse.json({ ok: true, isFinal });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to resend results.",
      },
      { status: 500 }
    );
  }
}