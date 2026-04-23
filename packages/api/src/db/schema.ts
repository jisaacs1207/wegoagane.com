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
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
