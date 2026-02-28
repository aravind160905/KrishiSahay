"""
app.py
------
Kisan Call Centre Query Assistant – Hackathon Edition
Streamlit UI with offline FAISS retrieval + online IBM Watsonx Granite.

Run:
  streamlit run app.py
"""

import os
import sys
import json
import pickle
import logging

import numpy as np
import streamlit as st
from dotenv import load_dotenv

# ── Path setup ────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
DATA_DIR       = os.path.join(BASE_DIR, "data")
EMBEDDINGS_DIR = os.path.join(BASE_DIR, "embeddings")

sys.path.insert(0, BASE_DIR)   # ensure services/ is importable

load_dotenv(os.path.join(BASE_DIR, ".env"))

# ── Service imports ───────────────────────────────────────────────────────────
from services.preprocess         import preprocess
from services.generate_embeddings import generate_embeddings
from services.vector_store       import (
    build_and_save_index,
    load_faiss_index,
    load_metadata,
    index_exists,
)
from services.query_pipeline     import get_offline_answer
from services.watsonx_api        import get_llm_answer, WatsonxError, credentials_configured

from streamlit_mic_recorder import mic_recorder
import speech_recognition as sr

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from deep_translator import GoogleTranslator

def translate_to_english(text):
    try:
        if not text or not isinstance(text, str): return text
        return GoogleTranslator(source='hi', target='en').translate(text)
    except:
        return text

def translate_to_hindi(text):
    try:
        if not text or not isinstance(text, str): return text
        return GoogleTranslator(source='en', target='hi').translate(text)
    except:
        return text


# ─────────────────────────────────────────────────────────────────────────────
# Page config (must be FIRST Streamlit call)
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Kisan Call Centre – AI Query Assistant",
    page_icon="🌾",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────────────────────
# Translations & Speech Recognition
# ─────────────────────────────────────────────────────────────────────────────

