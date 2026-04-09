export type DomainDefinition = {
  id: string;
  title: string;
  definition: string;
  core: string[];
  contradictions: string[];
  reflection: string;
  growth: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
};

export type AssessmentAnswers = Record<string, number>;
export type ReflectionAnswers = Record<string, string>;

export type DomainResult = {
  domainId: string;
  title: string;
  coreAvg: number;
  contradictionAvg: number;
  reflectionScore: number;
  finalScore: number;
  stage: number;
  label: string;
  notes?: string[];
  reflectionSource?: "basic" | "ai" | "human_override";
};

export type OverallProfile = {
  average: number;
  lowestThreeAvg: number;
  variability: number;
  strongest: DomainResult[];
  weakest: DomainResult[];
  stage: number;
  label: string;
};

export type SubmissionPayload = {
  participantName: string;
  participantEmail: string;
  isAdultConfirmed: boolean;
  consentToEmail: boolean;
  marketingConsent: boolean;
  ageConfirmed18Plus: boolean;
  consentVersion: string;
  answers: AssessmentAnswers;
  reflections: ReflectionAnswers;
  scoringMode?: "basic" | "ai" | "review";
};

export type ReviewStatus = "pending" | "reviewed";

export type ReflectionReviewRow = {
  id: string;
  submission_id: string;
  domain_id: string;
  ai_score: number | null;
  ai_confidence: string | null;
  ai_explanation: string | null;
  human_score: number | null;
  human_notes: string | null;
  final_score: number | null;
  status: ReviewStatus;
  created_at?: string;
  updated_at?: string;
};

export type SubmissionRow = {
  id: string;
  participant_id: string | null;
  participant_name: string | null;
  participant_email: string | null;
  scoring_mode: "basic" | "ai";
  answers: AssessmentAnswers;
  reflections: ReflectionAnswers;
  domain_results: DomainResult[] | null;
  overall_profile: OverallProfile | null;
  review_status: "pending" | "reviewed" | "not_required";
  human_override: Record<string, { score: number; notes?: string }> | null;
  public_token: string | null;
  email_delivery_status: "pending" | "sent" | "failed" | "not_requested" | "suppressed" | null;
  emailed_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ParticipantRow = {
  id: string;
  email: string;
  name: string | null;
  latest_submission_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EmailPreferenceRow = {
  id: string;
  email: string;
  name: string | null;
  unsubscribe_token: string;
  service_emails_opt_in: boolean;
  marketing_emails_opt_in: boolean;
  service_email_consented_at: string | null;
  marketing_email_consented_at: string | null;
  all_email_revoked_at: string | null;
  marketing_email_revoked_at: string | null;
};
