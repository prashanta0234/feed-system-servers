CREATE TABLE IF NOT EXISTS "users" (
  "id" bigint PRIMARY KEY,
  "username" varchar(50) UNIQUE NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "refresh_token" text,
  "is_ban" bool,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" bigint PRIMARY KEY,
  "user_id" bigint NOT NULL,
  "content" text,
  "image_urls" jsonb,
  "like_count" int DEFAULT 0,
  "dislike_count" int DEFAULT 0,
  "comment_count" int DEFAULT 0,
  "share_count" int DEFAULT 0,
  "created_at" timestamp,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "post_reactions" (
  "id" bigint PRIMARY KEY,
  "post_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "reaction_type" smallint NOT NULL,
  "created_at" timestamp
);

CREATE TABLE IF NOT EXISTS "comments" (
  "id" bigint PRIMARY KEY,
  "post_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "parent_comment_id" bigint,
  "content" text,
  "like_count" int DEFAULT 0,
  "dislike_count" int DEFAULT 0,
  "reply_count" int DEFAULT 0,
  "created_at" timestamp,
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "comment_reactions" (
  "id" bigint PRIMARY KEY,
  "comment_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "reaction_type" smallint NOT NULL,
  "created_at" timestamp
);

-- Indexes (named so IF NOT EXISTS works)
CREATE UNIQUE INDEX IF NOT EXISTS "post_reactions_post_id_user_id_key" ON "post_reactions" ("post_id", "user_id");
CREATE INDEX IF NOT EXISTS "post_reactions_post_id_idx" ON "post_reactions" ("post_id");
CREATE INDEX IF NOT EXISTS "post_reactions_user_id_idx" ON "post_reactions" ("user_id");

CREATE INDEX IF NOT EXISTS "comments_post_id_idx" ON "comments" ("post_id");
CREATE INDEX IF NOT EXISTS "comments_parent_comment_id_idx" ON "comments" ("parent_comment_id");
CREATE INDEX IF NOT EXISTS "comments_created_at_idx" ON "comments" ("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "comment_reactions_comment_id_user_id_key" ON "comment_reactions" ("comment_id", "user_id");
CREATE INDEX IF NOT EXISTS "comment_reactions_comment_id_idx" ON "comment_reactions" ("comment_id");
CREATE INDEX IF NOT EXISTS "comment_reactions_user_id_idx" ON "comment_reactions" ("user_id");

COMMENT ON COLUMN "post_reactions"."reaction_type" IS '1=Like,2=Dislike';
COMMENT ON COLUMN "comment_reactions"."reaction_type" IS '1=Like,2=Dislike';

-- Foreign keys (guarded so re-running is a no-op)
DO $$ BEGIN
  ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
