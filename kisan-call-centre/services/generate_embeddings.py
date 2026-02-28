"""
generate_embeddings.py
----------------------
Generates sentence embeddings for Q&A pairs using the
'all-MiniLM-L6-v2' model, then persists them to disk.

For large datasets (100K+ rows), a random sample is used to keep
startup fast while maintaining good coverage.

Output files (inside /embeddings/):
  • faiss_index.index   – FAISS IndexFlatL2
  • meta.pkl            – ordered list of metadata dicts (same order as FAISS)
  • kcc_embeddings.pkl  – lightweight copy of metadata (no raw vectors in pkl)
"""
from __future__ import annotations

import os
import json
import random
import pickle
import logging
import numpy as np
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
MAX_RECORDS      = 15000   # cap for fast startup on CPU (~2-4 min)


def build_text_for_embedding(qa: dict) -> str:
    """
    Create the text string that will be embedded.
    Format: "Q: {question} A: {answer} [Crop: {crop}] [State: {state}]"
    Includes crop and state if available and not empty.
    """
    parts = []
    q = qa.get("question", "").strip()
    a = qa.get("answer", "").strip()

    if q:
        parts.append(f"Q: {q}")
    if a:
        parts.append(f"A: {a}")

    crop = qa.get("crop", "").strip()
    if crop:
        parts.append(f"Crop: {crop}")

    state = qa.get("state", "").strip()
    if state:
        parts.append(f"State: {state}")

    return " ".join(parts)


def generate_embeddings(
    json_path: str,
    embeddings_dir: str,
    batch_size: int = 128,
    show_progress: bool = True,
    max_records: int = MAX_RECORDS,
) -> tuple[list[dict], "np.ndarray"]:
    """
    Load QA pairs from JSON, generate embeddings, and save artefacts.

    Parameters
    ----------
    json_path      : path to kcc_qa_pairs.json
    embeddings_dir : directory for output files
    batch_size     : sentences per encoding batch (128 = faster on CPU)
    show_progress  : show tqdm progress bars
    max_records    : maximum records to embed (random sample for large sets)

    Returns
    -------
    (records, embeddings_matrix)
      records           – list of {metadata: dict}
      embeddings_matrix – numpy float32 array of shape (N, D)
    """
    # ── Load QA pairs ─────────────────────────────────────────────────────
    with open(json_path, encoding="utf-8") as f:
        qa_pairs: list[dict] = json.load(f)
    logger.info(f"Loaded {len(qa_pairs)} QA pairs from {json_path}")

    # ── Sample if dataset is too large ────────────────────────────────────
    if len(qa_pairs) > max_records:
        logger.info(
            f"Dataset has {len(qa_pairs)} records, sampling {max_records} "
            f"for fast embedding. Full dataset stays in JSON for reference."
        )
        random.seed(42)   # reproducible sampling
        qa_pairs = random.sample(qa_pairs, max_records)
        logger.info(f"Sampled {len(qa_pairs)} records.")

    # ── Build embedding texts ─────────────────────────────────────────────
    texts = [build_text_for_embedding(qa) for qa in qa_pairs]

    # ── Load model ────────────────────────────────────────────────────────
    logger.info(f"Loading sentence-transformer model: {EMBED_MODEL_NAME}")
    model = SentenceTransformer(EMBED_MODEL_NAME)

    # ── Encode ────────────────────────────────────────────────────────────
    logger.info(f"Encoding {len(texts)} texts (batch_size={batch_size}) …")
    raw_embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=show_progress,
        convert_to_numpy=True,
        normalize_embeddings=False,
    )

    # Ensure float32 for FAISS compatibility
    embeddings_matrix: np.ndarray = raw_embeddings.astype(np.float32)
    logger.info(f"Embedding matrix shape: {embeddings_matrix.shape}")

    # ── Build records list (lightweight – no raw vectors) ─────────────────
    records = [{"metadata": qa_pairs[i]} for i in range(len(qa_pairs))]

    # ── Persist artefacts ─────────────────────────────────────────────────
    os.makedirs(embeddings_dir, exist_ok=True)

    # 1. Metadata separately (same order as FAISS index)
    meta_pkl_path = os.path.join(embeddings_dir, "meta.pkl")
    meta_list = [r["metadata"] for r in records]
    with open(meta_pkl_path, "wb") as f:
        pickle.dump(meta_list, f)
    logger.info(f"Saved metadata pickle → {meta_pkl_path}")

    # 2. Lightweight records pkl (for compatibility)
    emb_pkl_path = os.path.join(embeddings_dir, "kcc_embeddings.pkl")
    with open(emb_pkl_path, "wb") as f:
        pickle.dump(records, f)
    logger.info(f"Saved records pickle → {emb_pkl_path}")

    return records, embeddings_matrix


# ── Standalone runner ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    generate_embeddings(
        json_path=os.path.join(BASE, "data", "kcc_qa_pairs.json"),
        embeddings_dir=os.path.join(BASE, "embeddings"),
    )
    logger.info("Embedding generation complete.")
