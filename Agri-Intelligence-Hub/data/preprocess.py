"""
KCC Data Preprocessing & Embedding Generation Script
====================================================
Run this script to regenerate embeddings from kcc_qa_pairs.json

Requirements:
    pip install sentence-transformers numpy

Usage:
    python data/preprocess.py

This produces data/embeddings.json using the all-MiniLM-L6-v2 model.
The embeddings are 384-dimensional dense vectors.
"""

import json
import os
import sys

def main():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    qa_path = os.path.join(data_dir, "kcc_qa_pairs.json")
    emb_path = os.path.join(data_dir, "embeddings.json")

    print("Loading Q&A pairs...")
    with open(qa_path, "r", encoding="utf-8") as f:
        qa_pairs = json.load(f)

    print(f"Loaded {len(qa_pairs)} Q&A pairs")

    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np

        print("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
        model = SentenceTransformer("all-MiniLM-L6-v2")

        # Create embeddings from question + answer concatenation
        texts = [f"{qa['question']} {qa['answer']}" for qa in qa_pairs]
        
        print("Generating embeddings...")
        embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
        
        # Convert to list for JSON serialization
        embeddings_list = embeddings.tolist()

        with open(emb_path, "w", encoding="utf-8") as f:
            json.dump(embeddings_list, f)

        print(f"Saved {len(embeddings_list)} embeddings ({len(embeddings_list[0])}-dim) to {emb_path}")

    except ImportError:
        print("sentence-transformers not installed. Generating TF-IDF based embeddings...")
        generate_tfidf_embeddings(qa_pairs, emb_path)


def generate_tfidf_embeddings(qa_pairs, output_path):
    """
    Generate TF-IDF based embeddings as a fallback when
    sentence-transformers is not available.
    """
    import math
    from collections import Counter

    # Build vocabulary from all Q&A texts
    all_texts = [f"{qa['question']} {qa['answer']}" for qa in qa_pairs]
    
    # Tokenize
    def tokenize(text):
        return [w.lower() for w in text.split() if len(w) > 2 and w.isalpha()]
    
    # Document frequency
    doc_freq = Counter()
    tokenized = [tokenize(t) for t in all_texts]
    for tokens in tokenized:
        for word in set(tokens):
            doc_freq[word] += 1
    
    # Select top 384 most informative words as dimensions
    n_docs = len(all_texts)
    idf_scores = {word: math.log(n_docs / (1 + df)) for word, df in doc_freq.items()}
    vocab = sorted(idf_scores.keys(), key=lambda w: idf_scores[w], reverse=True)[:384]
    word_to_idx = {w: i for i, w in enumerate(vocab)}
    
    # Create TF-IDF vectors
    embeddings = []
    for tokens in tokenized:
        vec = [0.0] * 384
        tf = Counter(tokens)
        for word, count in tf.items():
            if word in word_to_idx:
                idx = word_to_idx[word]
                vec[idx] = count * idf_scores.get(word, 0)
        
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        
        embeddings.append(vec)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(embeddings, f)
    
    print(f"Saved {len(embeddings)} TF-IDF embeddings (384-dim) to {output_path}")


if __name__ == "__main__":
    main()
