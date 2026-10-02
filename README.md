# Learners Hub

Learning paths for small teams, built from free courses and videos. An admin or manager describes a job role, AI finds free lessons (YouTube, Microsoft Learn, Khan Academy and others), orders them into modules and writes short checks. An admin reviews and publishes the path, then managers assign it with due dates and track progress.

## How it fits together

| Part | Tech | Hosted on |
|---|---|---|
| Web app (`src/`) | React, Vite, Tailwind, TanStack Query | Vercel |
| API (`server/`) | Hono on Node, Drizzle ORM | Google Cloud Run (`learners-hub-api`, europe-west1) |
| Database | PostgreSQL | Cloud SQL (`learners-hub-app:europe-west1:lh-db`) |
| Sign-in | Identity Platform (Firebase Auth): Google or email | Google Cloud |
| AI | Gemini on Vertex AI, YouTube Data API | Google Cloud |

The browser only ever talks to the Vercel domain. Vercel forwards `/api/*` to Cloud Run (see `vercel.json`), so the long Cloud Run URL stays hidden and there are no cross-site issues. Requests carry a Firebase ID token; the API verifies it and scopes every query to the caller's organisation.

**Roles:** members learn; managers build draft paths and assign to their direct reports; admins and owners publish paths and manage people.

**Progress:** videos complete once 80% has really been watched. The player sends a heartbeat every 10 s, and the server only credits forward, real-time playback (`server/lib/progress.ts`), so skipping to the end doesn't count. Web courses are marked done by the learner. Each module has a 3-question check (pass mark 2/3).

## Run locally

Prerequisites: Node 22+, the [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) and the gcloud CLI signed in to an account with access to `learners-hub-app`.

```bash
gcloud auth login
gcloud auth application-default login   # the API uses these credentials for Vertex AI
npm install
npm run db:proxy                         # terminal 1: database on 127.0.0.1:5433
npm run db:migrate                       # first time and after schema changes
npm run dev                              # terminal 2: API on :8080, web app on http://localhost:5173
```

`.env.local` (never committed) needs:

```
GCP_PROJECT=learners-hub-app
GCP_LOCATION=europe-west1
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=learners-hub-app
YOUTUBE_API_KEY=...
DATABASE_URL=postgres://app:<password>@127.0.0.1:5433/learnershub
```

On Windows, npm must run scripts with Git Bash. Add a local `.npmrc` (git-ignored) containing `script-shell=C:\Program Files\Git\bin\bash.exe`.

Other commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run db:generate` (after editing `server/db/schema.ts`).

## Deploy

**API → Cloud Run.** `npm run deploy` runs `scripts/deploy.sh`, which builds the `Dockerfile` with Cloud Build and deploys `learners-hub-api`. It expects two Secret Manager secrets, `db-password` and `youtube-api-key`, and the Cloud Run service account needs the *Cloud SQL Client*, *Secret Manager Secret Accessor* and *Vertex AI User* roles. Migrations run automatically on startup.

**Web app → Vercel.** Import the GitHub repo in Vercel (framework: Vite). Set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` and `VITE_FIREBASE_PROJECT_ID` in the Vercel project's environment variables. Put the Cloud Run URL in the `/api` rewrite in `vercel.json`. Then add the Vercel domain (and any custom domain) to **Identity Platform → Settings → Authorized domains**, or Google sign-in will be refused.

**Custom domain:** add it in Vercel → Project → Domains, create the DNS record Vercel shows, and add the domain to Identity Platform's authorized domains.
