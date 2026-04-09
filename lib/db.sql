create extension if not exists pgcrypto;

create table if not exists assessment_participants (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  latest_submission_id uuid,
  unsubscribe_token text unique not null default encode(gen_random_bytes(18), 'hex'),
  service_emails_opt_in boolean not null default true,
  marketing_emails_opt_in boolean not null default false,
  service_email_consented_at timestamptz,
  marketing_email_consented_at timestamptz,
  all_email_revoked_at timestamptz,
  marketing_email_revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  participant_name text,
  participant_email text,
  participant_id uuid references assessment_participants(id) on delete set null,
  scoring_mode text not null check (scoring_mode in ('basic', 'ai', 'review')),
  answers jsonb not null,
  reflections jsonb not null,
  domain_results jsonb,
  overall_profile jsonb,
  review_status text default 'pending' check (review_status in ('pending', 'reviewed', 'not_required')),
  human_override jsonb,
  public_token text unique not null default encode(gen_random_bytes(18), 'hex'),
  email_delivery_status text default 'pending' check (email_delivery_status in ('pending', 'sent', 'failed', 'suppressed', 'not_requested')),
  emailed_at timestamptz,
  consent_version text,
  service_email_consent boolean default false,
  marketing_email_consent boolean default false,
  consent_statement_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reflection_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references assessment_submissions(id) on delete cascade,
  domain_id text not null,
  ai_score numeric,
  ai_confidence text,
  ai_explanation text,
  human_score numeric,
  human_notes text,
  final_score numeric,
  status text default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(submission_id, domain_id)
);

create table if not exists email_consent_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references assessment_participants(id) on delete cascade,
  submission_id uuid references assessment_submissions(id) on delete set null,
  email text not null,
  consent_type text not null check (consent_type in ('service', 'marketing', 'all_email')),
  status text not null check (status in ('granted', 'revoked')),
  policy_version text,
  statement_text text,
  source text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references assessment_participants(id) on delete cascade,
  submission_id uuid references assessment_submissions(id) on delete set null,
  email text,
  category text not null check (category in ('results', 'marketing', 'admin_resend')),
  event_type text not null check (event_type in ('attempted', 'sent', 'failed', 'suppressed', 'preview_only')),
  provider_message text,
  created_at timestamptz default now()
);

alter table assessment_participants
  add constraint assessment_participants_latest_submission_fk
  foreign key (latest_submission_id) references assessment_submissions(id) on delete set null;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_assessment_participants_updated_at ON assessment_participants;
create trigger set_assessment_participants_updated_at
before update on assessment_participants
for each row execute function set_updated_at();

DROP TRIGGER IF EXISTS set_assessment_submissions_updated_at ON assessment_submissions;
create trigger set_assessment_submissions_updated_at
before update on assessment_submissions
for each row execute function set_updated_at();

DROP TRIGGER IF EXISTS set_reflection_reviews_updated_at ON reflection_reviews;
create trigger set_reflection_reviews_updated_at
before update on reflection_reviews
for each row execute function set_updated_at();
