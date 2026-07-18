from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import pickle
import os
import base64
import io

# Load .env variables from parent directory if they exist
try:
    dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    if os.path.exists(dotenv_path):
        with open(dotenv_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    os.environ[key] = val
        print(f"✅ Loaded environment variables from {dotenv_path}")
except Exception as dotenv_err:
    print(f"⚠️ Failed to parse parent .env: {dotenv_err}")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── Model path: same folder as this file ──────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "cf_model.pkl")

cf_model = None
vs_model = None

# Load existing model on startup
try:
    with open(MODEL_PATH, "rb") as f:
        cf_model = pickle.load(f)
    # If saved as CollaborativeFilteringModel object, convert to dict
    if hasattr(cf_model, "__dict__") and not isinstance(cf_model, dict):
        cf_model = cf_model.__dict__
    print(f"CF Model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"CF Model not loaded: {e}")


# ── MongoDB helper ─────────────────────────────────────────────────────────────
async def fetch_mongo_interactions():
    mongo_uri = os.environ.get("MONGO_URI", "")
    if not mongo_uri:
        print("⚠️  MONGO_URI not set — cannot fetch interactions from DB")
        return []
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=8000, tlsAllowInvalidCertificates=True)
        db = client.get_default_database(default="test")
        cursor = db["interactions"].find({}, {"userId": 1, "productId": 1, "rating": 1, "weight": 1})
        interactions = []
        async for doc in cursor:
            interactions.append({
                "userId": str(doc["userId"]),
                "productId": str(doc["productId"]),
                "rating": doc.get("rating") or min((doc.get("weight", 1)) / 2, 5),
            })
        client.close()
        print(f"📦 Fetched {len(interactions)} interactions from MongoDB")
        return interactions
    except Exception as e:
        print(f"❌ MongoDB fetch error: {e}")
        return []


# ── Train helper (no dependency on collaborative_filtering.py) ─────────────────
def train_from_interactions(interactions):
    import pandas as pd
    from sklearn.decomposition import TruncatedSVD
    from scipy.sparse import csr_matrix

    df = pd.DataFrame(interactions)
    df = df.rename(columns={"userId": "user_id", "productId": "product_id", "rating": "rating"})
    df = df[["user_id", "product_id", "rating"]].drop_duplicates(subset=["user_id", "product_id"], keep="last")

    user_ids = list(df["user_id"].unique())
    product_ids = list(df["product_id"].unique())
    user_idx = {u: i for i, u in enumerate(user_ids)}
    prod_idx = {p: i for i, p in enumerate(product_ids)}

    rows = df["user_id"].map(user_idx)
    cols = df["product_id"].map(prod_idx)
    vals = df["rating"].astype(float)

    matrix = csr_matrix((vals, (rows, cols)), shape=(len(user_ids), len(product_ids)))
    n_factors = max(min(10, len(user_ids) - 1, len(product_ids) - 1), 1)

    svd = TruncatedSVD(n_components=n_factors, random_state=42)
    svd.fit(matrix)

    return {
        "svd_model": svd,
        "user_item_matrix": matrix,
        "user_ids": user_ids,
        "product_ids": product_ids,
    }


def save_cf_model(model_dict):
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model_dict, f)
    print(f"✅ CF model saved to {MODEL_PATH}")


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global vs_model, cf_model

    # If no model loaded, fetch from MongoDB and train
    if cf_model is None:
        print("🔄 No saved model — fetching interactions from MongoDB...")
        interactions = await fetch_mongo_interactions()
        if len(interactions) >= 5:
            try:
                model_dict = train_from_interactions(interactions)
                save_cf_model(model_dict)
                cf_model = model_dict
                print(f"✅ CF model trained on startup with {len(interactions)} interactions")
            except Exception as e:
                print(f"❌ Startup training failed: {e}")
        else:
            print(f"⚠️  Only {len(interactions)} interactions found — need at least 5")

    # Load visual search model
    try:
        print("Loading TensorFlow MobileNetV2 for visual search...")
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
        os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
        import tensorflow as tf
        tf.get_logger().setLevel('ERROR')
        from keras.applications import MobileNetV2
        vs_model = MobileNetV2(weights='imagenet', include_top=False, pooling='avg')
        print("Visual search model loaded")
    except Exception as e:
        print(f"Could not load TensorFlow model: {e}")
        vs_model = None


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Buyonix AI API running!", "status": "healthy"}


