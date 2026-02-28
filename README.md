# 🎓 AI Study Buddy

An AI-powered learning assistant that transcribes audio lectures and allows students to have a context-aware chat with their study materials. Built with a hybrid **Node.js** and **FastAPI** architecture using **Google Gemini 1.5 Flash**.



## 🚀 Features
- **Audio Transcription:** Converts lecture recordings into text using Gemini's multimodal capabilities.
- **RAG Chat:** Retrieval-Augmented Generation allows you to ask questions specifically about your lecture content.
- **Smart Summarization:** Get quick "cheat sheets" of long history or science talks.
- **Hybrid Backend:** Uses Node.js for file management and FastAPI for heavy AI processing.

## 🛠️ Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Primary Backend:** Node.js & Express
- **AI Service:** Python & FastAPI
- **Database:** PostgreSQL (with `pgvector` for potential scaling)
- **AI Model:** Google Gemini 1.5 Flash

## ⚙️ Setup Instructions

### 1. Database Setup
Ensure PostgreSQL is running on port `5433` and create the database:
```sql
CREATE DATABASE study_buddy_db;