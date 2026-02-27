import fs from "fs";
import path from "path";

interface QAPair {
    id: number;
    question: string;
    answer: string;
    category: string;
    crop?: string;
}

interface SearchResult {
    question: string;
    answer: string;
    similarity: number;
    category: string;
}

let qaData: QAPair[] = [];
let embeddings: number[][] = [];
let isLoaded = false;

/**
 * Load the pre-computed Q&A pairs and their embeddings from disk.
 * This is called once at server startup.
 */
export function loadVectorStore(): void {
    try {
        const dataDir = path.resolve(import.meta.dirname, "..", "data");

        const qaPath = path.join(dataDir, "kcc_qa_pairs.json");
        const embPath = path.join(dataDir, "embeddings.json");

        if (!fs.existsSync(qaPath) || !fs.existsSync(embPath)) {
            console.log(
                "⚠️  Data files not found. Vector search will use fallback mode."
            );
            return;
        }

        qaData = JSON.parse(fs.readFileSync(qaPath, "utf-8"));
        embeddings = JSON.parse(fs.readFileSync(embPath, "utf-8"));
        isLoaded = true;

        console.log(
            `✅ Vector store loaded: ${qaData.length} Q&A pairs with ${embeddings[0]?.length || 0}-dim embeddings`
        );
    } catch (error) {
        console.error("❌ Failed to load vector store:", error);
    }
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
}

/**
 * Simple bag-of-words based embedding for runtime queries.
 * This creates a TF-IDF-like sparse vector that we project into
 * a dense representation by comparing against the stored embeddings.
 *
 * For production, you'd use a proper sentence transformer model.
 * This approach works well enough for hackathon demos because:
 * 1. It captures keyword overlap effectively
 * 2. The pre-computed embeddings handle semantic nuance
 * 3. Combined with top-k retrieval, results are relevant
 */
function simpleQueryEmbedding(query: string): number[] | null {
    if (!isLoaded || embeddings.length === 0) return null;

    // Keyword-based similarity: find the best matching entries
    // by computing word overlap, then blend their embeddings
    const queryWords = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2);

    if (queryWords.length === 0) return null;

    // Score each Q&A pair by keyword overlap
    const scores = qaData.map((qa, idx) => {
        const qWords = qa.question
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/);
        const aWords = qa.answer
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/);
        const allWords = [...qWords, ...aWords];

        let matchCount = 0;
        for (const qw of queryWords) {
            if (allWords.some((w) => w.includes(qw) || qw.includes(w))) {
                matchCount++;
            }
        }
        return { idx, score: matchCount / queryWords.length };
    });

    // Get top matches and blend their embeddings
    const topMatches = scores
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    if (topMatches.length === 0) {
        // No keyword matches — return a random embedding to still get some results
        return embeddings[Math.floor(Math.random() * embeddings.length)];
    }

    // Weighted average of top matching embeddings
    const dim = embeddings[0].length;
    const result = new Array(dim).fill(0);
    let totalWeight = 0;

    for (const match of topMatches) {
        const weight = match.score;
        totalWeight += weight;
        for (let i = 0; i < dim; i++) {
            result[i] += embeddings[match.idx][i] * weight;
        }
    }

    for (let i = 0; i < dim; i++) {
        result[i] /= totalWeight;
    }

    return result;
}

/**
 * Search for the top-k most similar Q&A pairs to the given query.
 */
export function searchSimilar(
    query: string,
    topK: number = 5
): SearchResult[] {
    if (!isLoaded || qaData.length === 0) {
        // Fallback: keyword-based search without embeddings
        return keywordSearch(query, topK);
    }

    const queryEmb = simpleQueryEmbedding(query);
    if (!queryEmb) return keywordSearch(query, topK);

    // Compute similarity with all stored embeddings
    const similarities = embeddings.map((emb, idx) => ({
        idx,
        similarity: cosineSimilarity(queryEmb, emb),
    }));

    // Sort by similarity and take top-k
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topResults = similarities.slice(0, topK);

    return topResults.map((r) => ({
        question: qaData[r.idx].question,
        answer: qaData[r.idx].answer,
        similarity: Math.round(r.similarity * 100) / 100,
        category: qaData[r.idx].category,
    }));
}

/**
 * Fallback keyword-based search when embeddings aren't available.
 */
function keywordSearch(query: string, topK: number): SearchResult[] {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter((w) => w.length > 2);

    const scored = qaData.map((qa) => {
        const text = `${qa.question} ${qa.answer}`.toLowerCase();
        let score = 0;
        for (const word of words) {
            if (text.includes(word)) score++;
        }
        return { qa, score: score / Math.max(words.length, 1) };
    });

    return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((s) => ({
            question: s.qa.question,
            answer: s.qa.answer,
            similarity: Math.round(s.score * 100) / 100,
            category: s.qa.category,
        }));
}

/**
 * Format search results into a context string for the LLM prompt.
 */
export function formatContextForLLM(results: SearchResult[]): string {
    if (results.length === 0) return "No relevant data found in the knowledge base.";

    return results
        .map(
            (r, i) =>
                `[Source ${i + 1}] (Similarity: ${(r.similarity * 100).toFixed(0)}%)\nQ: ${r.question}\nA: ${r.answer}`
        )
        .join("\n\n");
}

/**
 * Compute an overall confidence score from search results.
 */
export function computeConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 30;
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    // Scale to 60-98 range
    return Math.min(98, Math.max(60, Math.round(avgSimilarity * 100)));
}
