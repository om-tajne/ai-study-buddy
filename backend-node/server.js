import 'dotenv/config'; // Automatically loads .env
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer({ dest: '../uploads/' });


// 1. Correct Pathing for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Define exactly where the frontend folder is
const frontendPath = path.join(__dirname, '../frontend');

// 3. Serve all files in the frontend folder (app.js, index.html, etc.)
app.use(express.static(frontendPath));

// 4. Specifically serve index.html for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});
// Set up the Database Pool using your .env variables
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(express.json());

app.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        const { originalname, path: filePath } = req.file;

        // 1. Save metadata to Postgres
        const dbRes = await pool.query(
            'INSERT INTO lectures (title) VALUES ($1) RETURNING id',
            [originalname]
        );
        const lectureId = dbRes.rows[0].id;

        // 2. Trigger Python AI via Import-style Axios
        // We use filePath here to match the variable from req.file
        axios.post('http://localhost:8000/process-lecture', {
            lecture_id: lectureId,
            file_path: filePath 
        }).catch(err => console.error("⚠️ Python trigger failed:", err.message));

        res.json({ 
            message: "Upload successful! AI is transcribing...", 
            id: lectureId 
        });

    } catch (err) {
        console.error("❌ Error during upload:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Test the connection immediately
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("❌ Database Connection Error:", err.stack);
    } else {
        console.log("✅ Database Connected Successfully at:", res.rows[0].now);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Node Server running on http://localhost:${PORT}`);
});