import { z } from "zod";

// ===== Core Types =====

export interface Query {
  id: string;
  text: string;
  mode: "offline" | "online";
  language: string;
  timestamp: string;
  offlineInsight: string;
  aiEnhanced: string | null;
  confidenceScore: number;
  relatedQuestions: string[];
  sources: { question: string; answer: string; similarity: number }[];
  responseTimeMs: number;
  feedback?: "up" | "down" | null;
}

export interface Analytics {
  totalQueries: number;
  offlineUsage: number;
  onlineUsage: number;
  mostAskedCrops: { crop: string; count: number }[];
  averageConfidence: number;
  averageResponseTime: number;
  feedbackStats: { positive: number; negative: number };
  languageDistribution: { language: string; count: number }[];
}

// ===== Zod Schemas =====

export const insertQuerySchema = z.object({
  text: z.string().min(1, "Query text is required"),
  mode: z.enum(["offline", "online"]),
  language: z.string(),
});

export type InsertQuery = z.infer<typeof insertQuerySchema>;