TRANSLATIONS = {
    "English": {
        "settings": "## ⚙️ Settings",
        "num_results": "Number of results to retrieve",
        "dataset_info": "## 📊 Dataset Info",
        "total_records": "Total Records",
        "unique_crops": "Unique Crops",
        "unique_states": "Unique States",
        "api_status": "## 🔑 API Status",
        "creds_set": "✅ Watsonx credentials set",
        "creds_missing": "⚠️ Watsonx not configured\n\nAdd credentials to `.env` to enable Online Mode.",
        "quick_guide": "## 📖 Quick Guide",
        "guide_text": "1. Type or speak your farming question\n2. Enable **Online AI** for LLM answer\n3. Click **Get Expert Advice**\n4. View matched past queries at bottom",
        "hero_title": "🌾 Kisan Call Centre Query Assistant",
        "hero_sub": "AI-Powered Agricultural Helpdesk for Indian Farmers",
        "hero_badge": "🏆 Hackathon Edition &nbsp;|&nbsp; FAISS + IBM Watsonx Granite",
        "input_label": "🌱 Enter Your Farming Question",
        "input_placeholder": "e.g. My paddy leaves are turning yellow. What fertilizer should I apply?",
        "toggle_label": "🤖 Enable Online AI Enhancement",
        "toggle_help": "Uses IBM Watsonx Granite to generate an enhanced answer. Requires credentials in .env",
        "btn_label": "🔍 Get Expert Advice",
        "mic_label": "🎤 Record Question",
        "warn_creds": "⚠️ **Online Mode** is enabled but Watsonx credentials are not configured.  The app will automatically fall back to the offline answer.  \nAdd `WATSONX_API_KEY` and `WATSONX_PROJECT_ID` to your `.env` file to activate.",
        "err_empty": "❗ Please enter a question before clicking **Get Expert Advice**.",
        "spin_offline": "🌾 Searching the KCC knowledge base …",
        "offline_hdr": "📘 Offline Expert Advice (Database-Based)",
        "spin_online": "🤖 Consulting IBM Watsonx Granite AI …",
        "online_hdr": "🤖 AI Enhanced Advisory (IBM Watsonx Granite)",
        "err_online": "⚠️ **Online AI failed** – showing offline answer only.",
        "info_offline": "💡 Offline answer is still shown above with full details.",
        "similar_hdr": "🔍 Top 5 Similar Past Farmer Queries",
        "no_similar": "No similar queries found.",
        "similarity": "Similarity",
        "sr_lang": "en-IN"
    },
    "Hindi": {
        "settings": "## ⚙️ सेटिंग्स",
        "num_results": "प्राप्त करने वाले परिणामों की संख्या",
        "dataset_info": "## 📊 डेटासेट जानकारी",
        "total_records": "कुल रिकॉर्ड",
        "unique_crops": "अद्वितीय फसलें",
        "unique_states": "अद्वितीय राज्य",
        "api_status": "## 🔑 API स्थिति",
        "creds_set": "✅ Watsonx क्रेडेंशियल सेट",
        "creds_missing": "⚠️ Watsonx कॉन्फ़िगर नहीं किया गया",
        "quick_guide": "## 📖 त्वरित मार्गदर्शिका",
        "guide_text": "1. अपना खेती का सवाल टाइप करें या बोलें\n2. ऑनलाइन AI चालू करें\n3. विशेषज्ञ की सलाह लें\n4. पिछले सवाल देखें",
        "hero_title": "🌾 किसान कॉल सेंटर क्वेरी सहायक",
        "hero_sub": "भारतीय किसानों के लिए AI-संचालित कृषि हेल्पडेस्क",
        "hero_badge": "🏆 हैकाथॉन संस्करण &nbsp;|&nbsp; FAISS + IBM Watsonx Granite",
        "input_label": "🌱 अपना खेती का सवाल दर्ज करें",
        "input_placeholder": "उदा. मेरे धान के पत्ते पीले हो रहे हैं। मुझे कौन सा उर्वरक डालना चाहिए?",
        "toggle_label": "🤖 ऑनलाइन AI संवर्द्धन सक्षम करें",
        "toggle_help": "उन्नत उत्तर उत्पन्न करने के लिए IBM Watsonx Granite का उपयोग करता है।",
        "btn_label": "🔍 विशेषज्ञ सलाह प्राप्त करें",
        "mic_label": "🎤 सवाल रिकॉर्ड करें",
        "warn_creds": "⚠️ ऑनलाइन मोड सक्षम है लेकिन क्रेडेंशियल कॉन्फ़िगर नहीं हैं।",
        "err_empty": "❗ कृपया बटन पर क्लिक करने से पहले एक प्रश्न दर्ज करें।",
        "spin_offline": "🌾 KCC नॉलेज बेस खोजा जा रहा है …",
        "offline_hdr": "📘 ऑफ़लाइन विशेषज्ञ सलाह (डेटाबेस-आधारित)",
        "spin_online": "🤖 IBM Watsonx Granite AI से परामर्श …",
        "online_hdr": "🤖 AI संवर्धित सलाहकार (IBM Watsonx Granite)",
        "err_online": "⚠️ ऑनलाइन AI विफल - केवल ऑफ़लाइन उत्तर दिखाया जा रहा है।",
        "info_offline": "💡 ऑफ़लाइन उत्तर अभी भी पूर्ण विवरण के साथ ऊपर दिखाया गया है।",
        "similar_hdr": "🔍 शीर्ष 5 पिछले किसान प्रश्न",
        "no_similar": "कोई समान प्रश्न नहीं मिला।",
        "similarity": "समानता",
        "sr_lang": "hi-IN"
    },
    "Telugu": {
        "settings": "## ⚙️ సెట్టింగులు",
        "num_results": "పొందాల్సిన ఫలితాల సంఖ్య",
        "dataset_info": "## 📊 డేటాసెట్ సమాచారం",
        "total_records": "మొత్తం రికార్డులు",
        "unique_crops": "ప్రత్యేక పంటలు",
        "unique_states": "ప్రత్యేక రాష్ట్రాలు",
        "api_status": "## 🔑 API స్థితి",
        "creds_set": "✅ Watsonx ఆధారాలు సెట్ చేయబడ్డాయి",
        "creds_missing": "⚠️ Watsonx కాన్ఫిగర్ చేయబడలేదు",
        "quick_guide": "## 📖 క్విక్ గైడ్",
        "guide_text": "1. మీ వ్యవసాయ ప్రశ్నను టైప్ చేయండి లేదా మాట్లాడండి\n2. ఆన్‌లైన్ AI ప్రారంభించండి\n3. నిపుణుల సలహా పొందండి\n4. గత ప్రశ్నలను వీక్షించండి",
        "hero_title": "🌾 కిసాన్ కాల్ సెంటర్ క్వెరీ అసిస్టెంట్",
        "hero_sub": "భారతీయ రైతుల కోసం AI-ఆధారిత వ్యవసాయ హెల్ప్‌డెస్క్",
        "hero_badge": "🏆 హ్యాకథాన్ ఎడిషన్ &nbsp;|&nbsp; FAISS + IBM Watsonx Granite",
        "input_label": "🌱 మీ వ్యవసాయ ప్రశ్నను నమోదు చేయండి",
        "input_placeholder": "ఉదా. నా వరి ఆకులు పసుపు రంగులోకి మారుతున్నాయి. నేను ఏ ఎరువులు వాడాలి?",
        "toggle_label": "🤖 ఆన్‌లైన్ AI వృద్ధిని ప్రారంభించండి",
        "toggle_help": "మెరుగైన సమాధానం కోసం IBM Watsonx Graniteని ఉపయోగిస్తుంది.",
        "btn_label": "🔍 నిపుణుల సలహా పొందండి",
        "mic_label": "🎤 ప్రశ్నను రికార్డ్ చేయండి",
        "warn_creds": "⚠️ ఆన్‌లైన్ మోడ్ ప్రారంభించబడింది కానీ ఆధారాలు కాన్ఫిగర్ చేయబడలేదు.",
        "err_empty": "❗ దయచేసి క్లిక్ చేయడానికి ముందు ఒక ప్రశ్నను నమోదు చేయండి.",
        "spin_offline": "🌾 KCC నాలెడ్జ్ బేస్ వెతుకుతోంది …",
        "offline_hdr": "📘 ఆఫ్‌లైన్ నిపుణుల సలహా (డేటాబేస్ ఆధారితం)",
        "spin_online": "🤖 IBM Watsonx Granite AIని సంప్రదిస్తోంది …",
        "online_hdr": "🤖 AI మెరుగైన సలహా (IBM Watsonx Granite)",
        "err_online": "⚠️ ఆన్‌లైన్ AI విఫలమైంది - ఆఫ్‌లైన్ సమాధానం మాత్రమే చూపుతోంది.",
        "info_offline": "💡 ఆఫ్‌లైన్ సమాధానం ఇప్పటికీ పైన చూపబడింది.",
        "similar_hdr": "🔍 టాప్ 5 గత రైతుల ప్రశ్నలు",
        "no_similar": "సారూప్య ప్రశ్నలు కనుగొనబడలేదు.",
        "similarity": "సారూప్యత",
        "sr_lang": "te-IN"
    }
}

