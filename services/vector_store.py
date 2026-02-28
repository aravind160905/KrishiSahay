"""
vector_store.py
---------------
Handles FAISS index operations (saving, loading) and metadata management.
"""

import os
import json
import faiss
import pickle
import logging
import numpy as np

logger = logging.getLogger(__name__)

def build_and_save_index(embeddings: np.ndarray, metadata: list[dict], index_path: str, meta_path: str):
    """Build a FAISS L2 index and save it along with metadata."""
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings.astype("float32"))
    
    faiss.write_index(index, index_path)
    with open(meta_path, "wb") as f:
        pickle.dump(metadata, f)
        
    logger.info(f"Saved FAISS index ({index.ntotal} vectors) to {index_path}")
    logger.info(f"Saved metadata to {meta_path}")

def load_faiss_index(index_path: str) -> faiss.Index:
    """Load FAISS index from disk."""
    if not os.path.exists(index_path):
        raise FileNotFoundError(f"FAISS index not found at {index_path}")
    return faiss.read_index(index_path)

def load_metadata(meta_path: str) -> list[dict]:
    """Load metadata pickle from disk."""
    if not os.path.exists(meta_path):
        raise FileNotFoundError(f"Metadata not found at {meta_path}")
    with open(meta_path, "rb") as f:
        return pickle.load(f)

def index_exists(index_path: str, meta_path: str) -> bool:
    """Check if both the index and metadata files exist."""
    return os.path.exists(index_path) and os.path.exists(meta_path)
