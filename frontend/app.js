// 1. UPLOAD LOGIC (for index.html)
async function uploadAudio() {
    const fileInput = document.getElementById('audioFile');
    const status = document.getElementById('status');
    const btn = document.getElementById('uploadBtn');

    if (!fileInput.files[0]) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append('audio', fileInput.files[0]);

    btn.disabled = true;
    status.innerText = "🎙️ Transcribing... (This may take a minute)";

    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.id) {
            // Success! Redirect to chat page with the new Lecture ID
            window.location.href = `chat.html?id=${data.id}`;
        }
    } catch (err) {
        status.innerText = "❌ Error: " + err.message;
        btn.disabled = false;
    }
}

async function askQuestion() {
    const input = document.getElementById('questionInput');
    const chatWindow = document.getElementById('chatWindow');
    const lectureId = new URLSearchParams(window.location.search).get('id');

    chatWindow.innerHTML += `<p><strong>You:</strong> ${input.value}</p>`;

    const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input.value, lecture_id: lectureId })
    });
    
    const data = await response.json();

    // If the backend says it's not ready, tell the user to wait
    if (data.answer && data.answer.includes("haven't processed")) {
        chatWindow.innerHTML += `<p class="text-warning small">⏳ AI is still reading the transcript. Trying again in 5 seconds...</p>`;
        setTimeout(askQuestion, 5000); // Try again automatically
    } else {
        chatWindow.innerHTML += `<p class="text-primary"><strong>Buddy:</strong> ${data.answer}</p>`;
        input.value = "";
    }
}