@app.get("/health")
def health():
    stats = {}
    if cf_model and isinstance(cf_model, dict):
        stats = {
            "n_users": len(cf_model.get("user_ids", [])),
            "n_products": len(cf_model.get("product_ids", [])),
        }
    return {
        "success": True,
        "status": "healthy",
        "cf_model": cf_model is not None,
        "vs_model": vs_model is not None,
        "stats": stats,
    }


@app.get("/recommendations/{user_id}")
def get_recommendations(user_id: str, limit: int = 10):
    try:
        if cf_model is None:
            return {"recommendations": [], "message": "Model not loaded"}

        user_ids = cf_model.get("user_ids", [])
        product_ids = cf_model.get("product_ids", [])
        user_item_matrix = cf_model.get("user_item_matrix")
        svd_model = cf_model.get("svd_model")

        if user_id not in user_ids:
            return {"recommendations": [], "message": "User not found in model", "userId": user_id}

        import numpy as np

        user_idx = user_ids.index(user_id)

        if hasattr(user_item_matrix, "toarray"):
            dense_matrix = user_item_matrix.toarray()
        else:
            dense_matrix = user_item_matrix.values if hasattr(user_item_matrix, "values") else user_item_matrix

        user_factors = svd_model.transform(dense_matrix)
        scores = user_factors[user_idx] @ svd_model.components_

        rated_mask = dense_matrix[user_idx] > 0
        scores[rated_mask] = -np.inf

        top_indices = np.argsort(scores)[::-1][:limit]

        recommendations = [
            {
                "product_id": str(product_ids[idx]),
                "predicted_rating": float(scores[idx])
            }
            for idx in top_indices
            if scores[idx] != -np.inf
        ]

        return {"recommendations": recommendations, "userId": user_id}

    except Exception as e:
        print(f"Recommendation error: {e}")
        return {"recommendations": [], "error": str(e)}


@app.post("/cf/train")
async def train_cf(request: Request):
    global cf_model
    try:
        data = await request.json()
        interactions = data.get("interactions", [])

        # If no interactions passed, fetch from MongoDB
        if not interactions:
            interactions = await fetch_mongo_interactions()

        if not interactions:
            return {"error": "No interactions provided"}

        print(f"🔄 Training CF model with {len(interactions)} interactions...")
        model_dict = train_from_interactions(interactions)
        save_cf_model(model_dict)
        cf_model = model_dict

        stats = {
            "n_users": len(model_dict["user_ids"]),
            "n_products": len(model_dict["product_ids"]),
        }
        print(f"✅ Model trained — {stats['n_users']} users, {stats['n_products']} products")
        return {"success": True, "stats": stats}

    except Exception as e:
        print(f"Training error: {e}")
        return {"error": str(e)}


@app.post("/extract")
async def extract_features(request: Request):
    if vs_model is None:
        return {"success": False, "error": "Visual search model not loaded"}
    try:
        import numpy as np
        from PIL import Image
        from keras.applications.mobilenet_v2 import preprocess_input
        from keras.preprocessing import image as keras_image

        data = await request.json()
        image_data = data.get("image") or data.get("imageUrl")

        if not image_data:
            return {"success": False, "error": "No image provided"}

        if "," in image_data:
            image_data = image_data.split(",")[1]

        image_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))

        img_array = keras_image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)

        features = vs_model.predict(img_array, verbose=0)
        return {"success": True, "features": features.flatten().tolist()}

    except Exception as e:
        print(f"Feature extraction error: {e}")
        return {"success": False, "error": str(e)}