def transcribe_audio(audio_bytes, lang_code="en-IN"):
    """Convert audio bytes to text using Google Speech Recognition"""
    import io
    temp_wav_path = os.path.join(BASE_DIR, "temp_audio.wav")
    try:
        r = sr.Recognizer()

        # Try direct WAV read first via BytesIO
        try:
            audio_io = io.BytesIO(audio_bytes)
            with sr.AudioFile(audio_io) as source:
                audio_data = r.record(source)
        except Exception as direct_err:
            logger.warning(f"Direct WAV read failed ({direct_err}), trying pydub conversion...")
            # Fallback: use pydub to convert from whatever format the browser sent
            from pydub import AudioSegment
            audio_io = io.BytesIO(audio_bytes)
            audio_segment = AudioSegment.from_file(audio_io)
            audio_segment = audio_segment.set_frame_rate(16000).set_channels(1).set_sample_width(2)
            wav_io = io.BytesIO()
            audio_segment.export(wav_io, format="wav")
            wav_io.seek(0)
            with sr.AudioFile(wav_io) as source:
                audio_data = r.record(source)

        text = r.recognize_google(audio_data, language=lang_code)
        logger.info(f"Transcribed: {text}")
        return text
    except sr.UnknownValueError:
        logger.warning("Speech recognition could not understand audio")
        return ""
    except Exception as e:
        logger.error(f"Speech recognition error: {e}")
        return ""
    finally:
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)


