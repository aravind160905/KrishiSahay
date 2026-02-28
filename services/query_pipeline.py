"""
query_pipeline.py
-----------------
Handles the semantic search inside the FAISS index.
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLDS = {
    "HIGH": 0.65,
    "MEDIUM": 0.45
}

def get_offline_answer(query: str, index, metadata: list[dict], model, top_k: int = 5) -> dict:
    """
    Embed the query, search FAISS, and format the results.
    """
    logger.info(f"Offline FAISS search triggered for: '{query}'")
    
    q_emb = model.encode([query]).astype("float32")
    
    # Search with a larger buffer to ensure we get enough valid results
    search_k = min(top_k * 3, len(metadata), index.ntotal)  # Don't exceed available data
    
    distances, indices = index.search(q_emb, search_k)
    
    results = []
    unique_answers = []
    seen_answers = set()
    
    best_score = 0.0
    
    for i in range(search_k):
        idx = indices[0][i]
        
        if idx == -1: 
            continue
            
        # L2 Distance to Cosine Similarity approximation (if normalized)
        # Using a simple heuristic for L2 -> 0 to 1 score
        dist = distances[0][i]
        score = max(0.0, 1.0 - (dist / 2.0))
        
        if i == 0:
            best_score = score
            
        item_meta = metadata[idx]
        ans = item_meta.get("answer", "")
        
        results.append({
            "metadata": item_meta,
            "similarity_score": score,
            "distance": float(dist)
        })
        
        if ans and ans not in seen_answers:
            seen_answers.add(ans)
            unique_answers.append(ans)
            
        # Stop if we have enough results
        if len(results) >= top_k:
            break
    
    logger.info(f"Found {len(results)} results out of requested {top_k}")
            
    # Confidence rating
    if best_score >= CONFIDENCE_THRESHOLDS["HIGH"]:
        conf_label = "High"
    elif best_score >= CONFIDENCE_THRESHOLDS["MEDIUM"]:
        conf_label = "Medium"
    else:
        conf_label = "Low"
        
    logger.info(f"Query: '{query}' | Confidence: {best_score:.3f} ({conf_label})")
        
    # Format multiple answers (top 5)
    if not results:
        formatted = "No relevant answers found in the offline database."
        formatted_answers = []
    else:
        formatted_answers = []
        for i, result in enumerate(results[:5], start=1):
            meta = result["metadata"]
            score = result["similarity_score"]
            q = meta.get("question", "Unknown Question")
            a = meta.get("answer", "No answer provided.")
            c = meta.get("crop", "")
            s = meta.get("state", "")
            
            context_parts = [p for p in [c, s] if p]
            context_str = f" ({', '.join(context_parts)})" if context_parts else ""
            
            answer_text = f"**Answer {i} (Similarity: {score*100:.1f}%):**\n**Matched Question:** {q}{context_str}\n\n**Answer:**\n{a}"
            formatted_answers.append(answer_text)
        
        # Keep the first answer as the main formatted answer for backward compatibility
        formatted = formatted_answers[0]

    return {
        "top_results": results,
        "unique_answers": unique_answers,
        "best_score": best_score,
        "confidence_label": conf_label,
        "confidence_score": best_score,
        "formatted_answer": formatted,
        "formatted_answers": formatted_answers  # New field with all 5 answers
    }
