import { firestore } from "./firebase";
import type { Query, Analytics, InsertQuery } from "@shared/schema";
import { nanoid } from "nanoid";

// In-memory fallback store for when Firebase isn't configured
const memoryStore: Query[] = [];

export interface IStorage {
  insertQuery(query: Query): Promise<Query>;
  getQueries(): Promise<Query[]>;
  getAnalytics(): Promise<Analytics>;
  updateFeedback(queryId: string, feedback: "up" | "down"): Promise<void>;
}

export class FirestoreStorage implements IStorage {
  private collection = firestore ? firestore.collection("queries") : null;

  async insertQuery(query: Query): Promise<Query> {
    if (this.collection) {
      await this.collection.doc(query.id).set(query);
    }
    memoryStore.unshift(query); // Always keep in memory too
    return query;
  }

  async getQueries(): Promise<Query[]> {
    if (this.collection) {
      try {
        const snapshot = await this.collection
          .orderBy("timestamp", "desc")
          .limit(50)
          .get();
        return snapshot.docs.map((doc) => doc.data() as Query);
      } catch {
        return memoryStore;
      }
    }
    return memoryStore;
  }

  async getAnalytics(): Promise<Analytics> {
    const allQueries = await this.getQueries();

    const totalQueries = allQueries.length;
    const offlineUsage = allQueries.filter((q) => q.mode === "offline").length;
    const onlineUsage = allQueries.filter((q) => q.mode === "online").length;

    const averageConfidence =
      totalQueries > 0
        ? Math.round(
          allQueries.reduce((acc, q) => acc + q.confidenceScore, 0) /
          totalQueries
        )
        : 0;

    const averageResponseTime =
      totalQueries > 0
        ? Math.round(
          allQueries.reduce((acc, q) => acc + q.responseTimeMs, 0) /
          totalQueries
        )
        : 0;

    // Count crop mentions
    const cropKeywords = [
      "Wheat", "Rice", "Cotton", "Sugarcane", "Maize",
      "Tomato", "Potato", "Mustard", "Brinjal", "Paddy",
    ];
    const mostAskedCrops = cropKeywords
      .map((crop) => {
        const count = allQueries.filter((q) =>
          q.text.toLowerCase().includes(crop.toLowerCase())
        ).length;
        return { crop, count };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // If no crop data yet, show some defaults for the dashboard
    if (mostAskedCrops.length === 0) {
      mostAskedCrops.push(
        { crop: "Wheat", count: 0 },
        { crop: "Rice", count: 0 },
        { crop: "Cotton", count: 0 },
        { crop: "Maize", count: 0 },
        { crop: "Tomato", count: 0 }
      );
    }

    // Feedback stats
    const positive = allQueries.filter((q) => q.feedback === "up").length;
    const negative = allQueries.filter((q) => q.feedback === "down").length;

    // Language distribution
    const langMap = new Map<string, number>();
    allQueries.forEach((q) => {
      langMap.set(q.language, (langMap.get(q.language) || 0) + 1);
    });
    const languageDistribution = Array.from(langMap.entries()).map(
      ([language, count]) => ({ language, count })
    );

    return {
      totalQueries,
      offlineUsage,
      onlineUsage,
      mostAskedCrops,
      averageConfidence,
      averageResponseTime,
      feedbackStats: { positive, negative },
      languageDistribution,
    };
  }

  async updateFeedback(
    queryId: string,
    feedback: "up" | "down"
  ): Promise<void> {
    // Update in memory
    const memQuery = memoryStore.find((q) => q.id === queryId);
    if (memQuery) memQuery.feedback = feedback;

    // Update in Firestore
    if (this.collection) {
      try {
        await this.collection.doc(queryId).update({ feedback });
      } catch (e) {
        // Firestore update failed, memory update is still valid
      }
    }
  }
}

export const storage = new FirestoreStorage();

/**
 * Create a new Query object with a generated ID and timestamp.
 */
export function createQuery(
  input: InsertQuery,
  result: {
    offlineInsight: string;
    aiEnhanced: string | null;
    confidenceScore: number;
    relatedQuestions: string[];
    sources: { question: string; answer: string; similarity: number }[];
    responseTimeMs: number;
  }
): Query {
  return {
    id: nanoid(),
    text: input.text,
    mode: input.mode,
    language: input.language,
    timestamp: new Date().toISOString(),
    offlineInsight: result.offlineInsight,
    aiEnhanced: result.aiEnhanced,
    confidenceScore: result.confidenceScore,
    relatedQuestions: result.relatedQuestions,
    sources: result.sources,
    responseTimeMs: result.responseTimeMs,
    feedback: null,
  };
}
