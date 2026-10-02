#!/usr/bin/env bash
# Build and deploy the API to Cloud Run (Cloud Build builds the Dockerfile; no local Docker needed).
# Usage: npm run deploy
set -euo pipefail

PROJECT="${GCP_PROJECT:-learners-hub-app}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="${SERVICE:-learners-hub-api}"
INSTANCE="${SQL_INSTANCE:-$PROJECT:$REGION:lh-db}"
DB_USER="${DB_USER:-app}"
DB_NAME="${DB_NAME:-learnershub}"
# Secret Manager secret names holding the database password and the YouTube Data API key.
DB_PASSWORD_SECRET="${DB_PASSWORD_SECRET:-db-password}"
YOUTUBE_SECRET="${YOUTUBE_SECRET:-youtube-api-key}"
# Comma-separated web origins allowed to call the API directly (the Vercel rewrite does not need this).
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"

gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --add-cloudsql-instances "$INSTANCE" \
  --set-env-vars "^|^GCP_PROJECT=$PROJECT|GCP_LOCATION=$REGION|DB_SOCKET=/cloudsql/$INSTANCE|DB_USER=$DB_USER|DB_NAME=$DB_NAME|MIGRATE_ON_START=true|ALLOWED_ORIGINS=$ALLOWED_ORIGINS" \
  --set-secrets "DB_PASSWORD=$DB_PASSWORD_SECRET:latest,YOUTUBE_API_KEY=$YOUTUBE_SECRET:latest" \
  --timeout 600 \
  --memory 512Mi \
  --max-instances 3

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')"
echo
echo "API deployed: $URL"
echo "Health check: $(curl -fsS "$URL/healthz" || echo 'failed')"
echo "Put this URL in vercel.json (the /api rewrite) if it changed."
