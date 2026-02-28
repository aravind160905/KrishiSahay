import os
import json
import logging
import pandas as pd

logger = logging.getLogger(__name__)

MAX_RECORDS = 17000  # Sample more to account for ~12.7% duplicates, aiming for 15,000 unique

def preprocess(raw_csv_path: str, clean_csv_path: str, qa_json_path: str):
    """
    Reads the real raw_kcc.csv which only has 'questions' and 'answers'.
    Cleans, deduplicates, and limits to MAX_RECORDS.
    """
    logger.info(f"Loading raw data from {raw_csv_path}...")
    
    if not os.path.exists(raw_csv_path):
        logger.error("raw_kcc.csv not found!")
        return
        
    try:
        df = pd.read_csv(raw_csv_path)
    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        return
        
    logger.info(f"Loaded {len(df)} rows. Sampling up to {MAX_RECORDS}...")
    
    # Check column names (could be 'questions', 'question', 'answers', 'answer')
    cols = [c.lower() for c in df.columns]
    q_col = next((c for c in cols if "question" in c), "questions")
    a_col = next((c for c in cols if "answer" in c), "answers")
    
    df.columns = cols
    
    # Drop rows with nulls in critical columns
    df = df.dropna(subset=[q_col, a_col])
    
    # Optional shuffle/sample
    if len(df) > MAX_RECORDS:
        df = df.sample(MAX_RECORDS, random_state=42)
        
    logger.info(f"Processing {len(df)} sampled rows...")
    
    qa_list = []
    seen = set()
    
    for _, row in df.iterrows():
        q_text = str(row.get(q_col, "")).strip()
        a_text = str(row.get(a_col, "")).strip()
        
        if not q_text or not a_text:
            continue
            
        # Deduplication
        signature = (q_text.lower(), a_text.lower())
        if signature in seen:
            continue
        seen.add(signature)
            
        qa_list.append({
            "question": q_text,
            "answer": a_text,
            "crop": "",
            "state": "",
            "district": "",
            "category": ""
        })
        
        # Stop if we have enough unique records
        if len(qa_list) >= 15000:
            break
        
    # Ensure exactly 15,000 records
    if len(qa_list) > 15000:
        qa_list = qa_list[:15000]
        
    # Save clean JSON
    with open(qa_json_path, "w", encoding="utf-8") as f:
        json.dump(qa_list, f, indent=4)
        
    # Save clean CSV for debugging
    clean_df = pd.DataFrame(qa_list)
    clean_df.to_csv(clean_csv_path, index=False)
        
    logger.info(f"Successfully processed and saved {len(qa_list)} unique records.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    BASE_DIR = os.path.dirname(os.path.dirname(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "data")
    
    preprocess(
        os.path.join(DATA_DIR, "raw_kcc.csv"),
        os.path.join(DATA_DIR, "clean_kcc.csv"),
        os.path.join(DATA_DIR, "kcc_qa_pairs.json")
    )
