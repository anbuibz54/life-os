ALTER TABLE "cards" ADD COLUMN "learning_steps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "learning_steps" integer DEFAULT 0 NOT NULL;