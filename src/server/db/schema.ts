import {
  pgTable, uuid, text, timestamp,
  boolean, integer, real, jsonb, pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

const vector = customType<{ data: number[] }>({
  dataType() { return "vector(1536)"; },
  toDriver(v) { return `[${v}]`; },
  fromDriver(v) { return JSON.parse((v as string).replace(/\[|\]/g, "").split(",").toString()); },
});

export const planEnum = pgEnum("plan", ["free", "pro"]);
export const roleEnum = pgEnum("role", ["owner", "editor", "viewer"]);
export const statusEnum = pgEnum("status", ["draft", "running", "done"]);

export const users = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name"),
  email:         text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image:         text("image"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

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

export const apiKeys = pgTable("api_keys", {
  id:          uuid("id").primaryKey().defaultRandom(),
  orgId:       uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  keyHash:     text("key_hash").notNull(),
  name:        text("name").notNull(),
  permissions: text("permissions").default("execute"),
  lastUsed:    timestamp("last_used"),
  revokedAt:   timestamp("revoked_at"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const promptAttachments = pgTable("prompt_attachments", {
  id:         uuid("id").primaryKey().defaultRandom(),
  promptId:   uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  orgId:      uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  url:        text("url").notNull(),
  name:       text("name").notNull(),
  size:       integer("size").notNull(),
  type:       text("type").notNull(),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  prompts: many(prompts),
  promptVersions: many(promptVersions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  prompts: many(prompts),
  orgMembers: many(orgMembers),
  apiKeys: many(apiKeys),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [prompts.orgId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [prompts.createdBy],
    references: [users.id],
  }),
  versions: many(promptVersions),
  experiments: many(experiments),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptVersions.promptId],
    references: [prompts.id],
  }),
  author: one(users, {
    fields: [promptVersions.authorId],
    references: [users.id],
  }),
}));

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  prompt: one(prompts, {
    fields: [experiments.promptId],
    references: [prompts.id],
  }),
  runs: many(experimentRuns),
}));

export const experimentRunsRelations = relations(experimentRuns, ({ one }) => ({
  experiment: one(experiments, {
    fields: [experimentRuns.experimentId],
    references: [experiments.id],
  }),
  version: one(promptVersions, {
    fields: [experimentRuns.versionId],
    references: [promptVersions.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.orgId],
    references: [organizations.id],
  }),
}));

export const promptAttachmentsRelations = relations(promptAttachments, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptAttachments.promptId],
    references: [prompts.id],
  }),
  organization: one(organizations, {
    fields: [promptAttachments.orgId],
    references: [organizations.id],
  }),
  uploader: one(users, {
    fields: [promptAttachments.uploadedBy],
    references: [users.id],
  }),
}));