import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  entryPath: text("entry_path").notNull(),
});

export const questionAnswers = sqliteTable("question_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  questionKey: text("question_key").notNull(),
  answerValue: text("answer_value"),
  skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
  freeformText: text("freeform_text"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const destinies = sqliteTable("destinies", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" }).notNull(),
  classId: text("class_id").notNull(),
  archetypeKey: text("archetype_key").notNull(),
  tierProse: text("tier_prose").notNull(),
  contentJson: text("content_json").notNull(),
  sourceType: text("source_type").notNull(),
});

export const recommendationLogs = sqliteTable("recommendation_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  destinyId: text("destiny_id").notNull(),
  selectedArchetype: text("selected_archetype").notNull(),
  rankingScore: real("ranking_score").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  reasonsJson: text("reasons_json").notNull(),
  validationFailures: integer("validation_failures").notNull().default(0),
  sourceType: text("source_type").notNull().default("template"),
  fallbackUsed: integer("fallback_used", { mode: "boolean" }).notNull().default(false),
  aiModelId: text("ai_model_id"),
  aiLatencyMs: integer("ai_latency_ms"),
  aiRetries: integer("ai_retries").notNull().default(0),
  aiInputTokens: integer("ai_input_tokens"),
  aiOutputTokens: integer("ai_output_tokens"),
  aiErrorType: text("ai_error_type"),
  growthVariantId: text("growth_variant_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const memorials = sqliteTable("memorials", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  destinyId: text("destiny_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  characterName: text("character_name").notNull(),
  level: integer("level"),
  location: text("location").notNull(),
  cause: text("cause").notNull(),
  faction: text("faction").notNull(),
  epitaph: text("epitaph").notNull(),
  sourceType: text("source_type").notNull(),
  contentJson: text("content_json").notNull(),
});

export const destinyFeedback = sqliteTable("destiny_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  destinyId: text("destiny_id").notNull(),
  choice: text("choice").notNull(),
  stage: text("stage").notNull().default("reroll_gate"),
  rerollReason: text("reroll_reason"),
  postAcceptRating: text("post_accept_rating"),
  note: text("note"),
  rerollFromClassId: text("reroll_from_class_id"),
  rerollToClassId: text("reroll_to_class_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const shareRuns = sqliteTable("share_runs", {
  runId: text("run_id").primaryKey(),
  sessionId: text("session_id").notNull(),
  destinyId: text("destiny_id").notNull(),
  memorialId: text("memorial_id"),
  status: text("status").notNull().default("queued"),
  r2Key: text("r2_key"),
  publicImageUrl: text("public_image_url"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const growthVariants = sqliteTable("growth_variants", {
  id: text("id").primaryKey(),
  surface: text("surface").notNull(),
  variantType: text("variant_type").notNull(),
  status: text("status").notNull().default("draft"),
  promptVersion: text("prompt_version"),
  promptText: text("prompt_text"),
  payloadJson: text("payload_json").notNull(),
  payloadHash: text("payload_hash").notNull(),
  noveltyScore: real("novelty_score").notNull().default(0),
  guardrailStatus: text("guardrail_status").notNull().default("pending"),
  guardrailNotes: text("guardrail_notes"),
  sampleSize: integer("sample_size").notNull().default(0),
  acceptRate: real("accept_rate").notNull().default(0),
  rerollsPerSession: real("rerolls_per_session").notNull().default(0),
  postAcceptRatingAvg: real("post_accept_rating_avg").notNull().default(0),
  shareCompletionRate: real("share_completion_rate").notNull().default(0),
  validationFailureRate: real("validation_failure_rate").notNull().default(0),
  promotedAt: integer("promoted_at", { mode: "timestamp_ms" }),
  retiredAt: integer("retired_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const growthExperiments = sqliteTable("growth_experiments", {
  id: text("id").primaryKey(),
  surface: text("surface").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("running"),
  holdoutPercent: integer("holdout_percent").notNull().default(10),
  trafficPercent: integer("traffic_percent").notNull().default(25),
  minSampleSize: integer("min_sample_size").notNull().default(40),
  baselineVariantId: text("baseline_variant_id"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const growthExperimentVariants = sqliteTable("growth_experiment_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  experimentId: text("experiment_id").notNull(),
  variantId: text("variant_id").notNull(),
  weight: real("weight").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const growthAssignments = sqliteTable("growth_assignments", {
  id: text("id").primaryKey(),
  experimentId: text("experiment_id"),
  variantId: text("variant_id"),
  surface: text("surface").notNull(),
  sessionId: text("session_id").notNull(),
  entryPath: text("entry_path"),
  assignedAt: integer("assigned_at", { mode: "timestamp_ms" }).notNull(),
  seenAt: integer("seen_at", { mode: "timestamp_ms" }),
  convertedAt: integer("converted_at", { mode: "timestamp_ms" }),
  outcomeJson: text("outcome_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const growthDecisions = sqliteTable("growth_decisions", {
  id: text("id").primaryKey(),
  variantId: text("variant_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  metricsJson: text("metrics_json").notNull(),
  thresholdJson: text("threshold_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const growthRuns = sqliteTable("growth_runs", {
  id: text("id").primaryKey(),
  runType: text("run_type").notNull(),
  status: text("status").notNull().default("running"),
  inputJson: text("input_json"),
  outputJson: text("output_json"),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const buildPlans = sqliteTable("build_plans", {
  id: text("id").primaryKey(),
  destinyId: text("destiny_id").notNull().unique(),
  sessionId: text("session_id").notNull(),
  status: text("status").notNull().default("queued"),
  publishTier: text("publish_tier").notNull().default("draft"),
  rulesetPin: text("ruleset_pin").notNull(),
  signalsJson: text("signals_json"),
  payloadJson: text("payload_json"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const characterNameCandidates = sqliteTable("character_name_candidates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lane: text("lane").notNull(),
  genderLean: text("gender_lean"),
  name: text("name").notNull(),
  source: text("source").notNull(),
  qualityScore: real("quality_score").notNull().default(0),
  moderated: integer("moderated", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const buildRunsDraft = sqliteTable("build_runs_draft", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  entryPath: text("entry_path").notNull(),
  vector: text("vector"),
  depth: text("depth"),
  answersJson: text("answers_json").notNull().default("{}"),
  signalsJson: text("signals_json").notNull().default("{}"),
  questionCount: integer("question_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const buildCommits = sqliteTable("build_commits", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  sessionId: text("session_id").notNull(),
  destinyId: text("destiny_id").notNull(),
  buildPlanId: text("build_plan_id"),
  commitName: text("commit_name"),
  payloadJson: text("payload_json").notNull(),
  cardJson: text("card_json"),
  sourceType: text("source_type").notNull().default("hybrid"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const buildCommitFeedback = sqliteTable("build_commit_feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buildCommitId: text("build_commit_id").notNull(),
  sessionId: text("session_id"),
  rating: text("rating"),
  note: text("note"),
  action: text("action"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const memorialRuns = sqliteTable("memorial_runs", {
  id: text("id").primaryKey(),
  buildCommitId: text("build_commit_id").notNull(),
  sessionId: text("session_id").notNull(),
  level: integer("level"),
  zone: text("zone").notNull(),
  cause: text("cause").notNull(),
  killer: text("killer"),
  note: text("note"),
  rating: text("rating"),
  memorialId: text("memorial_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const nameSuggestions = sqliteTable("name_suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  signature: text("signature").notNull(),
  name: text("name").notNull(),
  lane: text("lane").notNull(),
  source: text("source").notNull().default("ai"),
  qualityScore: real("quality_score").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