# ─────────────────────────────────────────────────────────────────────────────
# Custom CSS
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    """
<style>
/* ── Google Font ─────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* ── Global ──────────────────────────────────────────── */
html, body, [class*="css"] {
    font-family: 'Inter', sans-serif;
}

/* ── Background gradient ─────────────────────────────── */
.stApp {
    background: linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0f2d1a 100%);
    min-height: 100vh;
}

/* ── Hero banner ─────────────────────────────────────── */
.hero-banner {
    background: linear-gradient(135deg, #1a6e2e 0%, #2d8a3e 40%, #22704a 80%, #0f5c2e 100%);
    border-radius: 18px;
    padding: 2.5rem 3rem;
    margin-bottom: 1.8rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.08);
    text-align: center;
    position: relative;
    overflow: hidden;
}
.hero-banner::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%);
    animation: shimmer 6s infinite;
}
@keyframes shimmer {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.hero-title {
    font-size: 2.6rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    letter-spacing: -0.5px;
    text-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.hero-subtitle {
    font-size: 1.1rem;
    color: rgba(255,255,255,0.82);
    margin: 0.5rem 0 0 0;
    font-weight: 300;
    letter-spacing: 0.5px;
}
.hero-badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 0.75rem;
    color: #d4f5d4;
    margin-top: 1rem;
    backdrop-filter: blur(4px);
}

/* ── Input area ──────────────────────────────────────── */
.stTextArea textarea,
.stTextArea > div > div > textarea,
[data-testid="stTextArea"] textarea,
[data-baseweb="textarea"] textarea,
.stTextInput input,
[data-testid="stTextInput"] input,
[data-baseweb="input"] input {
    background: #1a2e1a !important;
    border: 1.5px solid rgba(76,175,80,0.5) !important;
    border-radius: 12px !important;
    color: #ffffff !important;
    caret-color: #66ff66 !important;
    font-size: 1rem !important;
    padding: 14px !important;
    transition: border-color 0.3s;
    -webkit-text-fill-color: #ffffff !important;
    opacity: 1 !important;
}
.stTextArea textarea:focus,
.stTextArea > div > div > textarea:focus,
[data-testid="stTextArea"] textarea:focus,
[data-baseweb="textarea"] textarea:focus {
    border-color: #4caf50 !important;
    box-shadow: 0 0 18px rgba(76,175,80,0.25) !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    background: #1a2e1a !important;
}
.stTextArea textarea::placeholder,
[data-testid="stTextArea"] textarea::placeholder {
    color: rgba(180,220,180,0.5) !important;
    -webkit-text-fill-color: rgba(180,220,180,0.5) !important;
}
/* ── Labels ──────────────────────────────────────────── */
.stTextArea label,
[data-testid="stTextArea"] label,
.stTextInput label {
    color: #a5d6a7 !important;
    font-weight: 500 !important;
}

/* ── Buttons ─────────────────────────────────────────── */
.stButton > button {
    background: linear-gradient(135deg, #2e7d32, #4caf50) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 0.65rem 2rem !important;
    font-size: 1.05rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.3px !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    box-shadow: 0 4px 15px rgba(46,125,50,0.4) !important;
}
.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(76,175,80,0.5) !important;
    background: linear-gradient(135deg, #388e3c, #66bb6a) !important;
}

/* ── Toggle ──────────────────────────────────────────── */
.stToggle > label {
    color: #a5d6a7 !important;
    font-weight: 500 !important;
}

/* ── Cards ───────────────────────────────────────────── */
.result-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 1.6rem;
    margin: 0.8rem 0;
    backdrop-filter: blur(8px);
    transition: transform 0.2s, box-shadow 0.2s;
}
.result-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.result-card-offline {
    border-left: 4px solid #4caf50;
}
.result-card-online {
    border-left: 4px solid #2196f3;
}
.card-header {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
}
.card-header-offline { color: #81c784; }
.card-header-online  { color: #64b5f6; }

/* ── Confidence meter ────────────────────────────────── */
.confidence-wrapper {
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 12px 16px;
    margin: 12px 0;
}
.confidence-label {
    font-size: 0.82rem;
    color: #b0bec5;
    margin-bottom: 6px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.8px;
}

/* ── Similar queries ─────────────────────────────────── */
.similar-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px 16px;
    margin: 6px 0;
    transition: background 0.2s;
}
.similar-card:hover {
    background: rgba(255,255,255,0.06);
}
.similar-q {
    font-size: 0.92rem;
    color: #a5d6a7;
    font-weight: 500;
    margin-bottom: 4px;
}
.similar-a {
    font-size: 0.85rem;
    color: #90a4ae;
    line-height: 1.5;
}
.similar-meta {
    font-size: 0.75rem;
    color: #607d8b;
    margin-top: 4px;
}

/* ── Section separator ───────────────────────────────── */
.section-sep {
    border: none;
    border-top: 1px solid rgba(255,255,255,0.08);
    margin: 1.5rem 0;
}

/* ── Footer ──────────────────────────────────────────── */
.footer {
    text-align: center;
    padding: 2rem 0 1rem;
    color: rgba(255,255,255,0.35);
    font-size: 0.82rem;
    letter-spacing: 0.5px;
}
.footer span {
    font-weight: 600;
    color: rgba(76,175,80,0.7);
}

/* ── Sidebar ─────────────────────────────────────────── */
[data-testid="stSidebar"] {
    background: rgba(10, 22, 40, 0.8) !important;
    border-right: 1px solid rgba(255,255,255,0.06) !important;
}
[data-testid="stSidebar"] * {
    color: #cfd8dc !important;
}

/* ── Expander ────────────────────────────────────────── */
details > summary {
    color: #a5d6a7 !important;
    font-weight: 600 !important;
    font-size: 1rem !important;
}
[data-testid="stExpander"] {
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 12px !important;
}

/* ── Markdown text in dark bg ────────────────────────── */
.stMarkdown p, .stMarkdown li, .stMarkdown h1,
.stMarkdown h2, .stMarkdown h3 {
    color: #e0f2f1 !important;
}

/* ── Alert / info boxes ──────────────────────────────── */
.stAlert {
    border-radius: 10px !important;
}

/* ── Status chip ─────────────────────────────────────── */
.status-chip {
    display: inline-block;
    border-radius: 12px;
    padding: 3px 10px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.5px;
}
.chip-high   { background: rgba(76,175,80,0.2);  color: #81c784; border: 1px solid rgba(76,175,80,0.4); }
.chip-medium { background: rgba(255,193,7,0.2);  color: #ffd54f; border: 1px solid rgba(255,193,7,0.4); }
.chip-low    { background: rgba(244,67,54,0.2);  color: #ef9a9a; border: 1px solid rgba(244,67,54,0.4); }
</style>
""",
    unsafe_allow_html=True,
)


