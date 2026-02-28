"""
watsonx_api.py
--------------
Calls the IBM Watsonx.ai Granite model via the REST API using the
`requests` library.  No LangChain, no OpenAI SDK.

Environment variables (from .env):
  WATSONX_API_KEY     – IBM Cloud IAM API key
  WATSONX_PROJECT_ID  – Watsonx.ai project ID
  WATSONX_URL         – base URL, e.g. https://us-south.ml.cloud.ibm.com
  WATSONX_MODEL_ID    – defaults to ibm/granite-3-8b-instruct

Public API
----------
  get_llm_answer(query, retrieved_context) → str
    Returns the AI-generated text, or raises WatsonxError on failure.

  get_iam_token(api_key) → str
    Exchanges an IBM Cloud API key for a short-lived Bearer token.
"""

import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
WATSONX_API_KEY    = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")
WATSONX_URL        = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com").rstrip("/")
WATSONX_MODEL_ID   = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct")

IAM_TOKEN_URL      = "https://iam.cloud.ibm.com/identity/token"
GENERATE_ENDPOINT  = "/ml/v1/text/generation?version=2023-05-29"

# ── Default generation parameters ────────────────────────────────────────────
DEFAULT_PARAMS = {
    "decoding_method":  "greedy",
    "max_new_tokens":   800,
    "min_new_tokens":   50,
    "stop_sequences":   [],
    "repetition_penalty": 1.1,
}


# ─────────────────────────────────────────────────────────────────────────────
# Custom exception
# ─────────────────────────────────────────────────────────────────────────────

class WatsonxError(Exception):
    """Raised when the Watsonx API call fails."""
    pass


# ─────────────────────────────────────────────────────────────────────────────
# IAM token exchange
# ─────────────────────────────────────────────────────────────────────────────

def get_iam_token(api_key: str) -> str:
    """
    Exchange an IBM Cloud IAM API key for a Bearer access token.

    Parameters
    ----------
    api_key : IBM Cloud IAM API key

    Returns
    -------
    str – access token

    Raises
    ------
    WatsonxError if the exchange fails
    """
    response = requests.post(
        IAM_TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type":    "urn:ibm:params:oauth:grant-type:apikey",
            "apikey":        api_key,
        },
        timeout=30,
    )

    if response.status_code != 200:
        raise WatsonxError(
            f"IAM token exchange failed [{response.status_code}]: {response.text}"
        )

    token = response.json().get("access_token", "")
    if not token:
        raise WatsonxError("IAM response did not contain access_token.")

    logger.debug("IAM token obtained successfully.")
    return token


# ─────────────────────────────────────────────────────────────────────────────
# Prompt builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_prompt(query: str, retrieved_answers: list[str]) -> str:
    """
    Build the structured prompt for the Granite model.

    Parameters
    ----------
    query             : original farmer question
    retrieved_answers : list of answer strings from FAISS retrieval

    Returns
    -------
    str – formatted prompt
    """
    context_block = "\n".join(
        f"- {ans}" for ans in retrieved_answers[:5]   # max 5 context items
    ) if retrieved_answers else "No prior records found."

    prompt = f"""You are an agricultural expert helping Indian farmers.

Use the provided context from the Kisan Call Centre database.

Context:
{context_block}

Farmer Question:
{query}

Provide:
1. Clear explanation
2. Step-by-step recommendation
3. Dosage if relevant
4. Preventive measures
5. Short summary

Answer:"""

    return prompt


# ─────────────────────────────────────────────────────────────────────────────
# Main public function
# ─────────────────────────────────────────────────────────────────────────────

def get_llm_answer(
    query: str,
    retrieved_context: list[str],
    model_id: str | None = None,
    params: dict | None = None,
) -> str:
    """
    Generate an AI-enhanced answer using IBM Watsonx Granite.

    Parameters
    ----------
    query             : farmer's question
    retrieved_context : list of offline answers from FAISS
    model_id          : override WATSONX_MODEL_ID (optional)
    params            : override generation parameters (optional)

    Returns
    -------
    str – generated answer text

    Raises
    ------
    WatsonxError – if credentials are missing or API call fails
    """
    api_key    = WATSONX_API_KEY
    project_id = WATSONX_PROJECT_ID
    base_url   = WATSONX_URL
    model      = model_id or WATSONX_MODEL_ID
    gen_params = params or DEFAULT_PARAMS

    # ── Validate credentials ──────────────────────────────────────────────
    if not api_key or api_key == "your_ibm_watsonx_api_key_here":
        raise WatsonxError(
            "WATSONX_API_KEY is not set. "
            "Please add your IBM Cloud API key to the .env file."
        )
    if not project_id or project_id == "your_project_id_here":
        raise WatsonxError(
            "WATSONX_PROJECT_ID is not set. "
            "Please add your Watsonx project ID to the .env file."
        )

    # ── Get IAM token ─────────────────────────────────────────────────────
    logger.info("Obtaining IAM token …")
    token = get_iam_token(api_key)

    # ── Build prompt ──────────────────────────────────────────────────────
    prompt = _build_prompt(query, retrieved_context)

    # ── Construct request payload ─────────────────────────────────────────
    payload = {
        "model_id":   model,
        "input":      prompt,
        "parameters": gen_params,
        "project_id": project_id,
    }

    headers = {
        "Accept":        "application/json",
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {token}",
    }

    url = f"{base_url}{GENERATE_ENDPOINT}"
    logger.info(f"Calling Watsonx API: {url} | model: {model}")

    # ── API call ──────────────────────────────────────────────────────────
    response = requests.post(url, headers=headers, json=payload, timeout=60)

    if response.status_code != 200:
        raise WatsonxError(
            f"Watsonx API error [{response.status_code}]: {response.text}"
        )

    data = response.json()

    # ── Extract generated text ────────────────────────────────────────────
    try:
        generated_text: str = data["results"][0]["generated_text"].strip()
    except (KeyError, IndexError) as exc:
        raise WatsonxError(f"Unexpected response structure: {data}") from exc

    logger.info(f"LLM response received ({len(generated_text)} chars).")
    return generated_text


# ─────────────────────────────────────────────────────────────────────────────
# Credential check helper (used by app.py on startup)
# ─────────────────────────────────────────────────────────────────────────────

def credentials_configured() -> bool:
    """Return True if both API key and project ID are non-empty placeholders."""
    return bool(
        WATSONX_API_KEY
        and WATSONX_API_KEY != "your_ibm_watsonx_api_key_here"
        and WATSONX_PROJECT_ID
        and WATSONX_PROJECT_ID != "your_project_id_here"
    )
