import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase";
import ReviewEditorClient from "@/components/admin/ReviewEditorClient";
import type { SubmissionRow, ReflectionReviewRow } from "@/types";

async function getSubmissionForReview(submissionId: string) {
  try {
    const supabase = getServiceSupabase();

    const [{ data: submission }, { data: reviews }] = await Promise.all([
      supabase
        .from("assessment_submissions")
        .select(
          "id, participant_id, participant_name, participant_email, answers, reflections, domain_results, overall_profile, review_status, human_override, public_token, email_delivery_status, emailed_at, created_at, updated_at"
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

    return {
      submission: (submission ?? null) as SubmissionRow | null,
      reviews: (reviews ?? []) as ReflectionReviewRow[],
    };
  } catch (error) {
    console.error("Failed to load review submission:", error);
    return {
      submission: null,
      reviews: [],
    };
  }
}

function formatDate(date?: string | null) {
  if (!date) return "Unknown date";

  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export default async function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  await requireAdminAuth();

  const { submissionId } = await params;

  if (!submissionId) {
    redirect("/admin/reviews");
  }

  const { submission, reviews } = await getSubmissionForReview(submissionId);

  if (!submission) {
    notFound();
  }

  const domainResults = Array.isArray(submission.domain_results)
    ? submission.domain_results
    : [];

  const reflections =
    submission.reflections && typeof submission.reflections === "object"
      ? (submission.reflections as Record<string, string>)
      : {};

  const reviewMap = new Map(reviews.map((review) => [review.domain_id, review]));

  const reviewItems = Object.entries(reflections).map(([domainId, text]) => {
    const matchingResult = domainResults.find((result: any) => result.domainId === domainId);
    const matchingReview = reviewMap.get(domainId);

    return {
      domainId,
      title: matchingResult?.title || domainId,
      reflectionText: text || "",
      currentReflectionScore: matchingResult?.reflectionScore ?? null,
      currentFinalScore: matchingResult?.finalScore ?? null,
      existingNotes: Array.isArray(matchingResult?.notes) ? matchingResult.notes : [],
      reviewId: matchingReview?.id ?? null,
      aiScore: matchingReview?.ai_score ?? null,
      aiConfidence: matchingReview?.ai_confidence ?? null,
      aiExplanation: matchingReview?.ai_explanation ?? null,
      humanScore: matchingReview?.human_score ?? null,
      humanNotes: matchingReview?.human_notes ?? null,
      finalScore: matchingReview?.final_score ?? null,
      reviewStatus: matchingReview?.status ?? "pending",
    };
  });

  return (
    <main className="container">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 620px" }}>
            <div className="badge">Submission review editor</div>
            <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 8 }}>
              Review submission
            </h1>
            <p className="small" style={{ lineHeight: 1.8, marginBottom: 0, maxWidth: 900 }}>
              Use this page to manually adjust reflection scores, add reviewer notes, and send the
              participant their final reviewed results.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="button secondary" href="/admin/reviews">
              Back to review queue
            </Link>
            <Link
              className="button secondary"
              href={`/results/${submission.id}?token=${submission.public_token || ""}`}
            >
              Open participant result
            </Link>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 18 }}>
          <div className="metric">
            <div className="small">Participant</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
              {submission.participant_name || "Unnamed participant"}
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              {submission.participant_email || "No email"}
            </div>
          </div>

          <div className="metric">
            <div className="small">Submission details</div>
            <div className="small" style={{ marginTop: 8, lineHeight: 1.8 }}>
              Submission ID: <strong>{submission.id}</strong>
              <br />
              Review status: <strong>{submission.review_status || "unknown"}</strong>
              <br />
              Email delivery: <strong>{submission.email_delivery_status || "unknown"}</strong>
              <br />
              Created: <strong>{formatDate(submission.created_at)}</strong>
            </div>
          </div>
        </div>
      </div>

      <ReviewEditorClient
        submissionId={submission.id}
        participantName={submission.participant_name || "Unnamed participant"}
        reviewItems={reviewItems}
      />
    </main>
  );
}