# ─────────────────────────────────────────────────────────────────────────────
# Index / resource loading (cached so it happens only once per session)
# ─────────────────────────────────────────────────────────────────────────────

@st.cache_resource(show_spinner="🌱 Initialising knowledge base …")
def load_resources():
    """
    One-time load of all heavy resources:
      1. Preprocess raw CSV → clean CSV + JSON (if needed)
      2. Generate embeddings (if needed)
      3. Build/load FAISS index
      4. Load SentenceTransformer model
    Returns (index, metadata, embed_model) or raises on failure.
    """
    from sentence_transformers import SentenceTransformer

    raw_csv  = os.path.join(DATA_DIR, "raw_kcc.csv")
    clean_csv = os.path.join(DATA_DIR, "clean_kcc.csv")
    json_path = os.path.join(DATA_DIR, "kcc_qa_pairs.json")

    # ── Step 1: Preprocess if needed ──────────────────────────────────────
    if not os.path.exists(json_path) or os.path.getsize(json_path) < 10:
        if not os.path.exists(raw_csv):
            raise FileNotFoundError(
                f"raw_kcc.csv not found at {raw_csv}. "
                "Please add your KCC dataset to the data/ folder."
            )
        preprocess(raw_csv, clean_csv, json_path)

    # ── Step 2: Generate embeddings if needed ────────────────────────────
    index_path = os.path.join(EMBEDDINGS_DIR, "faiss_index.index")
    meta_path  = os.path.join(EMBEDDINGS_DIR, "meta.pkl")

    if not index_exists(index_path, meta_path):
        _, embeddings_matrix = generate_embeddings(
            json_path=json_path,
            embeddings_dir=EMBEDDINGS_DIR,
        )
        
        # We need to read the metadata that was just saved by generate_embeddings,
        # or we could rewrite build_and_save_index to not need to rewrite the metadata.
        import pickle
        with open(meta_path, "rb") as f:
            metadata_to_save = pickle.load(f)
            
        build_and_save_index(embeddings_matrix, metadata_to_save, index_path, meta_path)
    
    # ── Step 3: Load FAISS + metadata ────────────────────────────────────
    faiss_index = load_faiss_index(index_path)
    metadata    = load_metadata(meta_path)

    # ── Step 4: Load embedding model ─────────────────────────────────────
    embed_model = SentenceTransformer("all-MiniLM-L6-v2")

    return faiss_index, metadata, embed_model


