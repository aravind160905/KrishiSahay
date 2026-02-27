import type { Express } from "express";
import type { Server } from "http";
import { storage, createQuery } from "./storage";
import { searchSimilar, formatContextForLLM, computeConfidence } from "./vectorSearch";
import { generateWithGranite, isWatsonxAvailable } from "./watsonx";
import { api } from "@shared/routes";
import { z } from "zod";

/**
 * Generate related questions based on search results
 */
function generateRelatedQuestions(results: { question: string }[]): string[] {
  const related: string[] = [];
  for (const r of results.slice(0, 4)) {
    if (related.length < 4 && r.question) {
      // Simplify the question for display
      const q = r.question.length > 80 ? r.question.slice(0, 77) + "..." : r.question;
      related.push(q);
    }
  }
  if (related.length === 0) {
    related.push(
      "What fertilizer should I apply for wheat?",
      "How to control pests in cotton?",
      "What are symptoms of blight disease?",
      "How to apply for PM Kisan scheme?"
    );
  }
  return related;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  /**
   * POST /api/chat — Main query endpoint
   * Implements the full RAG pipeline:
   * 1. Vector search for relevant KCC entries
   * 2. (Online mode) Enhance with Watsonx Granite LLM
   * 3. Store result and return
   */
  app.post(api.chat.send.path, async (req, res) => {
    const startTime = Date.now();
    try {
      const input = api.chat.send.input.parse(req.body);

      // Step 1: Semantic vector search (FAISS-like)
      const searchResults = searchSimilar(input.text, 5);

      // Step 2: Format offline insight from top results
      const offlineInsight =
        searchResults.length > 0
          ? searchResults
            .slice(0, 3)
            .map((r) => r.answer)
            .filter((a, i, arr) => arr.indexOf(a) === i) // dedupe
            .join("\n\n")
          : "No matching records found in the Kisan Call Centre database for your query. Please try rephrasing your question with specific crop or pest names.";

      // Step 3: Online mode — Enhance with Granite LLM
      let aiEnhanced: string | null = null;
      if (input.mode === "online") {
        const context = formatContextForLLM(searchResults);
        aiEnhanced = await generateWithGranite(input.text, context, input.language);

        if (!aiEnhanced && isWatsonxAvailable()) {
          aiEnhanced =
            "The AI enhancement service is temporarily unavailable. The offline answer above is based on the Kisan Call Centre knowledge base.";
        } else if (!aiEnhanced) {
          aiEnhanced =
            "IBM Watsonx API is not configured. Add WATSONX_API_KEY and WATSONX_PROJECT_ID to your .env file for AI-enhanced responses.";
        }
      }

      // Step 4: Compute confidence & related questions
      const confidenceScore = computeConfidence(searchResults);
      const relatedQuestions = generateRelatedQuestions(searchResults);
      const responseTimeMs = Date.now() - startTime;

      // Step 5: Store sources for display
      const sources = searchResults.slice(0, 3).map((r) => ({
        question: r.question,
        answer: r.answer.length > 150 ? r.answer.slice(0, 147) + "..." : r.answer,
        similarity: r.similarity,
      }));

      // Step 6: Create and persist the query
      const query = createQuery(input, {
        offlineInsight,
        aiEnhanced,
        confidenceScore,
        relatedQuestions,
        sources,
        responseTimeMs,
      });

      await storage.insertQuery(query);

      res.status(200).json(query);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Chat error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * GET /api/queries — Fetch recent query history
   */
  app.get(api.queries.list.path, async (_req, res) => {
    try {
      const queries = await storage.getQueries();
      res.json(queries);
    } catch (err) {
      console.error("Queries list error:", err);
      res.json([]);
    }
  });

  /**
   * GET /api/analytics — Fetch analytics data
   */
  app.get(api.analytics.get.path, async (_req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (err) {
      console.error("Analytics error:", err);
      res.json({
        totalQueries: 0,
        offlineUsage: 0,
        onlineUsage: 0,
        mostAskedCrops: [],
        averageConfidence: 0,
        averageResponseTime: 0,
        feedbackStats: { positive: 0, negative: 0 },
        languageDistribution: [],
      });
    }
  });

  /**
   * POST /api/feedback — Submit feedback for a query
   */
  app.post(api.feedback.send.path, async (req, res) => {
    try {
      const input = api.feedback.send.input.parse(req.body);
      await storage.updateFeedback(input.queryId, input.feedback);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
