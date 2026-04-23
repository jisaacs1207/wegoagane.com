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
  note: text("note"),
  rerollFromClassId: text("reroll_from_class_id"),
  rerollToClassId: text("reroll_to_class_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
