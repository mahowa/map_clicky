import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en');
  CREATE TYPE "public"."enum_locations_tags" AS ENUM('capital', 'city', 'landmark', 'unesco', 'us-state', 'waterway', 'country');
  CREATE TYPE "public"."enum_locations_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TYPE "public"."enum_daily_sets_rounds_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar,
  	"country_flag" varchar,
  	"prefs_tap_assist" boolean DEFAULT false,
  	"prefs_confirm_tap" boolean DEFAULT false,
  	"prefs_show_previous_guess" boolean DEFAULT true,
  	"prefs_scroll_sensitivity" numeric DEFAULT 1,
  	"prefs_use_utc" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "locations_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_locations_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "locations_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"geoname_id" numeric,
  	"population" numeric,
  	"country" varchar NOT NULL,
  	"lat" numeric NOT NULL,
  	"lng" numeric NOT NULL,
  	"difficulty" "enum_locations_difficulty" DEFAULT 'easy' NOT NULL,
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "daily_sets_rounds" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"location_id" integer NOT NULL,
  	"difficulty" "enum_daily_sets_rounds_difficulty" DEFAULT 'easy' NOT NULL,
  	"event" varchar
  );
  
  CREATE TABLE "daily_sets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "practice_collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"theme" varchar,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "practice_collections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locations_id" integer
  );
  
  CREATE TABLE "news_items_raw_place_candidates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"lat" numeric,
  	"lng" numeric
  );
  
  CREATE TABLE "news_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL,
  	"source" varchar NOT NULL,
  	"calendar_day" varchar NOT NULL,
  	"year" numeric,
  	"text" varchar NOT NULL,
  	"link" varchar,
  	"fetched_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "news_items_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locations_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"locations_id" integer,
  	"daily_sets_id" integer,
  	"practice_collections_id" integer,
  	"news_items_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations_tags" ADD CONSTRAINT "locations_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations_facts" ADD CONSTRAINT "locations_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "daily_sets_rounds" ADD CONSTRAINT "daily_sets_rounds_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "daily_sets_rounds" ADD CONSTRAINT "daily_sets_rounds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."daily_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practice_collections_rels" ADD CONSTRAINT "practice_collections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."practice_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "practice_collections_rels" ADD CONSTRAINT "practice_collections_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_items_raw_place_candidates" ADD CONSTRAINT "news_items_raw_place_candidates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_items_rels" ADD CONSTRAINT "news_items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_items_rels" ADD CONSTRAINT "news_items_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_daily_sets_fk" FOREIGN KEY ("daily_sets_id") REFERENCES "public"."daily_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_practice_collections_fk" FOREIGN KEY ("practice_collections_id") REFERENCES "public"."practice_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_items_fk" FOREIGN KEY ("news_items_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "locations_tags_order_idx" ON "locations_tags" USING btree ("order");
  CREATE INDEX "locations_tags_parent_idx" ON "locations_tags" USING btree ("parent_id");
  CREATE INDEX "locations_facts_order_idx" ON "locations_facts" USING btree ("_order");
  CREATE INDEX "locations_facts_parent_id_idx" ON "locations_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "locations_geoname_id_idx" ON "locations" USING btree ("geoname_id");
  CREATE INDEX "locations_image_idx" ON "locations" USING btree ("image_id");
  CREATE INDEX "locations_updated_at_idx" ON "locations" USING btree ("updated_at");
  CREATE INDEX "locations_created_at_idx" ON "locations" USING btree ("created_at");
  CREATE INDEX "daily_sets_rounds_order_idx" ON "daily_sets_rounds" USING btree ("_order");
  CREATE INDEX "daily_sets_rounds_parent_id_idx" ON "daily_sets_rounds" USING btree ("_parent_id");
  CREATE INDEX "daily_sets_rounds_location_idx" ON "daily_sets_rounds" USING btree ("location_id");
  CREATE UNIQUE INDEX "daily_sets_date_idx" ON "daily_sets" USING btree ("date");
  CREATE INDEX "daily_sets_updated_at_idx" ON "daily_sets" USING btree ("updated_at");
  CREATE INDEX "daily_sets_created_at_idx" ON "daily_sets" USING btree ("created_at");
  CREATE INDEX "practice_collections_updated_at_idx" ON "practice_collections" USING btree ("updated_at");
  CREATE INDEX "practice_collections_created_at_idx" ON "practice_collections" USING btree ("created_at");
  CREATE INDEX "practice_collections_rels_order_idx" ON "practice_collections_rels" USING btree ("order");
  CREATE INDEX "practice_collections_rels_parent_idx" ON "practice_collections_rels" USING btree ("parent_id");
  CREATE INDEX "practice_collections_rels_path_idx" ON "practice_collections_rels" USING btree ("path");
  CREATE INDEX "practice_collections_rels_locations_id_idx" ON "practice_collections_rels" USING btree ("locations_id");
  CREATE INDEX "news_items_raw_place_candidates_order_idx" ON "news_items_raw_place_candidates" USING btree ("_order");
  CREATE INDEX "news_items_raw_place_candidates_parent_id_idx" ON "news_items_raw_place_candidates" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "news_items_source_id_idx" ON "news_items" USING btree ("source_id");
  CREATE INDEX "news_items_calendar_day_idx" ON "news_items" USING btree ("calendar_day");
  CREATE INDEX "news_items_updated_at_idx" ON "news_items" USING btree ("updated_at");
  CREATE INDEX "news_items_created_at_idx" ON "news_items" USING btree ("created_at");
  CREATE INDEX "news_items_rels_order_idx" ON "news_items_rels" USING btree ("order");
  CREATE INDEX "news_items_rels_parent_idx" ON "news_items_rels" USING btree ("parent_id");
  CREATE INDEX "news_items_rels_path_idx" ON "news_items_rels" USING btree ("path");
  CREATE INDEX "news_items_rels_locations_id_idx" ON "news_items_rels" USING btree ("locations_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("locations_id");
  CREATE INDEX "payload_locked_documents_rels_daily_sets_id_idx" ON "payload_locked_documents_rels" USING btree ("daily_sets_id");
  CREATE INDEX "payload_locked_documents_rels_practice_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("practice_collections_id");
  CREATE INDEX "payload_locked_documents_rels_news_items_id_idx" ON "payload_locked_documents_rels" USING btree ("news_items_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "locations_tags" CASCADE;
  DROP TABLE "locations_facts" CASCADE;
  DROP TABLE "locations" CASCADE;
  DROP TABLE "daily_sets_rounds" CASCADE;
  DROP TABLE "daily_sets" CASCADE;
  DROP TABLE "practice_collections" CASCADE;
  DROP TABLE "practice_collections_rels" CASCADE;
  DROP TABLE "news_items_raw_place_candidates" CASCADE;
  DROP TABLE "news_items" CASCADE;
  DROP TABLE "news_items_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_locations_tags";
  DROP TYPE "public"."enum_locations_difficulty";
  DROP TYPE "public"."enum_daily_sets_rounds_difficulty";`)
}
