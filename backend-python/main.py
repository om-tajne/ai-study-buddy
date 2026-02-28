import os
import psycopg2
from google import genai 
from google.genai import types  # For correct Part formatting
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv

# 1. Setup & Config
load_dotenv()
app = FastAPI()

# Initialize Modern Gemini Client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_conn():
    try:
        conn = psycopg2.connect(os.getenv("DB_URL"))
        try:
            register_vector(conn)
        except:
            pass 
        return conn
    except Exception as e:
        print(f"❌ DATABASE CONNECTION ERROR: {e}")
        return None

# 2. Health Check
@app.get("/")
def health_check():
    conn = get_db_conn()
    return {
        "status": "Online", 
        "gemini_ready": bool(os.getenv("GEMINI_API_KEY")),
        "database_connected": conn is not None
    }

# 3. Transcription & Indexing
@app.post("/process-lecture")
async def process_lecture(payload: dict = Body(...)):
    conn = get_db_conn()
    if conn is None:
        raise HTTPException(status_code=500, detail="Database connection failed.")
    
    lecture_id = payload.get("lecture_id")
    file_path = payload.get("file_path")

    try:
        # Path correction for uploads
        corrected_path = os.path.join("..", file_path) if not os.path.exists(file_path) else file_path
        
        print(f"🎙️ Gemini is transcribing: {corrected_path}")
        
        # Read file as bytes
        with open(corrected_path, "rb") as f:
            audio_data = f.read()

        # UPDATED: Using gemini-flash-latest to avoid 404 errors
        response = gemini_client.models.generate_content(
            model="gemini-flash-latest", 
            contents=[
                types.Part.from_bytes(data=audio_data, mime_type="audio/mpeg"),
                "Please provide a high-quality word-for-word transcript of this audio lecture."
            ]
        )
        
        full_text = response.text
        if not full_text:
            raise ValueError("Gemini returned an empty transcript.")

        # Update Database
        cur = conn.cursor()
        cur.execute("UPDATE lectures SET transcript = %s WHERE id = %s", (full_text, lecture_id))
        cur.execute("INSERT INTO lecture_embeddings (lecture_id, content) VALUES (%s, %s)", (lecture_id, full_text))

        conn.commit()
        cur.close()
        conn.close()

        print(f"✅ Lecture {lecture_id} processed successfully!")
        return {"status": "success"}

    except Exception as e:
        print(f"❌ TRANSCRIPTION ERROR: {str(e)}")
        return {"status": "error", "message": str(e)}

# 4. Chat Endpoint
@app.post("/ask")
async def ask_question(payload: dict = Body(...)):
    conn = get_db_conn()
    if conn is None:
        raise HTTPException(status_code=500, detail="Database connection failed.")

    question = payload.get("question")
    lecture_id = payload.get("lecture_id")

    try:
        cur = conn.cursor()
        cur.execute("SELECT transcript FROM lectures WHERE id = %s", (lecture_id,))
        result = cur.fetchone()
        
        if not result or not result[0]:
            return {"answer": "I haven't processed this lecture yet. Please wait a moment!"}
        
        context = result[0]
        cur.close()
        conn.close()

        print(f"🤖 Gemini is generating answer for Lecture {lecture_id}...")
        
        # UPDATED: Using gemini-flash-latest for consistent chat responses
        response = gemini_client.models.generate_content(
            model="gemini-flash-latest",
            contents=f"Context: {context}\n\nQuestion: {question}\n\nAnswer as a helpful study buddy:"
        )

        return {"answer": response.text}
    except Exception as e:
        print(f"❌ Chat Error: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)