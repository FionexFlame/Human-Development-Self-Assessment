# Human Development Assessment — Next.js Scaffold

This is a deployable Next.js App Router project for your Human Development Self-Assessment website.

It includes three scoring levels for reflection questions:

## Level 1 — Basic rule-based scoring
- Runs locally
- No API cost
- Uses keywords, specificity checks, and self-awareness cues
- Best for MVP testing

## Level 2 — AI scoring
- Calls the OpenAI API for reflection scoring
- Uses a rubric for honesty, specificity, self-awareness, and developmental capacity
- Returns score, confidence, and short explanation

## Level 3 — AI + human override
- AI creates draft scores
- Submission and per-domain review records are stored in Supabase
- Human reviewer can override reflection scores later
- Best for trust and quality control

---

## Phase 4 additions — compliance-oriented email layer

This version adds a practical compliance layer around participant email handling:
- separate required **service emails** from optional **follow-up/marketing emails**
- consent version tracking on submission
- consent event logging with source, IP, and user agent
- participant preference center with tokenized links
- one-click unsubscribe path for non-essential emails
- email suppression when service email preference is turned off
- email event logging for sends, previews, failures, and suppressions
- starter Privacy and Terms pages for replacement with your real legal text

This is not legal advice. It is an operational compliance scaffold so you are not collecting and emailing people without basic controls in place.

---

## 1. Install

```bash
npm install
```

## 2. Add environment variables

Copy `.env.example` to `.env.local` and fill in the values.

```bash
cp .env.example .env.local
```

Minimum needed to run Level 1 only:
- none for local preview

Needed for Level 2:
- `OPENAI_API_KEY`

Needed for persistence and review:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`

Needed for email sending:
- `NEXT_PUBLIC_APP_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Optional compliance setting:
- `NEXT_PUBLIC_CONSENT_VERSION`

If SMTP is not configured, the app will still work, but email sends will be logged as preview-only.

## 3. Start the app

```bash
npm run dev
```

Visit:
- `/` for the landing page
- `/assessment` for the assessment
- `/my-results` for participant guidance
- `/results/[id]?token=...` for private result pages
- `/email-preferences/[token]` for participant email settings
- `/unsubscribe/[token]` for quick unsubscribe
- `/privacy` and `/terms` for starter legal pages
- `/admin/login` for admin sign-in
- `/admin/reviews` for the protected review queue

---

## Database setup

Run the SQL in `lib/db.sql` in your Supabase SQL editor.

That creates:
- `assessment_participants`
- `assessment_submissions`
- `reflection_reviews`
- `email_consent_events`
- `email_events`
- `updated_at` triggers

---

## Compliance behavior in this build

### Service emails
Participants must consent to service emails to save and receive requested results. This category covers:
- requested result delivery
- manual result resend by admin
- accountless workflow messages tied to the submitted assessment

### Optional follow-up emails
Participants can separately opt into optional follow-up emails such as:
- growth resources
- updates
- workshops
- future offers

### Preference center
Each participant receives a tokenized preference link that lets them:
- turn service emails on or off
- turn optional follow-up emails on or off

### Consent logging
The app stores a record of:
- consent type
- granted or revoked status
- policy version
- statement text
- source
- IP address
- user agent

### Email logging
The app stores a record of:
- attempted sends
- successful sends
- preview-only sends when SMTP is missing
- failures
- suppressions due to preferences

---

## Suggested next upgrades after this

- replace starter Privacy and Terms pages with lawyer-reviewed documents
- add region-specific consent rules if you serve multiple jurisdictions
- add data retention/deletion workflows
- add admin pages for viewing consent history and suppression logs
- add double opt-in for optional marketing emails if desired
- add webhook-based provider delivery tracking if you move beyond SMTP