@app.post("/visual-search")
async def visual_search(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        return {"results": [], "message": "Visual search processing"}
    except Exception as e:
        return {"results": [], "error": str(e)}


@app.get("/search")
async def semantic_search(q: str, limit: int = 20):
    try:
        if not q:
            return {"results": []}

        # 1. Fetch all active products
        mongo_uri = os.environ.get("MONGO_URI", "")
        if not mongo_uri:
            return {"results": [], "error": "MONGO_URI not set"}

        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=8000, tlsAllowInvalidCertificates=True)
        db = client.get_default_database(default="test")
        cursor = db["products"].find({"status": "active"}, {"_id": 1, "name": 1, "category": 1, "description": 1})

        products = []
        async for doc in cursor:
            products.append({
                "id": str(doc["_id"]),
                "name": doc.get("name") or "",
                "category": doc.get("category") or "",
                "description": doc.get("description") or "",
            })
        client.close()

        if not products:
            return {"results": []}

        # 2. Build Vocabulary, Stemmer and Spelling Corrector
        import re
        from collections import Counter

        COMMON_WORDS = {"wear", "clothing", "shoes", "pants", "shirt", "kids", "children", "baby", "men", "women", "electronic", "phone", "laptop", "bag", "sport", "toy", "book"}

        def stem(word):
            word = word.lower()
            if word.endswith("ren's") or word.endswith("rens") or word.endswith("ren"):
                return "child"
            if word.endswith("s") and not word.endswith("ss"):
                word = word[:-1]
            if word.endswith("es"):
                word = word[:-2]
            if word.endswith("ing"):
                word = word[:-3]
            return word

        def tokenize(text):
            raw_tokens = re.findall(r'[a-z0-9]+', text.lower())
            return [stem(t) for t in raw_tokens]

        vocabulary = []
        for p in products:
            vocabulary.extend(tokenize(p["name"]))
            vocabulary.extend(tokenize(p["category"]))

        words_counter = Counter(vocabulary)

        def edit_distance_1(word):
            letters = 'abcdefghijklmnopqrstuvwxyz0123456789'
            splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
            deletes = [L + R[1:] for L, R in splits if R]
            transposes = [L + R[1] + R[0] + R[2:] for L, R in splits if len(R) > 1]
            replaces = [L + c + R[1:] for L, R in splits if R for c in letters]
            inserts = [L + c + R for L, R in splits for c in letters]
            return set(deletes + transposes + replaces + inserts)

        def correct_word(word):
            word = word.lower()
            stemmed = stem(word)
            if word in words_counter or stemmed in words_counter or word in COMMON_WORDS or not word.isalnum():
                return word
            candidates = set(w for w in edit_distance_1(word) if w in words_counter)
            if candidates:
                return max(candidates, key=lambda w: words_counter[w])
            candidates_2 = set(w2 for w1 in edit_distance_1(word) for w2 in edit_distance_1(w1) if w2 in words_counter)
            if candidates_2:
                return max(candidates_2, key=lambda w: words_counter[w])
            return word

        # Correct query terms and tokenize
        raw_query_terms = re.findall(r'[a-z0-9]+', q.lower())
        corrected_terms = []
        for term in raw_query_terms:
            corrected = correct_word(term)
            corrected_terms.append(stem(corrected))
            if stem(term) != stem(corrected):
                corrected_terms.append(stem(term))

        query_tokens = list(dict.fromkeys(corrected_terms))
        corrected_query = " ".join(query_tokens)
        print(f"🔎 AI Search Input: '{q}' -> Stemmed Expanded Query: '{corrected_query}'")

        # 3. TF-IDF Semantic Search using Scikit-Learn
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        docs = []
        for p in products:
            name_stemmed = " ".join(tokenize(p['name']))
            category_stemmed = " ".join(tokenize(p['category']))
            desc_stemmed = " ".join(tokenize(p['description']))
            doc_text = f"{name_stemmed} {name_stemmed} {category_stemmed} {desc_stemmed}"
            docs.append(doc_text)

        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(docs)
        query_vec = vectorizer.transform([corrected_query])

        similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()

        results = []
        for p, score in zip(products, similarities):
            if score > 0.01:
                results.append({
                    "id": p["id"],
                    "score": float(score)
                })

        results.sort(key=lambda x: x["score"], reverse=True)

        return {
            "success": True,
            "corrected_query": corrected_query,
            "results": results[:limit]
        }

    except Exception as e:
        print(f"❌ AI Semantic Search Error: {e}")
        return {"success": False, "error": str(e)}
