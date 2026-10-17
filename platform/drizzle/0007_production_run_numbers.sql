-- Run numbers (owner request, 17 Oct 2026): every production job gets one sequential number, from 1001, that the stations and the website's "On the press" board show (platform/lib/services/production-progress.ts). The database hands it out: production_jobs.run_number defaults to the next value of production_run_number_seq, so no code ever passes one. Jobs that exist already are numbered once, oldest first (created_at, then id), and the sequence goes on after the highest number; an empty table's first job is 1001. Additive only, and safe to run again: the sequence, the column and the index are made only when they are missing, a job that has a number keeps it, and the sequence never goes back.
CREATE SEQUENCE IF NOT EXISTS "public"."production_run_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1;--> statement-breakpoint
ALTER TABLE "production_jobs" ADD COLUMN IF NOT EXISTS "run_number" integer;--> statement-breakpoint
UPDATE "production_jobs" AS "job" SET "run_number" = "numbered"."run_number" FROM (SELECT "id", (coalesce((SELECT max("run_number") FROM "production_jobs"), 1000) + row_number() OVER (ORDER BY "created_at", "id"))::integer AS "run_number" FROM "production_jobs" WHERE "run_number" IS NULL) AS "numbered" WHERE "job"."id" = "numbered"."id";--> statement-breakpoint
DO $$
DECLARE
	highest integer;
	next_up bigint;
BEGIN
	SELECT max("run_number") INTO highest FROM "production_jobs";
	IF highest IS NOT NULL THEN
		SELECT CASE WHEN "is_called" THEN "last_value" + 1 ELSE "last_value" END INTO next_up FROM "public"."production_run_number_seq";
		IF highest >= next_up THEN
			PERFORM setval('"public"."production_run_number_seq"', highest);
		END IF;
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "production_jobs" ALTER COLUMN "run_number" SET DEFAULT nextval('production_run_number_seq');--> statement-breakpoint
ALTER TABLE "production_jobs" ALTER COLUMN "run_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "production_jobs_run_number_unique" ON "production_jobs" USING btree ("run_number");
