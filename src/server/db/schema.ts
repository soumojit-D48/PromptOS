import {
  pgTable, uuid, text, timestamp,
  boolean, integer, real, jsonb, pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

// pgvector custom type
const vector = customType<{ data: number[] }>({
  dataType() { return "vector(1536)"; },
  toDriver(v) { return `[${v}]`; },
  fromDriver(v) { return JSON.parse((v as string).replace(/\[|\]/g, "").split(",").toString()); },
});

export const planEnum = pgEnum("plan", ["free", "pro"]);
export const roleEnum = pgEnum("role", ["owner", "editor", "viewer"]);
export const statusEnum = pgEnum("status", ["draft", "running", "done"]);

// ── Users ──────────────────────────────────
export const users = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name"),
  email:         text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image:         text("image"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

// ── Auth.js tables (required) ───────────────
export const accounts = pgTable("accounts", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:              text("type").notNull(),
  provider:          text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token:     text("refresh_token"),
  access_token:      text("access_token"),
  expires_at:        integer("expires_at"),
  token_type:        text("token_type"),
  scope:             text("scope"),
  id_token:          text("id_token"),
  session_state:     text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token:      text("token").notNull(),
  expires:    timestamp("expires").notNull(),
});

// ── Organisations ──────────────────────────
export const organizations = pgTable("organizations", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  plan:      planEnum("plan").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgMembers = pgTable("org_members", {
  id:     uuid("id").primaryKey().defaultRandom(),
  orgId:  uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:   roleEnum("role").default("viewer").notNull(),
});

// ── Prompts ────────────────────────────────
export const prompts = pgTable("prompts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy:   uuid("created_by").notNull().references(() => users.id),
  name:        text("name").notNull(),
  description: text("description"),
  isArchived:  boolean("is_archived").default(false).notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

export const promptVersions = pgTable("prompt_versions", {
  id:          uuid("id").primaryKey().defaultRandom(),
  promptId:    uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  authorId:    uuid("author_id").notNull().references(() => users.id),
  versionNum:  integer("version_num").notNull(),
  content:     text("content").notNull(),
  model:       text("model").notNull().default("meta-llama/llama-3.3-70b-instruct:free"),
  params:      jsonb("params").default({ temperature: 0.7, maxTokens: 1000 }),
  embedding:   vector("embedding"),
  isPublished: boolean("is_published").default(false).notNull(),
  commitMsg:   text("commit_msg"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

// ── Experiments ────────────────────────────
export const experiments = pgTable("experiments", {
  id:            uuid("id").primaryKey().defaultRandom(),
  promptId:      uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  status:        statusEnum("status").default("draft").notNull(),
  trafficSplit:  jsonb("traffic_split").notNull(),
  winnerVersion: uuid("winner_version"),
  startedAt:     timestamp("started_at"),
  endedAt:       timestamp("ended_at"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const experimentRuns = pgTable("experiment_runs", {
  id:           uuid("id").primaryKey().defaultRandom(),
  experimentId: uuid("experiment_id").references(() => experiments.id, { onDelete: "cascade" }),
  versionId:    uuid("version_id").notNull().references(() => promptVersions.id),
  input:        jsonb("input").notNull(),
  output:       text("output"),
  latencyMs:    integer("latency_ms"),
  tokensIn:     integer("tokens_in"),
  tokensOut:    integer("tokens_out"),
  score:        real("score"),
  runType:      text("run_type").default("experiment").notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ── API Keys ───────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id:        uuid("id").primaryKey().defaultRandom(),
  orgId:     uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  keyHash:   text("key_hash").notNull(),
  name:      text("name").notNull(),
  lastUsed:  timestamp("last_used"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});