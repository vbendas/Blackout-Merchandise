# syntax=docker/dockerfile:1
#
# Print worker image (Print-Prep-Plan section 12): the Node 20 process in
# platform/worker/print-worker.ts, which pulls jobs from print_jobs and runs
# lib/print/pipeline.ts. Run it on an EU container host with 8 GB of memory: a
# full front at 600 ppi peaks at about 3.6 GB (measured, Oct 2026), and two
# screen sets of 15 films would need more. Give the container a restart policy
# (always): the worker exits cleanly every PRINT_WORKER_MAX_JOBS jobs (25) to
# hand back the PSD decoder's memory, and after a job that times out.
#
# Build from the REPOSITORY ROOT, because the worker imports ../src/db/schema.ts:
#   docker build -f platform/worker/Dockerfile -t merchfrom-print-worker .
# (platform/worker/Dockerfile.dockerignore keeps the context to the sources.)
#
# Environment the container needs:
#   DATABASE_URL                                 the Neon connection string
#   PRINT_STORAGE_DRIVER=r2 (set below), R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
#   R2_SECRET_ACCESS_KEY, R2_BUCKET              and R2_PUBLIC_BUCKET when proofs
#                                                have their own public bucket
#   PACKSHOT_BASE_URL                            where /packshots/<file> is served
#                                                (public/ is not in this image)
#   FAL_API_KEY and the rest of what the pipeline's services read
#   RESEND_API_KEY and EMAIL_FROM                the artist's re-approval emails are
#                                                sent from the worker
# Optional tuning: PRINT_WORKER_* and PRINT_JOB_* (see worker/config.ts).
#
# Stop it with SIGTERM (docker stop): it finishes or hands back its job within
# PRINT_WORKER_SHUTDOWN_GRACE_MS (8 s by default, under Docker's 10 s). To let a
# render finish instead, raise both, e.g. 120000 and `docker stop -t 130`.
FROM node:20-bookworm-slim

# fontconfig and one font: sharp renders text (the label strip) through
# librsvg, which draws nothing without a system font.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/platform
COPY platform/package.json platform/package-lock.json ./
# tsx, which runs the TypeScript, is a devDependency, so install everything.
# NODE_ENV is set after this: production would skip the dev dependencies.
RUN npm ci --no-audit --no-fund

COPY platform/ ./
COPY src/db/ /app/src/db/

# Typed arrays and Buffers live outside V8's heap, so this caps only the JS
# objects; the host's memory limit is what bounds the renders.
ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=3072 \
    PRINT_STORAGE_DRIVER=r2

USER node
STOPSIGNAL SIGTERM
# node runs as PID 1 and handles SIGTERM itself; tsx is loaded as a hook, so
# there is no wrapper process between the host and the worker.
CMD ["node", "--import", "tsx", "worker/print-worker.ts"]
