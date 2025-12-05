document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURATION ---
    const ACTIVITY_URL = 'activities.json';
    const LIBRARY_URL = 'library.json';
    
    // Mapping our codes to Browser TTS codes
    const TTS_CODES = {
        'en': 'en-US',
        'it': 'it-IT',
        'de': 'de-DE',
        'es': 'es-ES',
        'ru': 'ru-RU'
    };

    // State
    let currentLang = 'en'; 
    let currentView = 'view-scripts'; 
    let availableVoices = []; // Store voices

    // --- 2. DOM ELEMENTS ---
    const scriptsContainer = document.getElementById('view-scripts');
    const activitiesContainer = document.getElementById('view-activities');
    const libraryContainer = document.getElementById('view-library');
    const notesContainer = document.getElementById('notes-container');
    const navButtons = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    const searchInput = document.getElementById('searchInput');
    const langSelect = document.getElementById('lang-switch');
    const toast = document.getElementById('toast');
    const noteForm = document.getElementById('add-note-form');
    const noteInput = document.getElementById('new-note-input');

    // --- 3. INIT ---
    function init() {
        setupNavigation();
        setupSearch();
        setupNotes();
        setupLanguageSwitch();
        
        // Pre-load voices for TTS
        if ('speechSynthesis' in window) {
            // Chrome loads voices asynchronously
            window.speechSynthesis.onvoiceschanged = () => {
                availableVoices = window.speechSynthesis.getVoices();
            };
            // Try getting them immediately just in case
            availableVoices = window.speechSynthesis.getVoices();
        }

        fetchScripts(currentLang);
        fetchActivities();
        fetchLibrary();
        loadUserNotes();
    }

    // --- 4. DATA FETCHING ---
    async function fetchScripts(lang) {
        const url = `content_${lang}.json`;
        scriptsContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#aaa;">Loading scripts...</p>';
        try {
            const res = await fetch(url);
            if(!res.ok) throw new Error(`File ${url} not found`);
            const data = await res.json();
            renderScripts(data.modules);
        } catch (error) {
            console.error('Script Error:', error);
            scriptsContainer.innerHTML = `<p style="color:var(--danger); text-align:center;">Error loading ${url}</p>`;
        }
    }

    async function fetchActivities() {
        try {
            const res = await fetch(ACTIVITY_URL);
            const data = await res.json();
            renderActivities(data);
        } catch (error) { console.error('Activity Error:', error); }
    }

    async function fetchLibrary() {
        try {
            const res = await fetch(LIBRARY_URL);
            const data = await res.json();
            renderLibrary(data.chapters);
        } catch (error) { console.error('Library Error:', error); }
    }

    // --- 5. RENDER LOGIC ---

    function renderScripts(modules) {
        scriptsContainer.innerHTML = ''; 
        modules.forEach(mod => {
            const modDiv = createAccordion(mod.title, mod.id);
            const content = modDiv.querySelector('.module-content');

            mod.categories.forEach(cat => {
                const catTitle = document.createElement('h4');
                catTitle.className = 'category-title';
                catTitle.innerText = cat.title;
                content.appendChild(catTitle);

                cat.phrases.forEach(phrase => {
                    // Pass currentLang to ensure correct voice
                    const card = createCard(phrase, true, currentLang); 
                    content.appendChild(card);
                });
            });
            scriptsContainer.appendChild(modDiv);
        });
    }

    function renderActivities(data) {
        activitiesContainer.innerHTML = '';
        if (!data.categories) return;

        data.categories.forEach(cat => {
            const catDiv = createAccordion(`${cat.icon || ''} ${cat.title} <small>(${cat.bpm_range || ''})</small>`);
            const content = catDiv.querySelector('.module-content');
            if (cat.description) content.innerHTML += `<p class="desc">${cat.description}</p>`;

            if (cat.sections) {
                cat.sections.forEach(section => {
                    const secTitle = document.createElement('h4');
                    secTitle.className = 'category-title';
                    secTitle.innerText = section.title;
                    content.appendChild(secTitle);

                    if (section.items) {
                        section.items.forEach(item => {
                            const card = document.createElement('div');
                            card.className = 'card';
                            
                            if (typeof item === 'string') {
                                card.innerHTML = `<span class="card-text">⚠️ ${item}</span>`;
                            } else if (section.type === 'playlist') {
                                card.innerHTML = `<div><strong>🎵 ${item.title}</strong></div><div style="font-size:0.8rem; color:#aaa;">${item.artist} - ${item.usage}</div>`;
                            } else if (section.type === 'routines') {
                                card.innerHTML = `<strong>${item.title}</strong><ul>${item.steps.map(s=>`<li>${s}</li>`).join('')}</ul>`;
                            } else {
                                card.innerHTML = `<div style="color:var(--primary)">${item.name}</div><div style="font-size:0.9rem">${item.description}</div><div style="font-size:0.8rem; color:#aaa">🗣️ ${item.cue}</div>`;
                            }
                            content.appendChild(card);
                        });
                    }
                });
            }
            activitiesContainer.appendChild(catDiv);
        });
    }

    function renderLibrary(chapters) {
        libraryContainer.innerHTML = '';
        chapters.forEach(chap => {
            const chapDiv = createAccordion(chap.title, chap.id);
            const content = chapDiv.querySelector('.module-content');

            if(chap.topics) {
                chap.topics.forEach(topic => {
                    const topicTitle = document.createElement('h4');
                    topicTitle.className = 'category-title';
                    topicTitle.innerText = topic.title;
                    content.appendChild(topicTitle);

                    if(topic.phrases) {
                        topic.phrases.forEach(pair => {
                            const card = document.createElement('div');
                            card.className = 'card phrase-card library-card';
                            
                            const textDiv = document.createElement('div');
                            textDiv.style.flex = '1';
                            textDiv.innerHTML = `<div class="lib-en">${pair.en}</div><div class="lib-ar">${pair.ar}</div>`;

                            const actionsDiv = document.createElement('div');
                            actionsDiv.className = 'action-buttons';

                            // Speak Button (Always EN for library)
                            const speakBtn = document.createElement('button');
                            speakBtn.className = 'icon-btn speak-btn';
                            speakBtn.innerHTML = '🔊';
                            speakBtn.onclick = (e) => { e.stopPropagation(); speakText(pair.en, 'en'); };

                            const copyBtn = document.createElement('button');
                            copyBtn.className = 'icon-btn copy-btn';
                            copyBtn.innerHTML = '📋';
                            copyBtn.onclick = (e) => { e.stopPropagation(); copyToClipboard(pair.en); };

                            actionsDiv.appendChild(speakBtn);
                            actionsDiv.appendChild(copyBtn);
                            card.appendChild(textDiv);
                            card.appendChild(actionsDiv);
                            content.appendChild(card);
                        });
                    }
                });
            }
            libraryContainer.appendChild(chapDiv);
        });
    }

    // --- 6. HELPER FUNCTIONS ---

    function createAccordion(titleHtml, id) {
        const div = document.createElement('div');
        div.className = 'module-container';
        if(id) div.id = id;
        div.innerHTML = `<div class="module-header"><span>${titleHtml}</span></div><div class="module-content"></div>`;
        div.querySelector('.module-header').onclick = () => div.classList.toggle('open');
        return div;
    }

    function createCard(text, withAudio = false, langCode = 'en') {
        const div = document.createElement('div');
        div.className = 'card phrase-card';
        div.innerHTML = `<span class="card-text">${text}</span>`;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'action-buttons';

        if (withAudio) {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'icon-btn speak-btn';
            speakBtn.innerHTML = '🔊';
            // Pass the correct language code to speakText
            speakBtn.onclick = (e) => { e.stopPropagation(); speakText(text, langCode); };
            actionsDiv.appendChild(speakBtn);
        }

        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.onclick = (e) => { e.stopPropagation(); copyToClipboard(text); };
        actionsDiv.appendChild(copyBtn);

        div.appendChild(actionsDiv);
        return div;
    }

    // --- THE FIXED SPEAK TEXT FUNCTION ---
    function speakText(text, lang) {
        window.speechSynthesis.cancel(); // Stop previous

        const utterance = new SpeechSynthesisUtterance(text);
        const targetLangCode = TTS_CODES[lang] || 'en-US';
        utterance.lang = targetLangCode;
        utterance.rate = 0.9;

        // Force Voice Selection
        if (availableVoices.length === 0) {
            availableVoices = window.speechSynthesis.getVoices();
        }

        // Try exact match (e.g., 'it-IT')
        let selectedVoice = availableVoices.find(v => v.lang === targetLangCode);
        
        // Fallback: Try language code match (e.g., 'it')
        if (!selectedVoice) {
            const shortCode = targetLangCode.split('-')[0];
            selectedVoice = availableVoices.find(v => v.lang.startsWith(shortCode));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log('Speaking with voice:', selectedVoice.name); // Debug
        } else {
            console.warn('No specific voice found for:', targetLangCode);
        }

        window.speechSynthesis.speak(utterance);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
    }

    function showToast(msg) {
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    }

    // --- 7. NAVIGATION & SEARCH ---
    function setupNavigation() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const targetId = btn.getAttribute('data-target');
                currentView = targetId; 
                
                views.forEach(v => {
                    v.classList.add('hidden');
                    v.classList.remove('active');
                    if(v.id === targetId) {
                        v.classList.remove('hidden');
                        v.classList.add('active');
                    }
                });
                
                searchInput.value = ''; 
                searchInput.placeholder = `Search ${btn.querySelector('.label').innerText}...`;
            });
        });
    }

    function setupSearch() {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const activeContainer = document.getElementById(currentView);
            const cards = activeContainer.querySelectorAll('.phrase-card, .activity-card');
            
            cards.forEach(card => {
                const text = card.innerText.toLowerCase();
                const parentModule = card.closest('.module-container');
                if (text.includes(query)) {
                    card.style.display = 'flex'; // or block
                    if(query.length > 1 && parentModule) parentModule.classList.add('open');
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    function setupLanguageSwitch() {
        langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            fetchScripts(currentLang);
        });
    }

    // --- 8. NOTES ---
    function setupNotes() {
        if(!noteForm) return;
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = noteInput.value.trim();
            if(text) { saveNote(text); noteInput.value = ''; }
        });
    }
    function loadUserNotes() {
        const notes = JSON.parse(localStorage.getItem('animationNotes')) || [];
        renderNotes(notes);
    }
    function saveNote(text) {
        const notes = JSON.parse(localStorage.getItem('animationNotes')) || [];
        notes.push(text);
        localStorage.setItem('animationNotes', JSON.stringify(notes));
        renderNotes(notes);
    }
    function renderNotes(notes) {
        notesContainer.innerHTML = '';
        notes.forEach((note, index) => {
            const card = createCard(note, true, 'en');
            const delBtn = document.createElement('span');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '🗑️';
            delBtn.onclick = () => deleteNote(index);
            card.querySelector('.action-buttons').appendChild(delBtn);
            notesContainer.appendChild(card);
        });
    }
    window.deleteNote = function(index) {
        let notes = JSON.parse(localStorage.getItem('animationNotes'));
        notes.splice(index, 1);
        localStorage.setItem('animationNotes', JSON.stringify(notes));
        renderNotes(notes);
    }

    init();
});
