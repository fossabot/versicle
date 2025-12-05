// public/mock-tts-sw.js

const WPM = 150;
const BASE_MS_PER_WORD = (60 / WPM) * 1000;

let state = 'IDLE'; // IDLE, SPEAKING, PAUSED
let queue = []; // Array of { text, rate, client, id }
let currentItem = null;
let words = [];
let currentWordIndex = 0;
let timer = null;

self.addEventListener('install', (event) => {
    console.log('🗣️ [MockTTS] Service Worker Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('🗣️ [MockTTS] Service Worker Activated');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    const client = event.source;

    console.log(`🗣️ [MockTTS] Received ${type}`, payload || '');

    switch (type) {
        case 'SPEAK':
            handleSpeak(payload, client);
            break;
        case 'PAUSE':
            handlePause();
            break;
        case 'RESUME':
            handleResume();
            break;
        case 'CANCEL':
            handleCancel();
            break;
    }
});

async function handleSpeak(payload, client) {
    const { text, rate, id } = payload;
    // If client is null (e.g. from controller.postMessage in some envs), we might need to find it later
    const item = { text, rate: rate || 1, client, id };

    queue.push(item);

    if (state === 'IDLE') {
        processNext();
    }
}

function handlePause() {
    if (state === 'SPEAKING') {
        state = 'PAUSED';
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        console.log('🗣️ [MockTTS] Paused');
    }
}

function handleResume() {
    if (state === 'PAUSED') {
        console.log('🗣️ [MockTTS] Resuming');
        state = 'SPEAKING';
        scheduleNextWord();
    }
}

function handleCancel() {
    console.log('🗣️ [MockTTS] Canceling');
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    queue = [];
    currentItem = null;
    words = [];
    currentWordIndex = 0;
    state = 'IDLE';
}

function processNext() {
    if (queue.length === 0) {
        state = 'IDLE';
        return;
    }

    state = 'SPEAKING';
    currentItem = queue.shift();

    const text = currentItem.text;
    const tokens = text.match(/\S+/g) || [];

    // Map tokens to { word, index }
    words = [];
    let searchIndex = 0;
    for (const token of tokens) {
        const index = text.indexOf(token, searchIndex);
        words.push({ word: token, index });
        searchIndex = index + token.length;
    }

    currentWordIndex = 0;

    // Emit start
    notifyClient(currentItem.client, 'start', { id: currentItem.id });

    scheduleNextWord();
}

function scheduleNextWord() {
    if (currentWordIndex >= words.length) {
        // Finished current item
        notifyClient(currentItem.client, 'end', { id: currentItem.id });
        currentItem = null;
        processNext();
        return;
    }

    const wordObj = words[currentWordIndex];
    const delay = BASE_MS_PER_WORD / currentItem.rate;

    timer = setTimeout(() => {
        // Emit boundary
        // console.log(`%c 🗣️ [MockTTS]: "${wordObj.word}"`, 'color: #4ade80; font-weight: bold;');

        notifyClient(currentItem.client, 'boundary', {
            id: currentItem.id,
            charIndex: wordObj.index,
            charLength: wordObj.word.length,
            name: 'word',
            text: wordObj.word // Extra field for convenience
        });

        currentWordIndex++;
        scheduleNextWord();
    }, delay);
}

function notifyClient(client, type, data) {
    const msg = { type, ...data };
    if (client) {
        client.postMessage(msg);
    } else {
        // Broadcast to all clients if source client is missing
        self.clients.matchAll().then(clients => {
            for (const c of clients) {
                c.postMessage(msg);
            }
        });
    }
}