# ─────────────────────────────────────────────────────────────────────────────
# Confidence bar helper
# ─────────────────────────────────────────────────────────────────────────────

def render_confidence(label: str, score: float):
    """Render confidence label chip + Streamlit progress bar."""
    chip_class = {"High": "chip-high", "Medium": "chip-medium", "Low": "chip-low"}.get(label, "chip-low")
    st.markdown(
        f'<div class="confidence-wrapper">'
        f'<div class="confidence-label">Confidence &nbsp; '
        f'<span class="status-chip {chip_class}">{label}</span></div>',
        unsafe_allow_html=True,
    )
    st.progress(float(score), text=f"{float(score)*100:.1f}%")
    st.markdown("</div>", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# Sidebar
# ─────────────────────────────────────────────────────────────────────────────

def render_sidebar(metadata: list[dict]):
    with st.sidebar:
        lang = st.selectbox("🌐 Language / भाषा / వాయిస్ మద్దతు", ["English", "Hindi", "Telugu"])
        t = TRANSLATIONS[lang]
        
        st.markdown(t["settings"])
        st.markdown("---")

        top_k = st.slider(t["num_results"], 3, 10, 5, 1)

        st.markdown("---")
        st.markdown(t["dataset_info"])
        st.metric(t["total_records"], len(metadata))

        # Unique crops and states
        crops  = {m.get("crop", "") for m in metadata if m.get("crop")}
        states = {m.get("state", "") for m in metadata if m.get("state")}
        st.metric(t["unique_crops"],  len(crops))
        st.metric(t["unique_states"], len(states))

        st.markdown("---")
        st.markdown(t["api_status"])
        if credentials_configured():
            st.success(t["creds_set"])
        else:
            st.warning(t["creds_missing"])

        st.markdown("---")
        st.markdown(t["quick_guide"])
        st.info(t["guide_text"])

        return top_k, lang, t


# ─────────────────────────────────────────────────────────────────────────────
# Hero banner
# ─────────────────────────────────────────────────────────────────────────────

def render_hero(t):
    st.markdown(
        f"""
        <div class="hero-banner">
            <div class="hero-title">{t['hero_title']}</div>
            <div class="hero-subtitle">{t['hero_sub']}</div>
            <div class="hero-badge">{t['hero_badge']}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Similar queries panel
# ─────────────────────────────────────────────────────────────────────────────

def render_similar_queries(top_results: list[dict], t: dict):
    st.markdown('<hr class="section-sep">', unsafe_allow_html=True)
    
    # Show header with a more obvious visual indicator
    st.markdown(f"## 🔍 {t['similar_hdr']}")
    st.write(f"🎯 **Found {len(top_results)} similar queries:**")
    
    if not top_results:
        st.info(t["no_similar"])
        return

    for i, res in enumerate(top_results[:5], start=1):
        meta  = res["metadata"]
        score = res["similarity_score"]
        q     = meta.get("question", "—")
        a     = meta.get("answer", "—")
        crop  = meta.get("crop", "")
        state = meta.get("state", "")
        dist  = meta.get("district", "")
        cat   = meta.get("category", "")

        # Translate to selected language if not English
        if t["sr_lang"] != "en-IN":
            q = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(q) if q != "—" else q
            a = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(a) if a != "—" else a
            crop = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(crop) if crop else ""
            state = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(state) if state else ""
            dist = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(dist) if dist else ""
            cat = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(cat) if cat else ""

        meta_parts = [p for p in [crop, state, dist, cat] if p]
        meta_str   = " · ".join(meta_parts) if meta_parts else ""

        st.markdown(
            f"""
            <div class="similar-card">
                <div class="similar-q">#{i} &nbsp; {q}</div>
                <div class="similar-a">{a}</div>
                <div class="similar-meta">
                    {'📦 ' + meta_str if meta_str else ''}
                    &nbsp;&nbsp; 🎯 {t['similarity']}: {float(score)*100:.1f}%
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Main application
# ─────────────────────────────────────────────────────────────────────────────

def main():
    # ── Load resources ────────────────────────────────────────────────────
    try:
        faiss_index, metadata, embed_model = load_resources()
        resources_ok = True
    except Exception as e:
        st.error(f"❌ Failed to load resources: {e}")
        st.stop()
        return

    # ── Sidebar ───────────────────────────────────────────────────────────
    top_k, lang, t = render_sidebar(metadata)

    # ── Hero ──────────────────────────────────────────────────────────────
    render_hero(t)

    # ── Inject pending voice text BEFORE widget renders ────────────────────
    if "_pending_voice_text" in st.session_state:
        st.session_state.query_input = st.session_state._pending_voice_text
        del st.session_state._pending_voice_text

    # ── Query input & Mic ─────────────────────────────────────────────────
    col_input, col_control = st.columns([3, 1])

    with col_input:
        user_query = st.text_area(
            t["input_label"],
            placeholder=t["input_placeholder"],
            height=130,
            key="query_input",
            label_visibility="visible",
        )

    with col_control:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)  # spacer
        
        # Audio Recorder
        st.write(t["mic_label"])
        audio = mic_recorder(start_prompt="⏺️ Record", stop_prompt="⏹️ Stop", format="wav", key='recorder')
        if audio and 'bytes' in audio:
            with st.spinner("🎙️ Converting speech to text..."):
                transcribed_text = transcribe_audio(audio['bytes'], t["sr_lang"])
                logger.info(f"Transcribed text: '{transcribed_text}'")
                if transcribed_text and transcribed_text != st.session_state.get("_last_voice_text"):
                    st.session_state._last_voice_text = transcribed_text
                    st.session_state._pending_voice_text = transcribed_text
                    st.rerun()

        enable_online = st.toggle(
            t["toggle_label"],
            value=False,
            help=t["toggle_help"],
            key="online_toggle",
        )
        get_answer_btn = st.button(t["btn_label"], use_container_width=True)

    # ── Warning if online enabled but creds missing ───────────────────────
    if enable_online and not credentials_configured():
        st.warning(t["warn_creds"])

    st.markdown('<hr class="section-sep">', unsafe_allow_html=True)

    # ── On button click ───────────────────────────────────────────────────
    if get_answer_btn:
        if not user_query.strip():
            st.error(t["err_empty"])
            return

        # ── Offline retrieval ─────────────────────────────────────────────
        # Translate query to English for embedding model if not already English
        search_query = user_query
        if t["sr_lang"] != "en-IN":
            search_query = translate_to_english(user_query)

        with st.spinner(t["spin_offline"]):
            offline_result = get_offline_answer(
                query    = search_query,
                index    = faiss_index,
                metadata = metadata,
                model    = embed_model,
                top_k    = top_k,
            )
            
        # Translate offline answers back to selected language if not English
        if t["sr_lang"] != "en-IN" and offline_result.get("formatted_answers"):
            translated_answers = []
            for answer in offline_result["formatted_answers"]:
                translated_answer = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(answer)
                translated_answers.append(translated_answer)
            offline_result["formatted_answers"] = translated_answers

        # ── Display offline card ──────────────────────────────────────────
        with st.expander(t["offline_hdr"], expanded=True):
            st.markdown(
                f'<div class="result-card result-card-offline">'
                f'<div class="card-header card-header-offline">{t["offline_hdr"].split(" (")[0]}</div>',
                unsafe_allow_html=True,
            )
            render_confidence(
                offline_result["confidence_label"],
                offline_result["confidence_score"],
            )
            
            # Display all 5 answers
            if offline_result.get("formatted_answers"):
                for answer in offline_result["formatted_answers"]:
                    st.markdown(answer)
                    st.markdown("---")  # Add separator between answers
            else:
                st.markdown(offline_result["formatted_answer"])
            
            st.markdown("</div>", unsafe_allow_html=True)

        # ── Online mode ───────────────────────────────────────────────────
        if enable_online:
            with st.spinner(t["spin_online"]):
                try:
                    llm_answer = get_llm_answer(
                        query             = search_query, # LLM expects English context
                        retrieved_context = offline_result["unique_answers"],
                    )
                    # Translate LLM answer back to selected language if not English
                    if t["sr_lang"] != "en-IN":
                        llm_answer = GoogleTranslator(source='en', target=t["sr_lang"].split('-')[0]).translate(llm_answer)
                    llm_success = True
                except WatsonxError as e:
                    llm_answer  = str(e)
                    llm_success = False
                except Exception as e:
                    llm_answer  = f"Unexpected error: {e}"
                    llm_success = False

            if llm_success:
                with st.expander(t["online_hdr"], expanded=True):
                    st.markdown(
                        f'<div class="result-card result-card-online">'
                        f'<div class="card-header card-header-online">{t["online_hdr"].split(" (")[0]}</div>',
                        unsafe_allow_html=True,
                    )
                    # Display answer preserving Unicode / Hindi text
                    st.markdown(llm_answer)
                    st.markdown("</div>", unsafe_allow_html=True)
            else:
                # Graceful fallback
                st.error(f"{t['err_online']}\n\nReason: {llm_answer}")
                st.info(t["info_offline"])

        # ── Similar queries panel ─────────────────────────────────────────
        render_similar_queries(offline_result["top_results"], t)

    # ── Footer ────────────────────────────────────────────────────────────
    st.markdown(
        '<div class="footer">'
        '⚡ Powered by <span>FAISS</span> + <span>IBM Watsonx Granite</span> + '
        '<span>Sentence Transformers</span>'
        '</div>',
        unsafe_allow_html=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    main()
