CREATE UNIQUE INDEX "print_jobs_active_hash_unique" ON "print_jobs" USING btree ("input_hash","kind") WHERE "print_jobs"."status" in ('queued', 'running');--> statement-breakpoint
-- Shop products print DTG/DTF only; screen print is for runs (Print-Prep-Plan section 1). Rows the catalogue seed has not made yet get the flag from scripts/seed.ts.
UPDATE "print_services" SET "available_in_shop" = false WHERE "code" LIKE 'screen\_%';--> statement-breakpoint
UPDATE "print_services" SET "available_in_shop" = true WHERE "code" IN ('dtg', 'dtf');
