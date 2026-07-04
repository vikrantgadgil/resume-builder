CREATE TABLE "fact" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"text" text NOT NULL,
	"roleRef" text,
	"tags" text[],
	"source" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fact" ADD CONSTRAINT "fact_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;