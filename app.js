// ====== DYNAMIC ICON ENGINE ======
function getIcon(type) {
    if (!type) type = "File";
    let fileName = type.toString().replace(/ /g, '_').toLowerCase() + '.png';
    let size = type.toLowerCase().includes('folder') ? '24px' : '20px';
    return `<img src="icons/${fileName}" style="width:${size}; height:${size}; object-fit:contain; vertical-align:middle;" alt="${type}">`;
}
const ICON_GEAR = `⚙️`;

// ====== IMAGE UPLOAD HELPER ======
let tempUploadedImage = null;

async function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('image', file);
        
        fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.url) {
                resolve(data.url);
            } else {
                reject(new Error(data.error || 'Upload failed'));
            }
        })
        .catch(err => reject(err));
    });
}

function handleImageSelect(input, id, callback) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Maximum size is 5MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(id + '-preview');
            if (preview) {
                preview.style.backgroundImage = "url('" + e.target.result + "')";
                preview.innerHTML = '';
            }
        };
        reader.readAsDataURL(file);
        const formData = new FormData();
        formData.append('image', file);
        fetch('/api/upload/image', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.url) {
                    window[callback](data.url);
                }
            })
            .catch(err => console.error('Upload error:', err));
    }
}

function updateProfilePicUrl(url) {
    tempUploadedImage = url;
}

function updateCourseImageUrl(url) {
    tempUploadedImage = url;
} 

// ====== GOOGLE DRIVE (Simple Link Paste) ======
let selectedDriveFiles = [];

function openDrivePicker() {
    let url = prompt('Paste Google Drive share link:\n\nExample: https://drive.google.com/file/d/FILEID/view');
    if (!url) return;
    
    let fileId = extractDriveFileId(url);
    if (!fileId) {
        showToast('Invalid Google Drive link');
        return;
    }
    
    let fileName = prompt('Enter file name:') || 'Shared File';
    
    selectedDriveFiles.push({
        id: fileId,
        name: fileName,
        url: `https://drive.google.com/file/d/${fileId}/view`
    });
    
    renderDriveFilesList();
    showToast(`Added: ${fileName}`);
}

function extractDriveFileId(url) {
    let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return null;
}

function renderDriveFilesList() {
    const container = document.getElementById('driveFilesList');
    if (!container) return;
    
    if (selectedDriveFiles.length === 0) {
        container.innerHTML = '<div style="color:#888; font-size:12px;">No files attached from Google Drive</div>';
        return;
    }
    
    container.innerHTML = selectedDriveFiles.map((file, index) => `
        <div style="display:flex; align-items:center; gap:10px; padding:8px; background:#f0f7ff; border-radius:6px; margin-bottom:8px;">
            <span style="font-size:20px;">📄</span>
            <div style="flex:1; overflow:hidden;">
                <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
                <a href="${file.url}" target="_blank" style="font-size:11px; color:#6366f1;">View on Drive</a>
            </div>
            <button onclick="removeDriveFile(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px;">✕</button>
        </div>
    `).join('');
}

function removeDriveFile(index) {
    selectedDriveFiles.splice(index, 1);
    renderDriveFilesList();
}

function getDriveFilesForSubmission() {
    return selectedDriveFiles;
}

function clearDriveFiles() {
    selectedDriveFiles = [];
    selectedDriveFiles = [];
}

// ====== GOOGLE DRIVE TEMPLATE SYSTEM ======
let currentTemplateFile = null;

function openTemplatePicker() {
    let url = prompt('Paste a publicly shared Google Docs link:\n\n1. Open your Google Doc\n2. Share → "Anyone with link can VIEW"\n3. Paste that link here\n\nExample: https://docs.google.com/document/d/FILEID/view');
    if (!url) return;
    
    let fileId = extractDriveFileId(url);
    if (!fileId) {
        showToast('Invalid Google Docs link');
        return;
    }
    
    let fileName = prompt('Template name for students:', 'Assignment Template') || 'Assignment Template';
    
    currentTemplateFile = {
        id: fileId,
        name: fileName,
        url: `https://docs.google.com/document/d/${fileId}/view`
    };
    
    renderTemplateSelection();
    showToast(`Template set: ${fileName}`);
}

function renderTemplateSelection() {
    const container = document.getElementById('templateSelection');
    if (!container) return;
    
    if (!currentTemplateFile) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div style="padding:10px; background:#e8f5e9; border-radius:6px; margin-top:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px;">📋</span>
                <div style="flex:1;">
                    <div style="font-size:13px; font-weight:600;">Template: ${currentTemplateFile.name}</div>
                    <a href="${currentTemplateFile.url}" target="_blank" style="font-size:11px; color:#4285f4;">View template</a>
                </div>
                <button onclick="removeTemplate()" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px;">✕</button>
            </div>
            <div style="font-size:11px; color:#666; margin-top:5px;">Students will copy this template to their own Drive</div>
        </div>
    `;
}

function removeTemplate() {
    currentTemplateFile = null;
    renderTemplateSelection();
}

function useTemplate(assignId) {
    const item = db.materials.find(m => String(m.id) === String(assignId));
    if (!item || !item.template) {
        showToast('No template available for this assignment');
        return;
    }
    
    let submissionUrl = prompt("After making a copy of the template, paste your copy's link here:\n\nExample: https://docs.google.com/document/d/YOURFILEID/edit");
    
    if (!submissionUrl) return;
    
    let fileId = extractDriveFileId(submissionUrl);
    if (!fileId) {
        showToast('Invalid Google Docs link');
        return;
    }
    
    db.submissions = db.submissions.filter(s => !(String(s.assignId) === String(assignId) && String(s.user) === String(state.user)));
    db.submissions.push({
        assignId: String(assignId),
        user: String(state.user),
        templateFile: {
            id: fileId,
            name: 'My Work',
            url: `https://docs.google.com/document/d/${fileId}/edit`,
            viewUrl: `https://docs.google.com/document/d/${fileId}/view`
        },
        date: new Date().toLocaleDateString(),
        status: 'submitted'
    });
    
    save();
    showToast('Assignment submitted!');
    render();
}

// ====== FILE VIEWER ======
function openFileViewer(url, fileName) {
    let viewerUrl = url;
    let isPdf = url.toLowerCase().includes('.pdf') || url.includes('pdf');
    
    if (isPdf) {
        const modalContent = `
            <div id="fileViewerModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.9); z-index:99999; display:flex; flex-direction:column;">
                <div style="background:#1a1a2e; color:white; padding:12px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; font-size:16px;">${fileName || 'PDF Document'}</span>
                    <div>
                        <a href="${url}" target="_blank" style="color:white; margin-right:15px; text-decoration:none;">Open in New Tab ↗</a>
                        <button onclick="closeFileViewer()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer; padding:5px;">✕</button>
                    </div>
                </div>
                <div id="pdf-viewer" style="flex:1;"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        EmbedPDF.init({
            type: 'container',
            target: document.getElementById('pdf-viewer'),
            src: url,
            theme: { preference: 'system' }
        });
    } else {
        const modalContent = `
            <div id="fileViewerModal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; flex-direction:column;">
                <div style="background:#333; color:white; padding:10px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold;">${fileName || 'File Viewer'}</span>
                    <div>
                        <a href="${url}" target="_blank" style="color:white; margin-right:15px; text-decoration:none;">Open in New Tab ↗</a>
                        <button onclick="closeFileViewer()" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">✕</button>
                    </div>
                </div>
                <iframe src="${viewerUrl}" style="flex:1; border:none;"></iframe>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalContent);
    }
}

function closeFileViewer() {
    const viewer = document.getElementById('fileViewerModal');
    if (viewer) viewer.remove();
}

// ====== DATABASE (v27 - NEW FEATURES) ======
let savedData = localStorage.getItem('zentelle_db_v27'); 

const ALL_MATERIAL_TYPES = [
    "Blue Folder", "Red Folder", "Orange Folder", "Yellow Folder", "Pink Folder", 
    "Purple Folder", "Black Folder", "White Folder", 
    "Assignment", "Assessment", "Discussion", "Page", "PDF", "Link", "File", 
    "Media Album", "External Tools", "Web Content", "Video File", "Sound File", "Zip File"
];

let defaultMaterials = [
    { id: "101", courseId: "1", type: "Blue Folder", title: "Week 1", desc: "First week materials", parent: null, published: true },
    { id: "102", courseId: "1", type: "Red Folder", title: "Week 2", desc: "Second week materials", parent: null, published: true },
    { id: "103", courseId: "1", type: "Assignment", title: "Introduction Assignment", desc: "Introduce yourself and share your goals for this course.", parent: "101", published: true, points: 10, due: "2026-03-28", lockAfterDue: false },
    { id: "104", courseId: "1", type: "Page", title: "Course Syllabus", desc: "Welcome to the course! This page contains all the important information you need to know.", parent: null, published: true },
    { id: "105", courseId: "1", type: "Discussion", title: "Getting to Know You", desc: "Introduce yourself to your classmates!", parent: "101", published: true },
    { id: "106", courseId: "1", type: "Assignment", title: "Week 1 Quiz", desc: "Complete the quiz covering the first week materials.", parent: "101", published: true, points: 20, due: "2026-03-29", lockAfterDue: false },
    { id: "107", courseId: "1", type: "PDF", title: "Course Reading Material", desc: "Attached File: course_reading.pdf", parent: null, published: true },
    { id: "108", courseId: "1", type: "Link", title: "Helpful Resources", desc: "Useful links for the course: https://example.com", parent: null, published: true },
    { id: "109", courseId: "1", type: "Assignment", title: "Project Proposal", desc: "Submit your project proposal using the template provided.", parent: "102", published: true, points: 50, due: "2026-04-05", lockAfterDue: true },
    { id: "110", courseId: "1", type: "File", title: "Lecture Slides", desc: "Attached File: lecture_slides.pptx", parent: "102", published: true },
    { id: "111", courseId: "1", type: "Video File", title: "Introduction Video", desc: "Watch this introduction video before starting the course.", parent: null, published: true },
    { id: "112", courseId: "1", type: "Assessment", title: "Midterm Exam", desc: "This assessment covers all materials from weeks 1-6.", parent: null, published: true, points: 100, due: "2026-04-15", maxSubmissions: 1, questions: [], lockAfterDue: false },
    { id: "113", courseId: "1", type: "Media Album", title: "Student Gallery", desc: "A collection of student work and photos from class activities.", parent: null, published: true },
    { id: "114", courseId: "1", type: "External Tools", title: "Collaborative Whiteboard", desc: "Use this collaborative whiteboard for group work.", parent: "102", published: true },
    { id: "115", courseId: "1", type: "Web Content", title: "Interactive Tutorial", desc: "Complete the interactive tutorial on our learning platform.", parent: "101", published: true },
    { id: "116", courseId: "1", type: "Sound File", title: "Audio Lecture", desc: "Attached File: lecture_audio.mp3", parent: null, published: true },
    { id: "117", courseId: "1", type: "Zip File", title: "Course Resources Pack", desc: "Attached File: resources.zip", parent: null, published: true }
];

let db = savedData ? JSON.parse(savedData) : {
    schools: [{ 
        id: "1", 
        name: "Zentelle Academy",
        logo: "",
        primaryColor: "#6366f1",
        secondaryColor: "#ec4899",
        tagline: "Empowering Education",
        features: {
            messaging: true,
            calendar: true,
            announcements: true,
            progressTracking: true,
            classRankings: true,
            gpaCalculator: true,
            gradeChart: true,
            badges: true,
            darkMode: true
        }
    }],
    users: {
        "piercesn": { pass: "dt466e", role: "admin", name: "Pierce N.", schoolId: "1", picture: "" },
        "student": { pass: "password", role: "student", name: "John Doe", schoolId: "1", picture: "" },
        "teacher": { pass: "password", role: "teacher", name: "Jane Smith", schoolId: "1", picture: "" }
    },
    courses: [ { id: "1", name: "Zentelle Master Course", section: "Section 1", teacher: "piercesn", joinCode: "COURSE001", image: null } ],
    materials: defaultMaterials,
    enrollments: [ { user: "student", courseId: "1" } ],
    submissions: [], grades: [], updates: [], messages: [], notifications: [],
    gradeCategories: [], attendance: [], badges: [], mastery: [],
    todos: [],
    achievements: [],
    flashcards: [],
    flashcardDecks: [],
    studySessions: [],
    userXP: {},
    dailyStreaks: {},
    learningGoals: [],
    studyPartners: [],
    friendRequests: [],
    peerReviews: [],
    courseReviews: [],
    focusSessions: [],
    studyNotes: [],
    richAnnouncements: []
};

// ====== XP & LEVELING SYSTEM ======
const XP_CONFIG = {
    assignmentComplete: 50,
    quizComplete: 75,
    perfectScore: 150,
    discussionPost: 25,
    discussionReply: 15,
    courseComplete: 500,
    dailyLogin: 10,
    streakBonus: 5,
    flashcardReview: 5,
    studySession: 20,
    focusMinute: 2,
    goalAchieved: 100,
    peerHelp: 30
};

function getLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function getXPForLevel(level) {
    return Math.pow(level - 1, 2) * 100;
}

function getXPProgress(xp) {
    const currentLevel = getLevel(xp);
    const currentLevelXP = getXPForLevel(currentLevel);
    const nextLevelXP = getXPForLevel(currentLevel + 1);
    const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(100, Math.max(0, progress));
}

function awardXP(user, amount, reason) {
    if (!db.userXP[user]) {
        db.userXP[user] = { xp: 0, history: [] };
    }
    db.userXP[user].xp += amount;
    db.userXP[user].history.push({
        amount,
        reason,
        timestamp: Date.now()
    });
    save();
    return db.userXP[user].xp;
}

function getUserXP(user) {
    if (!db.userXP[user]) {
        db.userXP[user] = { xp: 0, history: [] };
    }
    return db.userXP[user];
}

function getLevelBadge(level) {
    if (level >= 50) return '🏆';
    if (level >= 40) return '💎';
    if (level >= 30) return '⭐';
    if (level >= 20) return '🌟';
    if (level >= 10) return '✨';
    if (level >= 5) return '💫';
    return '🔰';
}

function renderXPBar() {
    const userXP = getUserXP(state.user);
    const level = getLevel(userXP.xp);
    const progress = getXPProgress(userXP.xp);
    const badge = getLevelBadge(level);
    
    return `
        <div class="xp-widget" style="background: linear-gradient(135deg, #1e1e3f 0%, #2d2d5a 100%); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <span style="font-size: 32px;">${badge}</span>
                <div>
                    <div style="color: white; font-weight: 700; font-size: 18px;">Level ${level}</div>
                    <div style="color: rgba(255,255,255,0.7); font-size: 12px;">${userXP.xp.toLocaleString()} XP</div>
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #fbbf24, #f59e0b); height: 100%; width: ${progress}%; border-radius: 4px; transition: width 0.5s ease;"></div>
            </div>
            <div style="color: rgba(255,255,255,0.6); font-size: 11px; margin-top: 6px;">${Math.round(progress)}% to Level ${level + 1}</div>
        </div>
    `;
}

// ====== DAILY STREAKS ======
function getStreak(user) {
    if (!db.dailyStreaks[user]) {
        db.dailyStreaks[user] = { current: 0, best: 0, lastActive: null, history: [] };
    }
    return db.dailyStreaks[user];
}

function updateStreak(user) {
    const streak = getStreak(user);
    const today = new Date().toDateString();
    const lastActive = streak.lastActive ? new Date(streak.lastActive).toDateString() : null;
    
    if (lastActive === today) return streak.current;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActive === yesterday.toDateString()) {
        streak.current++;
        awardXP(user, XP_CONFIG.streakBonus, 'Daily streak bonus');
    } else if (lastActive !== today) {
        streak.current = 1;
    }
    
    streak.lastActive = today;
    if (streak.current > streak.best) streak.best = streak.current;
    
    streak.history.push({ date: today, streak: streak.current });
    if (streak.history.length > 365) streak.history = streak.history.slice(-365);
    
    save();
    return streak.current;
}

function renderStreakWidget() {
    const streak = getStreak(state.user);
    const flameColor = streak.current >= 7 ? '#ef4444' : streak.current >= 3 ? '#f59e0b' : '#94a3b8';
    
    return `
        <div class="streak-widget" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 8px;">🔥</div>
            <div style="color: white; font-size: 28px; font-weight: 800;">${streak.current}</div>
            <div style="color: rgba(255,255,255,0.7); font-size: 12px;">Day Streak</div>
            <div style="color: ${flameColor}; font-size: 11px; margin-top: 8px;">Best: ${streak.best} days</div>
        </div>
    `;
}

// ====== FLASHCARD SYSTEM ======
function initFlashcards() {
    if (!db.flashcards) db.flashcards = [];
    if (!db.flashcardDecks) db.flashcardDecks = [];
}

function createFlashcardDeck(name, courseId) {
    const deck = {
        id: Date.now().toString(),
        name,
        courseId,
        createdBy: state.user,
        createdAt: new Date().toISOString(),
        cardCount: 0,
        lastStudied: null,
        color: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)]
    };
    db.flashcardDecks.push(deck);
    save();
    showToast(`Deck "${name}" created!`);
    return deck;
}

function addFlashcard(deckId, front, back, tags = []) {
    const card = {
        id: Date.now().toString(),
        deckId,
        front,
        back,
        tags,
        createdBy: state.user,
        createdAt: new Date().toISOString(),
        easeFactor: 2.5,
        interval: 1,
        nextReview: new Date().toISOString(),
        reviewCount: 0
    };
    db.flashcards.push(card);
    
    const deck = db.flashcardDecks.find(d => d.id === deckId);
    if (deck) {
        deck.cardCount = db.flashcards.filter(c => c.deckId === deckId).length;
        deck.lastStudied = new Date().toISOString();
    }
    
    save();
    return card;
}

function getFlashcardsForDeck(deckId) {
    return db.flashcards.filter(c => c.deckId === deckId);
}

function getDueFlashcards(deckId) {
    const now = new Date();
    return db.flashcards.filter(c => 
        c.deckId === deckId && 
        new Date(c.nextReview) <= now
    );
}

function reviewFlashcard(cardId, quality) {
    const card = db.flashcards.find(c => c.id === cardId);
    if (!card) return;
    
    card.reviewCount++;
    card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    
    if (quality < 3) {
        card.interval = 1;
    } else {
        card.interval = Math.round(card.interval * card.easeFactor);
    }
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + card.interval);
    card.nextReview = nextDate.toISOString();
    
    awardXP(state.user, XP_CONFIG.flashcardReview, 'Flashcard review');
    save();
}

function renderFlashcardStudy(deckId) {
    const deck = db.flashcardDecks.find(d => d.id === deckId);
    const dueCards = getDueFlashcards(deckId);
    
    if (dueCards.length === 0) {
        return `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                <h3 style="color: var(--text-main);">All Caught Up!</h3>
                <p style="color: var(--text-muted);">No cards due for review. Come back later!</p>
                <button class="btn-zen primary" onclick="navigate('flashcards')" style="margin-top: 20px;">Back to Decks</button>
            </div>
        `;
    }
    
    const card = dueCards[0];
    const studyIndex = window.flashcardStudyIndex || 0;
    window.currentStudyCard = card;
    
    return `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: var(--text-main);">${deck?.name || 'Study'}</h3>
                <span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                    ${studyIndex + 1} / ${dueCards.length}
                </span>
            </div>
            
            <div id="flashcardContainer" style="perspective: 1000px; margin-bottom: 30px;">
                <div id="flashcard" onclick="flipFlashcard()" style="background: var(--bg-card); border-radius: 20px; padding: 40px; min-height: 250px; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: var(--shadow-lg); cursor: pointer; transition: transform 0.6s; transform-style: preserve-3d;">
                    <div id="flashcardFront" style="backface-visibility: hidden;">
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 20px;">FRONT</div>
                        <div style="font-size: 20px; color: var(--text-main); font-weight: 600;">${card.front}</div>
                    </div>
                    <div id="flashcardBack" style="backface-visibility: hidden; transform: rotateY(180deg); position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 40px; display: flex; flex-direction: column; justify-content: center;">
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 20px;">BACK</div>
                        <div style="font-size: 20px; color: var(--text-main); font-weight: 600;">${card.back}</div>
                    </div>
                </div>
            </div>
            
            <p style="text-align: center; color: var(--text-muted); font-size: 13px;">Click card to flip</p>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px;">
                <button onclick="rateFlashcard(${card.id}, 1)" style="padding: 12px; border: none; border-radius: 10px; background: #fee2e2; color: #991b1b; font-weight: 600; cursor: pointer;">Again<br><span style="font-size: 10px;">&lt;1m</span></button>
                <button onclick="rateFlashcard(${card.id}, 2)" style="padding: 12px; border: none; border-radius: 10px; background: #fef3c7; color: #92400e; font-weight: 600; cursor: pointer;">Hard<br><span style="font-size: 10px;">~1d</span></button>
                <button onclick="rateFlashcard(${card.id}, 3)" style="padding: 12px; border: none; border-radius: 10px; background: #dbeafe; color: #1e40af; font-weight: 600; cursor: pointer;">Good<br><span style="font-size: 10px;">~3d</span></button>
                <button onclick="rateFlashcard(${card.id}, 5)" style="padding: 12px; border: none; border-radius: 10px; background: #d1fae5; color: #065f46; font-weight: 600; cursor: pointer;">Easy<br><span style="font-size: 10px;">~7d</span></button>
            </div>
        </div>
    `;
}

function flipFlashcard() {
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.style.transform = flashcard.style.transform === 'rotateY(180deg)' ? 'rotateY(0)' : 'rotateY(180deg)';
    }
}

function rateFlashcard(cardId, quality) {
    reviewFlashcard(cardId, quality);
    const deckId = db.flashcards.find(c => c.id === cardId)?.deckId;
    
    const currentIndex = window.flashcardStudyIndex || 0;
    const dueCards = getDueFlashcards(deckId);
    
    if (currentIndex < dueCards.length - 1) {
        window.flashcardStudyIndex = currentIndex + 1;
        const container = document.querySelector('.materials-wrapper');
        if (container) {
            container.innerHTML = renderFlashcardStudy(deckId);
        }
    } else {
        showToast('Deck completed! Great job!');
        awardXP(state.user, 25, 'Completed flashcard deck');
        navigate('flashcards');
    }
}

function renderFlashcardsPage() {
    initFlashcards();
    const myDecks = db.flashcardDecks.filter(d => 
        d.createdBy === state.user || 
        db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(d.courseId))
    );
    
    const decksHtml = myDecks.length === 0 ? `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <div style="font-size: 64px; margin-bottom: 20px;">📚</div>
            <h3>No Flashcard Decks Yet</h3>
            <p>Create your first deck to start studying!</p>
        </div>
    ` : myDecks.map(deck => {
        const dueCount = getDueFlashcards(deck.id).length;
        const course = db.courses.find(c => c.id === deck.courseId);
        return `
            <div style="background: var(--bg-card); border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow); border-left: 4px solid ${deck.color}; transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: var(--text-main);">${deck.name}</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-muted);">${course?.name || 'No course'} • ${deck.cardCount} cards</p>
                    </div>
                    <div style="text-align: right;">
                        ${dueCount > 0 ? `<span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${dueCount} due</span>` : '<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">✓ Done</span>'}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-zen primary" onclick="navigate('flashcardStudy', '${deck.id}')" style="flex: 1;">Study</button>
                    <button class="btn-zen" onclick="openModal('addCard', '${deck.id}')" style="flex: 1;">+ Add Card</button>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="col-main">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0;">📚 Flashcards</h2>
                <button class="btn-zen primary" onclick="openModal('createDeck')">+ Create Deck</button>
            </div>
            ${decksHtml}
        </div>
    `;
}

function openCreateDeckModal() {
    const courses = db.courses.filter(c => 
        c.teacher === state.user || 
        db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(c.id))
    );
    
    const courseOptions = courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    return `
        <h3>Create Flashcard Deck</h3>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Deck Name</label>
            <input type="text" id="newDeckName" placeholder="e.g., Biology Chapter 5">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Course (optional)</label>
            <select id="newDeckCourse" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 10px;">
                <option value="">No specific course</option>
                ${courseOptions}
            </select>
        </div>
        <div class="modal-buttons">
            <button class="btn-zen" onclick="closeModal()">Cancel</button>
            <button class="btn-zen primary" onclick="submitCreateDeck()">Create</button>
        </div>
    `;
}

function submitCreateDeck() {
    const name = document.getElementById('newDeckName').value.trim();
    const courseId = document.getElementById('newDeckCourse').value;
    
    if (!name) {
        showToast('Please enter a deck name');
        return;
    }
    
    createFlashcardDeck(name, courseId || null);
    closeModal();
    state.page = 'flashcards';
    render();
}

// ====== STUDY TIMER (POMODORO) ======
let pomodoroState = {
    isRunning: false,
    isPaused: false,
    timeLeft: 25 * 60,
    mode: 'focus',
    sessionsCompleted: 0,
    interval: null
};

function startPomodoro(minutes = 25) {
    if (pomodoroState.interval) clearInterval(pomodoroState.interval);
    
    pomodoroState.isRunning = true;
    pomodoroState.isPaused = false;
    pomodoroState.timeLeft = minutes * 60;
    
    pomodoroState.interval = setInterval(() => {
        if (pomodoroState.timeLeft > 0 && pomodoroState.isRunning && !pomodoroState.isPaused) {
            pomodoroState.timeLeft--;
            updatePomodoroDisplay();
            
            if (pomodoroState.mode === 'focus' && pomodoroState.timeLeft % 60 === 0) {
                awardXP(state.user, XP_CONFIG.focusMinute, 'Focus minute');
            }
        } else if (pomodoroState.timeLeft <= 0) {
            completePomodoroSession();
        }
    }, 1000);
    
    render();
}

function pausePomodoro() {
    pomodoroState.isPaused = !pomodoroState.isPaused;
    render();
}

function stopPomodoro() {
    if (pomodoroState.interval) clearInterval(pomodoroState.interval);
    pomodoroState = {
        isRunning: false,
        isPaused: false,
        timeLeft: 25 * 60,
        mode: 'focus',
        sessionsCompleted: 0,
        interval: null
    };
    render();
}

function completePomodoroSession() {
    if (pomodoroState.interval) clearInterval(pomodoroState.interval);
    
    pomodoroState.sessionsCompleted++;
    awardXP(state.user, XP_CONFIG.studySession, 'Completed study session');
    
    if (pomodoroState.mode === 'focus') {
        showToast('Focus session complete! Take a break 🌟');
        pomodoroState.mode = 'break';
        pomodoroState.timeLeft = 5 * 60;
    } else {
        showToast('Break over! Ready for another focus session?');
        pomodoroState.mode = 'focus';
        pomodoroState.timeLeft = 25 * 60;
    }
    
    pomodoroState.isRunning = false;
    db.focusSessions.push({
        id: Date.now().toString(),
        user: state.user,
        mode: pomodoroState.mode === 'break' ? 'focus' : 'break',
        duration: pomodoroState.mode === 'break' ? 25 : 5,
        completedAt: new Date().toISOString()
    });
    save();
    render();
}

function updatePomodoroDisplay() {
    const display = document.getElementById('pomodoroTime');
    if (display) {
        const mins = Math.floor(pomodoroState.timeLeft / 60);
        const secs = pomodoroState.timeLeft % 60;
        display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function renderPomodoroWidget() {
    const mins = Math.floor(pomodoroState.timeLeft / 60);
    const secs = pomodoroState.timeLeft % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const isFocus = pomodoroState.mode === 'focus';
    
    return `
        <div style="background: linear-gradient(135deg, ${isFocus ? '#6366f1' : '#10b981'} 0%, ${isFocus ? '#8b5cf6' : '#059669'} 100%); border-radius: 16px; padding: 24px; margin-bottom: 20px; text-align: center; color: white;">
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 2px;">
                ${isFocus ? '🎯 Focus Time' : '☕ Break Time'}
            </div>
            <div id="pomodoroTime" style="font-size: 56px; font-weight: 800; font-family: 'Courier New', monospace; margin-bottom: 16px;">
                ${timeStr}
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                ${!pomodoroState.isRunning ? `
                    <button onclick="startPomodoro(25)" style="background: white; color: ${isFocus ? '#6366f1' : '#10b981'}; border: none; padding: 10px 20px; border-radius: 25px; font-weight: 700; cursor: pointer;">Start 25min</button>
                    <button onclick="startPomodoro(50)" style="background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 8px 16px; border-radius: 25px; font-weight: 600; cursor: pointer;">50min</button>
                ` : `
                    <button onclick="pausePomodoro()" style="background: white; color: ${isFocus ? '#6366f1' : '#10b981'}; border: none; padding: 10px 24px; border-radius: 25px; font-weight: 700; cursor: pointer;">
                        ${pomodoroState.isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button onclick="stopPomodoro()" style="background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 8px 16px; border-radius: 25px; font-weight: 600; cursor: pointer;">Stop</button>
                `}
            </div>
            <div style="margin-top: 16px; font-size: 12px; opacity: 0.8;">
                Sessions today: ${pomodoroState.sessionsCompleted}
            </div>
        </div>
    `;
}

// ====== STUDY NOTES ======
function createStudyNote(title, content, courseId) {
    const note = {
        id: Date.now().toString(),
        title,
        content,
        courseId,
        createdBy: state.user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        isPinned: false
    };
    db.studyNotes.push(note);
    save();
    return note;
}

function updateStudyNote(noteId, title, content, tags) {
    const note = db.studyNotes.find(n => n.id === noteId);
    if (note) {
        note.title = title;
        note.content = content;
        note.tags = tags || [];
        note.updatedAt = new Date().toISOString();
        save();
    }
}

function deleteStudyNote(noteId) {
    db.studyNotes = db.studyNotes.filter(n => n.id !== noteId);
    save();
}

function getStudyNotes() {
    return db.studyNotes.filter(n => n.createdBy === state.user);
}

function renderStudyNotesPage() {
    const notes = getStudyNotes();
    const pinnedNotes = notes.filter(n => n.isPinned);
    const otherNotes = notes.filter(n => !n.isPinned);
    
    const renderNoteCard = (note) => {
        const course = db.courses.find(c => c.id === note.courseId);
        return `
            <div style="background: var(--bg-card); border-radius: 12px; padding: 20px; margin-bottom: 12px; box-shadow: var(--shadow); cursor: pointer; transition: all 0.3s ease;" onclick="openNoteEditor('${note.id}')">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: var(--text-main);">${note.isPinned ? '📌 ' : ''}${note.title}</h4>
                    <button onclick="event.stopPropagation(); toggleNotePin('${note.id}')" style="background: none; border: none; cursor: pointer; font-size: 14px;">${note.isPinned ? '📍' : '📌'}</button>
                </div>
                <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${note.tags.map(t => `<span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${t}</span>`).join('')}
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted);">${new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    };
    
    return `
        <div class="col-main">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0;">📝 Study Notes</h2>
                <button class="btn-zen primary" onclick="openNoteEditor(null)">+ New Note</button>
            </div>
            
            ${pinnedNotes.length > 0 ? `
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--text-muted); margin-bottom: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Pinned</h4>
                    ${pinnedNotes.map(renderNoteCard).join('')}
                </div>
            ` : ''}
            
            <div>
                ${otherNotes.length > 0 ? otherNotes.map(renderNoteCard).join('') : `
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                        <div style="font-size: 64px; margin-bottom: 20px;">📝</div>
                        <h3>No Notes Yet</h3>
                        <p>Start taking notes to organize your studies!</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

function openNoteEditor(noteId) {
    const note = noteId ? db.studyNotes.find(n => n.id === noteId) : null;
    const courses = db.courses.filter(c => 
        c.teacher === state.user || 
        db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(c.id))
    );
    
    state.editingNote = noteId;
    
    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width: 700px; max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation()">
                <h3>${note ? 'Edit Note' : 'New Study Note'}</h3>
                <div style="margin-bottom: 16px;">
                    <input type="text" id="noteTitle" placeholder="Note title..." value="${note?.title || ''}" style="width: 100%; padding: 14px; border: 2px solid var(--border); border-radius: 10px; font-size: 16px; font-weight: 600;">
                </div>
                <div style="margin-bottom: 16px;">
                    <select id="noteCourse" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 10px;">
                        <option value="">No course</option>
                        ${courses.map(c => `<option value="${c.id}" ${note?.courseId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <textarea id="noteContent" placeholder="Start writing your notes..." style="width: 100%; height: 300px; padding: 14px; border: 2px solid var(--border); border-radius: 10px; resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.6;">${note?.content || ''}</textarea>
                </div>
                <div style="margin-bottom: 16px;">
                    <input type="text" id="noteTags" placeholder="Tags (comma separated)" value="${note?.tags?.join(', ') || ''}" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 10px;">
                </div>
                <div class="modal-buttons" style="display: flex; justify-content: space-between;">
                    <div>
                        ${note ? `<button class="btn-zen" onclick="deleteStudyNote('${note.id}'); closeModal();" style="color: var(--danger);">Delete</button>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-zen" onclick="closeModal()">Cancel</button>
                        <button class="btn-zen primary" onclick="saveNoteFromEditor()">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

function saveNoteFromEditor() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const courseId = document.getElementById('noteCourse').value || null;
    const tagsStr = document.getElementById('noteTags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
    
    if (!title) {
        showToast('Please enter a title');
        return;
    }
    
    if (state.editingNote) {
        updateStudyNote(state.editingNote, title, content, tags);
    } else {
        createStudyNote(title, content, courseId);
    }
    
    closeModal();
    state.page = 'studyNotes';
    render();
}

function toggleNotePin(noteId) {
    const note = db.studyNotes.find(n => n.id === noteId);
    if (note) {
        note.isPinned = !note.isPinned;
        save();
        render();
    }
}

// ====== LEARNING GOALS ======
function createLearningGoal(title, targetDate, targetXP) {
    const goal = {
        id: Date.now().toString(),
        title,
        targetDate,
        targetXP,
        currentXP: 0,
        createdBy: state.user,
        createdAt: new Date().toISOString(),
        completed: false,
        completedAt: null
    };
    db.learningGoals.push(goal);
    save();
    return goal;
}

function getLearningGoals() {
    return db.learningGoals.filter(g => g.createdBy === state.user && !g.completed);
}

function updateGoalProgress(goalId) {
    const goal = db.learningGoals.find(g => g.id === goalId);
    const userXP = getUserXP(state.user);
    
    if (goal) {
        goal.currentXP = userXP.xp;
        
        if (goal.currentXP >= goal.targetXP && !goal.completed) {
            goal.completed = true;
            goal.completedAt = new Date().toISOString();
            awardXP(state.user, XP_CONFIG.goalAchieved, 'Learning goal completed!');
            showToast('🎉 Goal achieved! Amazing work!');
        }
        
        save();
    }
}

function renderLearningGoalsPage() {
    const goals = getLearningGoals();
    const completedGoals = db.learningGoals.filter(g => g.createdBy === state.user && g.completed);
    const userXP = getUserXP(state.user);
    
    const goalsHtml = goals.length === 0 ? `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <div style="font-size: 64px; margin-bottom: 20px;">🎯</div>
            <h3>No Active Goals</h3>
            <p>Set a goal to track your learning progress!</p>
        </div>
    ` : goals.map(goal => {
        const progress = Math.min(100, (userXP.xp / goal.targetXP) * 100);
        const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
        
        return `
            <div style="background: var(--bg-card); border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: var(--text-main);">${goal.title}</h4>
                    <button onclick="deleteGoal('${goal.id}')" style="background: none; border: none; color: var(--danger); cursor: pointer;">✕</button>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">
                        <span>${userXP.xp.toLocaleString()} / ${goal.targetXP.toLocaleString()} XP</span>
                        <span>${Math.round(progress)}%</span>
                    </div>
                    <div style="background: var(--border); height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, var(--primary), var(--accent)); height: 100%; width: ${progress}%; border-radius: 5px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
                <div style="font-size: 12px; color: ${daysLeft < 7 ? 'var(--warning)' : 'var(--text-muted)'};">
                    ${daysLeft > 0 ? `${daysLeft} days left • Due ${new Date(goal.targetDate).toLocaleDateString()}` : 'Deadline passed!'}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="col-main">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0;">🎯 Learning Goals</h2>
                <button class="btn-zen primary" onclick="openModal('createGoal')">+ Set Goal</button>
            </div>
            
            ${goalsHtml}
            
            ${completedGoals.length > 0 ? `
                <h4 style="color: var(--text-muted); margin: 30px 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Completed</h4>
                ${completedGoals.map(g => `
                    <div style="background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 2px solid var(--success); opacity: 0.8;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">✅</span>
                            <div>
                                <div style="font-weight: 600; color: var(--text-main);">${g.title}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">Completed ${new Date(g.completedAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            ` : ''}
        </div>
    `;
}

function openCreateGoalModal() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return `
        <h3>Set Learning Goal</h3>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Goal Title</label>
            <input type="text" id="goalTitle" placeholder="e.g., Reach Level 10 by summer">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Target XP</label>
            <input type="number" id="goalXP" placeholder="e.g., 5000" min="100" step="100">
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Target Date</label>
            <input type="date" id="goalDate" value="${nextWeek.toISOString().split('T')[0]}">
        </div>
        <div class="modal-buttons">
            <button class="btn-zen" onclick="closeModal()">Cancel</button>
            <button class="btn-zen primary" onclick="submitCreateGoal()">Set Goal</button>
        </div>
    `;
}

function submitCreateGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const targetXP = parseInt(document.getElementById('goalXP').value);
    const targetDate = document.getElementById('goalDate').value;
    
    if (!title || !targetXP || !targetDate) {
        showToast('Please fill in all fields');
        return;
    }
    
    createLearningGoal(title, targetDate, targetXP);
    closeModal();
    state.page = 'learningGoals';
    render();
}

function deleteGoal(goalId) {
    if (confirm('Delete this goal?')) {
        db.learningGoals = db.learningGoals.filter(g => g.id !== goalId);
        save();
        render();
    }
}

// ====== STUDY PARTNERS & FRIENDS ======
function sendFriendRequest(username) {
    if (!db.users[username]) {
        showToast('User not found');
        return;
    }
    if (username === state.user) {
        showToast('You cannot add yourself');
        return;
    }
    
    const existing = db.studyPartners.some(p => 
        (p.user1 === state.user && p.user2 === username) ||
        (p.user1 === username && p.user2 === state.user)
    );
    
    if (existing) {
        showToast('Already friends or request pending');
        return;
    }
    
    db.friendRequests.push({
        id: Date.now().toString(),
        from: state.user,
        to: username,
        createdAt: new Date().toISOString(),
        status: 'pending'
    });
    
    save();
    showToast(`Friend request sent to ${db.users[username]?.name || username}!`);
}

function acceptFriendRequest(requestId) {
    const request = db.friendRequests.find(r => r.id === requestId);
    if (!request || request.to !== state.user) return;
    
    request.status = 'accepted';
    
    db.studyPartners.push({
        id: Date.now().toString(),
        user1: request.from,
        user2: request.to,
        createdAt: new Date().toISOString()
    });
    
    save();
    showToast('Friend added!');
    render();
}

function declineFriendRequest(requestId) {
    db.friendRequests = db.friendRequests.filter(r => r.id !== requestId);
    save();
    render();
}

function getFriends() {
    return db.studyPartners.filter(p => p.user1 === state.user || p.user2 === state.user);
}

function getPendingRequests() {
    return db.friendRequests.filter(r => r.to === state.user && r.status === 'pending');
}

function renderStudyPartnersPage() {
    const friends = getFriends();
    const pending = getPendingRequests();
    const sentRequests = db.friendRequests.filter(r => r.from === state.user && r.status === 'pending');
    
    const friendsHtml = friends.length === 0 ? `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
            <p>No study partners yet. Add friends to study together!</p>
        </div>
    ` : friends.map(f => {
        const friend = db.users[f.user1 === state.user ? f.user2 : f.user1];
        const friendXP = getUserXP(f.user1 === state.user ? f.user2 : f.user1);
        return `
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-hover); border-radius: 12px; margin-bottom: 12px;">
                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px;">
                    ${(friend?.name || 'U').charAt(0)}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-main);">${friend?.name || 'Unknown'}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Level ${getLevel(friendXP.xp)} • ${friendXP.xp.toLocaleString()} XP</div>
                </div>
                <button class="btn-zen" onclick="startStudySession('${f.user1 === state.user ? f.user2 : f.user1}')" style="padding: 8px 16px; font-size: 12px;">Study Together</button>
            </div>
        `;
    }).join('');
    
    const pendingHtml = pending.length > 0 ? `
        <div class="post-box" style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 16px 0;">Incoming Requests</h4>
            ${pending.map(r => {
                const fromUser = db.users[r.from];
                return `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-hover); border-radius: 10px; margin-bottom: 8px;">
                        <div style="width: 36px; height: 36px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                            ${(fromUser?.name || 'U').charAt(0)}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600;">${fromUser?.name || r.from}</div>
                        </div>
                        <button class="btn-zen primary" onclick="acceptFriendRequest('${r.id}')" style="padding: 6px 14px; font-size: 12px;">Accept</button>
                        <button class="btn-zen" onclick="declineFriendRequest('${r.id}')" style="padding: 6px 14px; font-size: 12px; color: var(--danger);">Decline</button>
                    </div>
                `;
            }).join('')}
        </div>
    ` : '';
    
    return `
        <div class="col-main">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0;">👥 Study Partners</h2>
                <button class="btn-zen primary" onclick="openModal('addFriend')">+ Add Friend</button>
            </div>
            
            ${pendingHtml}
            
            <div class="post-box">
                <h4 style="margin: 0 0 16px 0;">My Study Partners</h4>
                ${friendsHtml}
            </div>
        </div>
    `;
}

function openAddFriendModal() {
    const otherUsers = Object.keys(db.users).filter(u => 
        u !== state.user && 
        !db.studyPartners.some(p => (p.user1 === state.user && p.user2 === u) || (p.user1 === u && p.user2 === state.user)) &&
        !db.friendRequests.some(r => r.from === state.user && r.to === u && r.status === 'pending')
    );
    
    return `
        <h3>Add Study Partner</h3>
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Username</label>
            <input type="text" id="friendUsername" placeholder="Enter username" list="userList">
            <datalist id="userList">
                ${otherUsers.map(u => `<option value="${u}">${db.users[u]?.name || u}</option>`).join('')}
            </datalist>
        </div>
        <div class="modal-buttons">
            <button class="btn-zen" onclick="closeModal()">Cancel</button>
            <button class="btn-zen primary" onclick="submitAddFriend()">Send Request</button>
        </div>
    `;
}

function submitAddFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    if (!username) {
        showToast('Please enter a username');
        return;
    }
    sendFriendRequest(username);
    closeModal();
    state.page = 'studyPartners';
    render();
}

function startStudySession(partnerId) {
    showToast(`Starting study session with ${db.users[partnerId]?.name || partnerId}! (Coming soon)`);
}

// ====== PEER REVIEW SYSTEM ======
function createPeerReview(assignmentId, revieweeId) {
    const review = {
        id: Date.now().toString(),
        assignmentId,
        reviewer: state.user,
        reviewee: revieweeId,
        createdAt: new Date().toISOString(),
        feedback: '',
        rating: 0,
        completed: false
    };
    db.peerReviews.push(review);
    save();
    return review;
}

function submitPeerReview(reviewId, feedback, rating) {
    const review = db.peerReviews.find(r => r.id === reviewId);
    if (review) {
        review.feedback = feedback;
        review.rating = rating;
        review.completed = true;
        review.completedAt = new Date().toISOString();
        awardXP(state.user, XP_CONFIG.peerHelp, 'Peer review completed');
        save();
    }
}

function getPeerReviewsForAssignment(assignmentId) {
    return db.peerReviews.filter(r => 
        r.assignmentId === assignmentId && 
        r.completed
    );
}

function renderPeerReviewsPage() {
    const pendingReviews = db.peerReviews.filter(r => 
        r.reviewer === state.user && 
        !r.completed
    );
    
    const completedReviews = db.peerReviews.filter(r => 
        r.reviewer === state.user && 
        r.completed
    );
    
    return `
        <div class="col-main">
            <h2 style="margin: 0 0 24px 0;">🔍 Peer Reviews</h2>
            
            ${pendingReviews.length > 0 ? `
                <div class="post-box" style="margin-bottom: 24px; border-left: 4px solid var(--warning);">
                    <h4 style="margin: 0 0 16px 0; color: var(--warning);">Pending Reviews</h4>
                    ${pendingReviews.map(r => {
                        const assignment = db.materials.find(m => m.id === r.assignmentId);
                        const reviewee = db.users[r.reviewee];
                        return `
                            <div style="padding: 16px; background: var(--bg-hover); border-radius: 10px; margin-bottom: 12px;">
                                <div style="font-weight: 600; margin-bottom: 8px;">${assignment?.title || 'Assignment'}</div>
                                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
                                    Review for: ${reviewee?.name || r.reviewee}
                                </div>
                                <button class="btn-zen primary" onclick="openPeerReviewForm('${r.id}')" style="padding: 8px 16px; font-size: 13px;">Write Review</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div class="post-box" style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                    <p>No pending peer reviews!</p>
                </div>
            `}
            
            ${completedReviews.length > 0 ? `
                <h4 style="margin: 24px 0 16px 0;">My Completed Reviews</h4>
                ${completedReviews.slice(0, 5).map(r => {
                    const assignment = db.materials.find(m => m.id === r.assignmentId);
                    return `
                        <div style="padding: 16px; background: var(--bg-card); border-radius: 10px; margin-bottom: 12px; box-shadow: var(--shadow);">
                            <div style="font-weight: 600;">${assignment?.title || 'Assignment'}</div>
                            <div style="display: flex; gap: 4px; margin-top: 8px;">
                                ${Array(5).fill(0).map((_, i) => `<span style="color: ${i < r.rating ? '#fbbf24' : '#e2e8f0'};">★</span>`).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            ` : ''}
        </div>
    `;
}

function openPeerReviewForm(reviewId) {
    state.editingReview = reviewId;
    
    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>Write Peer Review</h3>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Rating</label>
                    <div style="display: flex; gap: 8px;">
                        ${[1,2,3,4,5].map(n => `
                            <button onclick="setReviewRating(${n})" id="starBtn${n}" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #e2e8f0; transition: color 0.2s;">★</button>
                        `).join('')}
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Feedback</label>
                    <textarea id="reviewFeedback" placeholder="Provide constructive feedback..." style="width: 100%; height: 150px; padding: 14px; border: 2px solid var(--border); border-radius: 10px; resize: vertical;"></textarea>
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Cancel</button>
                    <button class="btn-zen primary" onclick="submitPeerReviewFromForm()">Submit Review</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

function setReviewRating(rating) {
    state.reviewRating = rating;
    for (let i = 1; i <= 5; i++) {
        const btn = document.getElementById(`starBtn${i}`);
        if (btn) {
            btn.style.color = i <= rating ? '#fbbf24' : '#e2e8f0';
        }
    }
}

function submitPeerReviewFromForm() {
    const feedback = document.getElementById('reviewFeedback').value.trim();
    const rating = state.reviewRating || 0;
    
    if (!feedback || rating === 0) {
        showToast('Please provide a rating and feedback');
        return;
    }
    
    submitPeerReview(state.editingReview, feedback, rating);
    closeModal();
    state.page = 'peerReviews';
    render();
}

// ====== COURSE RATINGS & REVIEWS ======
function submitCourseReview(courseId, rating, review) {
    const existing = db.courseReviews.find(r => 
        r.courseId === courseId && r.user === state.user
    );
    
    if (existing) {
        existing.rating = rating;
        existing.review = review;
        existing.updatedAt = new Date().toISOString();
    } else {
        db.courseReviews.push({
            id: Date.now().toString(),
            courseId,
            user: state.user,
            rating,
            review,
            createdAt: new Date().toISOString()
        });
    }
    
    save();
    showToast('Review submitted!');
}

function getCourseRating(courseId) {
    const reviews = db.courseReviews.filter(r => r.courseId === courseId);
    if (reviews.length === 0) return { avg: 0, count: 0 };
    
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { avg: Math.round(avg * 10) / 10, count: reviews.length };
}

function renderCourseReviewWidget(courseId) {
    const { avg, count } = getCourseRating(courseId);
    const course = db.courses.find(c => c.id === courseId);
    const userReview = db.courseReviews.find(r => 
        r.courseId === courseId && r.user === state.user
    );
    
    return `
        <div class="post-box" style="margin-top: 20px;">
            <h4 style="margin: 0 0 16px 0;">⭐ Course Rating</h4>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <div style="font-size: 32px; font-weight: 800; color: var(--primary);">${avg > 0 ? avg.toFixed(1) : 'N/A'}</div>
                <div>
                    <div style="display: flex; gap: 2px;">
                        ${[1,2,3,4,5].map(n => `<span style="color: ${n <= Math.round(avg) ? '#fbbf24' : '#e2e8f0'};">★</span>`).join('')}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted);">${count} review${count !== 1 ? 's' : ''}</div>
                </div>
            </div>
            ${!userReview ? `
                <button class="btn-zen primary" onclick="openCourseReviewForm('${courseId}')" style="width: 100%;">Write a Review</button>
            ` : `
                <div style="padding: 12px; background: var(--bg-hover); border-radius: 10px; font-size: 13px; color: var(--text-secondary);">
                    Your review: "${userReview.review}"
                </div>
            `}
        </div>
    `;
}

function openCourseReviewForm(courseId) {
    state.reviewingCourse = courseId;
    state.reviewRating = 0;
    
    const modal = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>Review This Course</h3>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 13px;">Your Rating</label>
                    <div style="display: flex; gap: 8px;">
                        ${[1,2,3,4,5].map(n => `
                            <button onclick="setReviewRating(${n})" id="starBtn${n}" style="background: none; border: none; font-size: 32px; cursor: pointer; color: #e2e8f0; transition: color 0.2s;">★</button>
                        `).join('')}
                    </div>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Your Review</label>
                    <textarea id="courseReviewText" placeholder="Share your experience with this course..." style="width: 100%; height: 120px; padding: 14px; border: 2px solid var(--border); border-radius: 10px; resize: vertical;"></textarea>
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Cancel</button>
                    <button class="btn-zen primary" onclick="submitCourseReviewFromForm()">Submit</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

function submitCourseReviewFromForm() {
    const review = document.getElementById('courseReviewText').value.trim();
    const rating = state.reviewRating || 0;
    
    if (rating === 0) {
        showToast('Please select a rating');
        return;
    }
    
    submitCourseReview(state.reviewingCourse, rating, review);
    closeModal();
    render();
}

// ====== ANALYTICS DASHBOARD ======
function getStudyAnalytics() {
    const userXP = getUserXP(state.user);
    const streak = getStreak(state.user);
    const today = new Date().toDateString();
    
    const todaySessions = db.focusSessions.filter(s => 
        s.user === state.user && 
        new Date(s.completedAt).toDateString() === today
    );
    
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const weekSessions = db.focusSessions.filter(s => 
        s.user === state.user && 
        new Date(s.completedAt) >= thisWeekStart
    );
    
    const totalStudyTime = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    
    const cardReviewToday = db.flashcards.filter(c => 
        c.reviewCount > 0 && 
        new Date(c.nextReview).toDateString() === today
    ).length;
    
    const completedGoals = db.learningGoals.filter(g => 
        g.createdBy === state.user && 
        g.completed
    ).length;
    
    const assignmentsCompleted = db.submissions.filter(s => 
        s.user === state.user && 
        s.status === 'submitted'
    ).length;
    
    return {
        level: getLevel(userXP.xp),
        xp: userXP.xp,
        xpToNextLevel: getXPForLevel(getLevel(userXP.xp) + 1) - userXP.xp,
        xpProgress: getXPProgress(userXP.xp),
        currentStreak: streak.current,
        bestStreak: streak.best,
        sessionsToday: todaySessions.length,
        totalStudyTime,
        cardsReviewed: cardReviewToday,
        completedGoals,
        assignmentsCompleted
    };
}

function renderAnalyticsDashboard() {
    const analytics = getStudyAnalytics();
    
    const statCards = [
        { icon: '📚', value: analytics.assignmentsCompleted, label: 'Assignments Done', color: '#6366f1' },
        { icon: '⏱️', value: `${Math.round(analytics.totalStudyTime / 60)}h`, label: 'Study Time (Week)', color: '#10b981' },
        { icon: '🎯', value: analytics.currentStreak, label: 'Day Streak', color: '#f59e0b' },
        { icon: '🏆', value: analytics.completedGoals, label: 'Goals Completed', color: '#ec4899' }
    ];
    
    return `
        <div class="col-main">
            <h2 style="margin: 0 0 24px 0;">📊 Learning Analytics</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${statCards.map(s => `
                    <div class="stats-card" style="padding: 20px;">
                        <div style="font-size: 32px; margin-bottom: 8px;">${s.icon}</div>
                        <h3 style="background: linear-gradient(135deg, ${s.color}, ${s.color}dd); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${s.value}</h3>
                        <p style="text-transform: none; letter-spacing: 0;">${s.label}</p>
                    </div>
                `).join('')}
            </div>
            
            <div class="post-box" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 20px 0;">XP Progress</h4>
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <span style="font-size: 48px;">${getLevelBadge(analytics.level)}</span>
                    <div style="flex: 1;">
                        <div style="font-size: 24px; font-weight: 800; color: var(--text-main);">Level ${analytics.level}</div>
                        <div style="font-size: 13px; color: var(--text-muted);">${analytics.xp.toLocaleString()} XP total</div>
                    </div>
                </div>
                <div style="background: var(--border); height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
                    <div style="background: linear-gradient(90deg, var(--primary), var(--accent)); height: 100%; width: ${analytics.xpProgress}%; border-radius: 6px; transition: width 0.5s ease;"></div>
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">${analytics.xpToNextLevel.toLocaleString()} XP to Level ${analytics.level + 1}</div>
            </div>
            
            <div class="post-box">
                <h4 style="margin: 0 0 16px 0;">Weekly Activity</h4>
                <div style="display: flex; gap: 8px; justify-content: space-between;">
                    ${['S','M','T','W','T','F','S'].map((day, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        const sessions = db.focusSessions.filter(s => 
                            s.user === state.user && 
                            new Date(s.completedAt).toDateString() === date.toDateString()
                        );
                        const height = Math.min(100, sessions.length * 25);
                        return `
                            <div style="text-align: center; flex: 1;">
                                <div style="background: ${height > 0 ? 'var(--primary)' : 'var(--border)'}; width: 100%; height: ${Math.max(height, 4)}px; border-radius: 4px; margin-bottom: 8px;"></div>
                                <div style="font-size: 11px; color: var(--text-muted);">${day}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

// ====== FOCUS MODE ======
let focusModeActive = false;

function toggleFocusMode() {
    focusModeActive = !focusModeActive;
    
    if (focusModeActive) {
        document.body.classList.add('focus-mode');
        showToast('Focus Mode ON - Minimize distractions! 🚀');
    } else {
        document.body.classList.remove('focus-mode');
        showToast('Focus Mode OFF');
    }
    
    render();
}

function renderFocusModeWidget() {
    return `
        <div style="background: ${focusModeActive ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'var(--bg-card)'}; border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: center; cursor: pointer; transition: all 0.3s ease; box-shadow: var(--shadow);" onclick="toggleFocusMode()">
            <div style="font-size: 24px; margin-bottom: 8px;">${focusModeActive ? '🔴' : '⚪'}</div>
            <div style="font-weight: 700; color: ${focusModeActive ? 'white' : 'var(--text-main)'};">${focusModeActive ? 'FOCUS MODE ON' : 'FOCUS MODE'}</div>
            <div style="font-size: 11px; color: ${focusModeActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'}; margin-top: 4px;">
                ${focusModeActive ? 'Click to disable' : 'Block distractions'}
            </div>
        </div>
    `;
}

// ====== CLOUD SYNC ======
const CLOUD_SYNC_KEY = 'zentelle_cloud_sync_id';
const CLOUD_SYNC_URL = 'https://api.jsonbin.io/v3/b/'; // Free JSON storage

function save() { 
    localStorage.setItem('zentelle_db_v27', JSON.stringify(db)); 
    syncToCloud();
}

function syncToCloud() {
    let syncId = localStorage.getItem(CLOUD_SYNC_KEY);
    if (!syncId) return;
    
    fetch(CLOUD_SYNC_URL + syncId, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': localStorage.getItem('zentelle_cloud_key') || ''
        },
        body: JSON.stringify({ data: db, timestamp: Date.now() })
    }).then(res => res.json()).then(data => {
        localStorage.setItem('zentelle_last_sync', Date.now());
    }).catch(err => console.log('Sync error:', err));
}

function enableCloudSync() {
    let key = prompt('Enter your Cloud Sync Key (or create one at jsonbin.io):\n\n1. Go to jsonbin.io\n2. Create a free account\n3. Create a new bin\n4. Copy the bin ID and Master Key\n\nEnter the Master Key:');
    
    if (!key) return;
    
    fetch(CLOUD_SYNC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': key
        },
        body: JSON.stringify({ data: db, timestamp: Date.now() })
    }).then(res => res.json()).then(data => {
        if (data.metadata?.id) {
            localStorage.setItem(CLOUD_SYNC_KEY, data.metadata.id);
            localStorage.setItem('zentelle_cloud_key', key);
            localStorage.setItem('zentelle_last_sync', Date.now());
            showToast('Cloud sync enabled! Data will sync automatically.');
        }
    }).catch(err => {
        showToast('Failed to enable cloud sync. Check your key.');
    });
}

function syncFromCloud() {
    let syncId = localStorage.getItem(CLOUD_SYNC_KEY);
    let key = localStorage.getItem('zentelle_cloud_key');
    
    if (!syncId || !key) {
        showToast('Cloud sync not configured. Go to Settings to enable.');
        return;
    }
    
    fetch(CLOUD_SYNC_URL + syncId + '/latest', {
        headers: { 'X-Master-Key': key }
    }).then(res => res.json()).then(data => {
        if (data.record?.data) {
            if (confirm('This will replace your current data with cloud data. Continue?')) {
                db = data.record.data;
                localStorage.setItem('zentelle_db_v27', JSON.stringify(db));
                render();
                showToast('Data synced from cloud!');
            }
        }
    }).catch(err => showToast('Failed to sync from cloud.'));
}

function exportData() {
    let dataStr = JSON.stringify(db, null, 2);
    let blob = new Blob([dataStr], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'zentelle_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported!');
}

function importData() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        let file = e.target.files[0];
        if (!file) return;
        
        let reader = new FileReader();
        reader.onload = function(e) {
            try {
                let imported = JSON.parse(e.target.result);
                if (imported.schools && imported.users) {
                    if (confirm('This will replace ALL current data. Continue?')) {
                        db = imported;
                        localStorage.setItem('zentelle_db_v27', JSON.stringify(db));
                        render();
                        showToast('Data imported successfully!');
                    }
                } else {
                    showToast('Invalid backup file.');
                }
            } catch (err) {
                showToast('Failed to parse file.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function getSyncStatus() {
    let syncId = localStorage.getItem(CLOUD_SYNC_KEY);
    let lastSync = localStorage.getItem('zentelle_last_sync');
    if (!syncId) return null;
    return {
        enabled: true,
        lastSync: lastSync ? new Date(parseInt(lastSync)).toLocaleString() : 'Never'
    };
}

// ====== FEATURE FLAGS ======
function isFeatureEnabled(feature) {
    const school = db.schools[0];
    if (!school.features) return true;
    return school.features[feature] !== false;
}

function toggleFeature(feature) {
    const school = db.schools[0];
    if (!school.features) {
        school.features = {
            messaging: true,
            calendar: true,
            announcements: true,
            progressTracking: true,
            classRankings: true,
            gpaCalculator: true,
            gradeChart: true,
            badges: true,
            darkMode: true
        };
    }
    school.features[feature] = !school.features[feature];
    save();
    render();
    showToast(`${feature} ${school.features[feature] ? 'enabled' : 'disabled'}`);
}

// ====== THEME SYSTEM ======
function initTheme() {
    const savedTheme = localStorage.getItem('zentelle_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.style.setProperty('--bg-main', '#0f172a');
        root.style.setProperty('--bg-card', '#1e293b');
        root.style.setProperty('--bg-hover', '#334155');
        root.style.setProperty('--text-main', '#f8fafc');
        root.style.setProperty('--text-secondary', '#94a3b8');
        root.style.setProperty('--text-muted', '#64748b');
        root.style.setProperty('--border', '#334155');
    } else {
        root.style.setProperty('--bg-main', '#f8fafc');
        root.style.setProperty('--bg-card', '#ffffff');
        root.style.setProperty('--bg-hover', '#f1f5f9');
        root.style.setProperty('--text-main', '#1e293b');
        root.style.setProperty('--text-secondary', '#64748b');
        root.style.setProperty('--text-muted', '#94a3b8');
        root.style.setProperty('--border', '#e2e8f0');
    }
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'light';
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    applyTheme(newTheme);
    localStorage.setItem('zentelle_theme', newTheme);
}

// ====== TODO SYSTEM ======
function addTodo() {
    const text = prompt('Enter new todo:');
    if (text && text.trim()) {
        db.todos.push({
            id: Date.now().toString(),
            user: state.user,
            text: text.trim(),
            completed: false,
            created: new Date().toISOString()
        });
        save();
        render();
        showToast('Todo added!');
    }
}

function toggleTodo(id) {
    const todo = db.todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        save();
        render();
    }
}

function deleteTodo(id) {
    db.todos = db.todos.filter(t => t.id !== id);
    save();
    render();
}

function getUserTodos() {
    return db.todos.filter(t => t.user === state.user);
}

// ====== QUICK NOTES ======
function saveQuickNote() {
    const note = document.getElementById('quickNoteArea').value;
    localStorage.setItem('zentelle_note_' + state.user, note);
    showToast('Note saved!');
}

function getQuickNote() {
    return localStorage.getItem('zentelle_note_' + state.user) || '';
}

// ====== TOAST NOTIFICATIONS ======
function showToast(message, duration) {
    duration = duration || 3000;
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:#333; color:white; padding:12px 24px; border-radius:8px; font-size:14px; z-index:9999; animation:fadeIn 0.3s ease;';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(function() { toast.remove(); }, 300);
    }, duration);
}

// ====== GRADE CALCULATOR ======
function calculateNeededGrade() {
    const current = parseFloat(prompt('Current grade %:'));
    const target = parseFloat(prompt('Target grade %:'));
    const weight = parseFloat(prompt('Weight of final exam %:'));
    
    if (isNaN(current) || isNaN(target) || isNaN(weight)) return;
    
    const needed = (target - (current * (100 - weight) / 100)) / (weight / 100);
    
    if (needed > 100) {
        showToast('You need ' + Math.round(needed) + '% - not achievable');
    } else if (needed < 0) {
        showToast("You're already above target! 🎉");
    } else {
        showToast('You need ' + Math.round(needed) + '% on your final');
    }
}

// ====== BOOKMARKS ======
function toggleBookmark(itemId) {
    let bookmarks = JSON.parse(localStorage.getItem('zentelle_bookmarks_' + state.user) || '[]');
    if (bookmarks.includes(itemId)) {
        bookmarks = bookmarks.filter(function(b) { return b !== itemId; });
        showToast('Bookmark removed');
    } else {
        bookmarks.push(itemId);
        showToast('Bookmarked!');
    }
    localStorage.setItem('zentelle_bookmarks_' + state.user, JSON.stringify(bookmarks));
    render();
}

function isBookmarked(itemId) {
    const bookmarks = JSON.parse(localStorage.getItem('zentelle_bookmarks_' + state.user) || '[]');
    return bookmarks.includes(itemId);
}

// ====== ANNOUNCEMENTS ======
function addAnnouncement(courseId) {
    const text = prompt('Enter announcement:');
    if (text && text.trim()) {
        db.updates.unshift({
            id: Date.now().toString(),
            user: state.user,
            type: 'announcement',
            message: text.trim(),
            courseId: courseId,
            timestamp: new Date().toISOString()
        });
        save();
        render();
        showToast('Announcement posted!');
    }
}

// ====== STUDENT RANKINGS ======
function getClassRankings(courseId) {
    const students = db.enrollments.filter(function(e) { return String(e.courseId) === String(courseId); })
        .map(function(e) { return db.users[e.user]; })
        .filter(function(u) { return u && u.role === 'student'; });
    
    const rankings = students.map(function(student) {
        let total = 0, count = 0;
        db.materials.filter(function(m) { return String(m.courseId) === String(courseId) && (m.type.includes('Assign') || m.type.includes('Assess')); })
            .forEach(function(a) {
                const g = db.grades.find(function(x) { return String(x.assignId) === String(a.id) && String(x.user) === String(student.name || student); });
                if (g) { total += g.score; count++; }
            });
        return { student: student, avg: count > 0 ? Math.round(total / count) : 0 };
    });
    
    rankings.sort(function(a, b) { return b.avg - a.avg; });
    return rankings;
}

// ====== PRINT VIEW ======
function printGradebook() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Gradebook</title>');
    printWindow.document.write('<style>body{font-family:Arial;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#6366f1;color:white;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Gradebook Report</h1>');
    printWindow.document.write('<p>Generated: ' + new Date().toLocaleDateString() + '</p>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// ====== KEYBOARD SHORTCUTS ======
document.addEventListener('keydown', function(e) {
    if (!state.user) return;
    if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        addTodo();
    }
    if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        navigate('dashboard');
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.dropdown-panel').forEach(function(el) { el.classList.add('hidden'); });
    }
});

// ====== GPA CALCULATOR ======
function calculateGPA() {
    const courses = db.courses.filter(function(c) {
        return db.enrollments.some(function(e) { return String(e.user) === String(state.user) && String(e.courseId) === String(c.id); });
    });
    
    let totalPoints = 0, totalCredits = 0;
    const grades = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
    
    courses.forEach(function(course) {
        const assignments = db.materials.filter(function(m) { return String(m.courseId) === String(course.id) && (m.type.includes('Assign') || m.type.includes('Assess')); });
        let earned = 0, possible = 0;
        assignments.forEach(function(a) {
            const g = db.grades.find(function(x) { return String(x.assignId) === String(a.id) && String(x.user) === String(state.user); });
            if (g) { earned += g.score; possible += (a.points || 100); }
        });
        if (possible > 0) {
            const pct = (earned / possible) * 100;
            let letter = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
            totalPoints += grades[letter] * 3;
            totalCredits += 3;
        }
    });
    
    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    showToast('Your GPA: ' + gpa);
}

// ====== STATS ======
function getUserStats() {
    const role = db.users[state.user].role;
    const myCourses = db.courses.filter(c => 
        c.teacher === state.user || db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(c.id))
    );
    
    let totalAssignments = 0;
    let completedAssignments = 0;
    let totalGrade = 0;
    let gradedCount = 0;
    let missingCount = 0;
    
    if (role === 'student') {
        myCourses.forEach(course => {
            const assignments = db.materials.filter(m => 
                String(m.courseId) === String(course.id) && 
                (m.type.includes('Assign') || m.type.includes('Assess'))
            );
            totalAssignments += assignments.length;
            
            assignments.forEach(a => {
                const sub = db.submissions.find(s => String(s.assignId) === String(a.id) && String(s.user) === String(state.user));
                const grade = db.grades.find(g => String(g.assignId) === String(a.id) && String(g.user) === String(state.user));
                if (sub && sub.status !== 'draft') completedAssignments++;
                else if (a.due && new Date(a.due) < new Date()) missingCount++;
                if (grade) {
                    totalGrade += grade.score;
                    gradedCount++;
                }
            });
        });
    } else {
        myCourses.forEach(course => {
            totalAssignments += db.materials.filter(m => 
                String(m.courseId) === String(course.id) && 
                (m.type.includes('Assign') || m.type.includes('Assess'))
            ).length;
            completedAssignments += db.submissions.filter(s => {
                const mat = db.materials.find(m => String(m.id) === String(s.assignId));
                return mat && String(mat.courseId) === String(course.id) && s.status !== 'draft';
            }).length;
        });
    }
    
    return {
        courses: myCourses.length,
        assignments: totalAssignments,
        completed: completedAssignments,
        avgGrade: gradedCount > 0 ? Math.round(totalGrade / gradedCount) : 0,
        missing: missingCount
    };
}

// ====== NOTIFICATIONS ======
function getNotifications() {
    let notifications = [];
    const role = db.users[state.user].role;
    
    if (role === 'student') {
        db.grades.filter(g => String(g.user) === String(state.user)).forEach(g => {
            const mat = db.materials.find(m => String(m.id) === String(g.assignId));
            if (mat) {
                notifications.push({
                    id: g.id || Date.now(),
                    type: 'grade',
                    message: `Grade posted: ${mat.title}`,
                    time: g.timestamp || new Date().toISOString(),
                    read: false
                });
            }
        });
    } else {
        const myCourses = db.courses.filter(c => c.teacher === state.user);
        myCourses.forEach(course => {
            const pendingGrading = db.submissions.filter(s => {
                const mat = db.materials.find(m => String(m.id) === String(s.assignId));
                return mat && String(mat.courseId) === String(course.id) && s.status !== 'draft' && 
                       !db.grades.find(g => String(g.assignId) === String(s.assignId) && String(g.user) === String(s.user));
            });
            if (pendingGrading.length > 0) {
                notifications.push({
                    id: course.id,
                    type: 'pending',
                    message: `${pendingGrading.length} submission(s) to grade in ${course.name}`,
                    time: new Date().toISOString(),
                    read: false
                });
            }
        });
    }
    
    return notifications.slice(0, 10);
}

// ====== RECENT ACTIVITY ======
function addActivity(type, message) {
    db.updates.unshift({
        id: Date.now().toString(),
        user: state.user,
        type: type,
        message: message,
        timestamp: new Date().toISOString()
    });
    if (db.updates.length > 50) db.updates = db.updates.slice(0, 50);
    save();
}

function getRecentActivity() {
    return db.updates.filter(u => u.user === state.user).slice(0, 10);
}

// ====== COURSE PROGRESS ======
function getCourseProgress(courseId) {
    const assignments = db.materials.filter(m => 
        String(m.courseId) === String(courseId) && 
        (m.type.includes('Assign') || m.type.includes('Assess'))
    );
    if (assignments.length === 0) return 0;
    
    const completed = assignments.filter(a => {
        const sub = db.submissions.find(s => String(s.assignId) === String(a.id) && String(s.user) === String(state.user));
        return sub && sub.status !== 'draft';
    }).length;
    
    return Math.round((completed / assignments.length) * 100);
}

// ====== GRADE CHART ======
function getGradeChartData() {
    const myCourses = db.courses.filter(c => 
        db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(c.id))
    );
    
    let data = [];
    myCourses.forEach(course => {
        const assignments = db.materials.filter(m => 
            String(m.courseId) === String(course.id) && 
            (m.type.includes('Assign') || m.type.includes('Assess'))
        );
        
        let totalEarned = 0;
        let totalPossible = 0;
        
        assignments.forEach(a => {
            const grade = db.grades.find(g => String(g.assignId) === String(a.id) && String(g.user) === String(state.user));
            if (grade) {
                totalEarned += grade.score;
                totalPossible += (a.points || 100);
            }
        });
        
        if (totalPossible > 0) {
            data.push({
                course: course.name.substring(0, 12),
                percentage: Math.round((totalEarned / totalPossible) * 100)
            });
        }
    });
    
    return data;
}

function renderGradeChart() {
    const data = getGradeChartData();
    if (data.length === 0) return '';
    
    let bars = data.map(d => {
        let color = d.percentage >= 90 ? 'var(--success)' : d.percentage >= 70 ? 'var(--warning)' : 'var(--danger)';
        return '<div style="margin-bottom:16px;"><div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="font-size:12px; font-weight:600;">' + d.course + '</span><span style="font-size:12px; color:' + color + ';">' + d.percentage + '%</span></div><div style="height:8px; background:var(--border); border-radius:4px; overflow:hidden;"><div style="height:100%; width:' + d.percentage + '%; background:' + color + '; border-radius:4px;"></div></div></div>';
    }).join('');
    
    return '<div class="post-box" style="margin-bottom:20px;"><h3 style="margin:0 0 16px 0; color:var(--text-main);">📊 Grade Overview</h3>' + bars + '</div>';
}

// ====== QUICK NOTE WIDGET ======
function renderQuickNote() {
    const note = getQuickNote();
    return '<div class="post-box" style="margin-bottom:20px;"><h3 style="margin:0 0 12px 0; color:var(--text-main);">📝 Quick Note</h3><textarea id="quickNoteArea" placeholder="Jot down notes here..." style="width:100%; height:100px; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm); resize:none; font-size:13px; background:var(--bg-main); color:var(--text-main);">' + note + '</textarea><button onclick="saveQuickNote()" class="btn-zen primary" style="margin-top:10px; padding:8px 16px;">Save</button></div>';
}

if(!db.schools) db.schools = [{ id: "1", name: "Zentelle Academy", logo: "", primaryColor: "#6366f1", secondaryColor: "#ec4899", tagline: "Empowering Education" }];
db.schools[0].logo = db.schools[0].logo || "";
db.schools[0].primaryColor = db.schools[0].primaryColor || "#6366f1";
db.schools[0].secondaryColor = db.schools[0].secondaryColor || "#ec4899";
for(let u in db.users) { 
    if(!db.users[u].schoolId) db.users[u].schoolId = "1";
    if(!db.users[u].picture) db.users[u].picture = "";
}
db.courses.forEach(c => { if(!c.joinCode) c.joinCode = 'COURSE' + Math.random().toString(36).substring(2, 8).toUpperCase(); if(c.image === undefined) c.image = null; });
db.materials.forEach(m => { if(m.lockAfterDue === undefined) m.lockAfterDue = false; });

function save() { localStorage.setItem('zentelle_db_v27', JSON.stringify(db)); }

// ====== STATE ======
let state = {
    user: null, page: 'login', courseId: null, folderId: null, itemId: null,
    dashTab: 'activity', courseTab: 'materials', adminTab: 'users', expandedFolders: [], modal: null,
    attendanceDate: new Date().toISOString().split('T')[0],
    itemTab: 'assign',
    submitTab: 'upload',
    assessTab: 'questions',
    viewAsStudent: false
};

window.zentelleSubmissionSessionManager = {
    init: function() { console.log('Zentelle Session Manager: initialized.'); },
    hasSessionsToClear: function() { return state.user !== null; },
    clearSessions: function() { return new Promise((resolve) => { state.user = null; setTimeout(() => resolve(), 100); }); }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.action-links-wrapper') && !e.target.closest('.header-right')) {
        document.querySelectorAll('.dropdown-panel').forEach(el => el.classList.add('hidden'));
    }
});
document.addEventListener("DOMContentLoaded", async function() { 
    checkLtiSession();
    initTheme();
    render(); 
});

function checkLtiSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const ltiLaunch = urlParams.get('lti_launch');
    
    if (ltiLaunch === 'true') {
        const sessionData = sessionStorage.getItem('gradelink_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                if (session.user) {
                    const localUser = db.users[session.user.username];
                    if (!localUser) {
                        db.users[session.user.username] = {
                            pass: 'lti_' + Math.random().toString(36).substr(2, 9),
                            role: session.user.role,
                            name: session.user.name || session.user.username,
                            email: session.user.email || '',
                            schoolId: '1',
                            ltiSession: true,
                            ltiData: session.lti
                        };
                        save();
                    }
                    state.user = session.user.username;
                    
                    if (session.lti && session.lti.courseId) {
                        state.courseId = session.lti.courseId;
                    }
                    
                    if (urlParams.get('mode') === 'assignment') {
                        state.page = 'course';
                    } else {
                        state.page = 'dashboard';
                    }
                    
                    window.history.replaceState({}, '', window.location.pathname);
                    return;
                }
            } catch (e) {
                console.error('LTI session parse error:', e);
            }
        }
    }
    
    const storedSession = sessionStorage.getItem('gradelink_session');
    if (storedSession && !state.user) {
        try {
            const session = JSON.parse(storedSession);
            if (session.user && db.users[session.user.username]) {
                state.user = session.user.username;
                state.page = 'dashboard';
                window.history.replaceState({}, '', window.location.pathname);
            }
        } catch (e) {
            console.error('Stored session error:', e);
        }
    }
}

// ====== ROLE MANAGEMENT (STUDENT VIEW OVERRIDE) ======
function getEffectiveRole() {
    let actualRole = db.users[state.user].role;
    if ((actualRole === 'admin' || actualRole === 'teacher') && state.viewAsStudent) return 'student';
    return actualRole;
}
function toggleStudentView() { state.viewAsStudent = !state.viewAsStudent; render(); }

// ====== BULLETPROOF ROUTER ======
function navigate(page, rawId = null) {
    try {
        let id = rawId !== null && rawId !== undefined ? String(rawId) : null;
        state.page = page;

        if (['dashboard', 'groups', 'resources', 'login', 'admin', 'flashcards', 'flashcardStudy', 'studyNotes', 'learningGoals', 'studyPartners', 'peerReviews', 'analytics'].includes(page)) { 
            state.courseId = null; state.folderId = null; state.itemId = null; state.viewAsStudent = false; 
        } 
        else if (page === 'course') { 
            state.courseId = id; state.folderId = null; state.courseTab = 'materials'; state.itemId = null; 
        } 
        else if (page === 'folder') { 
            let item = db.materials.find(m => String(m.id) === id);
            if(item) state.courseId = String(item.courseId);
            state.folderId = id; state.courseTab = 'materials'; state.itemId = null; 
        } 
        else if (page === 'item') { 
            let item = db.materials.find(m => String(m.id) === id);
            if (item) {
                state.courseId = String(item.courseId);
                state.folderId = item.parent ? String(item.parent) : null;
                state.itemId = id; state.courseTab = 'materials'; state.itemTab = 'assign'; state.assessTab = 'questions';
            } else { state.page = 'dashboard'; }
        }
        else if (page === 'flashcardStudy') {
            state.flashcardDeckId = id;
            window.flashcardStudyIndex = 0;
        }
        render();
    } catch (err) { alert("Navigation failed! Error: " + err.message); }
}

function setCourseTab(tab) { state.courseTab = tab; state.page = 'course'; state.folderId = null; state.itemId = null; render(); }
function setAdminTab(tab) { state.adminTab = tab; render(); }
function openModal(modalId, extra = null) { state.modal = { id: modalId, data: extra }; if(modalId === 'submitAssig') state.submitTab = 'upload'; render(); }
function closeModal() { state.modal = null; clearDriveFiles(); render(); }

function toggleDropdown(id, e) { 
    if(e) e.stopPropagation();
    document.querySelectorAll('.dropdown-panel').forEach(el => { if(el.id !== id) el.classList.add('hidden'); });
    document.getElementById(id).classList.toggle('hidden'); 
}

function toggleFolderInline(folderId) {
    let strId = String(folderId);
    if (state.expandedFolders.includes(strId)) state.expandedFolders = state.expandedFolders.filter(id => id !== strId);
    else state.expandedFolders.push(strId);
    render();
}

function isMissing(a, userId) {
    if (!a.due) return false;
    let sub = db.submissions.find(s => String(s.assignId) === String(a.id) && String(s.user) === String(userId));
    let isDraft = sub && sub.status === 'draft'; 
    let d = new Date(a.due);
    return (!sub || isDraft) && !isNaN(d.getTime()) && new Date() > d;
}

// ====== MAIN RENDERER ======
function render() {
    try {
        const root = document.getElementById('root');
        if (!state.user) { root.innerHTML = renderLogin(); return; }
        
        let mainContent = '';
        if (state.page === 'dashboard') mainContent = renderDashboard();
        else if (state.page === 'groups') mainContent = renderGroups();
        else if (state.page === 'calendar') mainContent = renderCalendar();
        else if (state.page === 'messages') mainContent = renderMessages();
        else if (state.page === 'badges') mainContent = renderBadges();
        else if (state.page === 'resources') mainContent = renderResources();
        else if (state.page === 'admin') mainContent = renderAdminContainer();
        else if (state.page === 'flashcards') mainContent = renderFlashcardsPage();
        else if (state.page === 'flashcardStudy') mainContent = renderFlashcardStudy(state.flashcardDeckId);
        else if (state.page === 'studyNotes') mainContent = renderStudyNotesPage();
        else if (state.page === 'learningGoals') mainContent = renderLearningGoalsPage();
        else if (state.page === 'studyPartners') mainContent = renderStudyPartnersPage();
        else if (state.page === 'peerReviews') mainContent = renderPeerReviewsPage();
        else if (state.page === 'analytics') mainContent = renderAnalyticsDashboard();
        else mainContent = renderCourseContainer();

        let banner = state.viewAsStudent ? '<div class="view-as-student-banner">👁 VIEWING AS STUDENT - Exit to return to teacher view</div>' : '';
        let notifications = getNotifications();
        let notifBadge = notifications.length > 0 ? '<span style="background:var(--danger); color:white; font-size:10px; padding:2px 6px; border-radius:10px; position:absolute; top:-2px; right:-2px;">' + notifications.length + '</span>' : '';

        root.innerHTML = banner + renderTopbar() + '<div class="zen-container mobile-container">' + mainContent + '</div>' + renderModal() + 
            '<div id="toastContainer"></div>' + renderTimerWidget() +
            '<style>@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(20px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}@keyframes fadeOut{from{opacity:1;}to{opacity:0;}}</style>';
    } catch (err) {
        document.getElementById('root').innerHTML = '<div style="padding:40px; color:red;">System Error: ' + err.message + '. <button onclick="localStorage.removeItem(\'zentelle_db_v27\'); location.reload();">Reset System</button></div>';
    }
}

// ====== GROUPS ======
function initGroups() {
    if (!db.groups) db.groups = [];
    if (!db.groupMembers) db.groupMembers = [];
}

function renderGroups() {
    initGroups();
    let myGroups = db.groups.filter(g => 
        db.groupMembers.some(m => String(m.groupId) === String(g.id) && m.user === state.user)
    );
    let allGroups = db.groups;
    
    let myGroupsHtml = myGroups.length === 0 ?
        '<p style="text-align:center; color:var(--text-muted); padding:40px;">You have not joined any groups yet.</p>' :
        myGroups.map(g => {
            let members = db.groupMembers.filter(m => String(m.groupId) === String(g.id));
            return `
                <div style="padding:20px; background:var(--bg-hover); border-radius:12px; margin-bottom:12px; cursor:pointer;" onclick="viewGroup('${g.id}')">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:56px; height:56px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-size:24px;">${g.icon || '👥'}</div>
                        <div style="flex:1;">
                            <h4 style="margin:0 0 4px 0;">${g.name}</h4>
                            <p style="margin:0; font-size:13px; color:var(--text-muted);">${members.length} member${members.length !== 1 ? 's' : ''} • ${g.description || ''}</p>
                        </div>
                        <span style="font-size:20px; color:var(--text-muted);">→</span>
                    </div>
                </div>
            `;
        }).join('');
    
    let discoverHtml = allGroups.filter(g => !myGroups.some(m => m.id === g.id)).map(g => {
        let members = db.groupMembers.filter(m => String(m.groupId) === String(g.id));
        return `
            <div style="padding:16px; background:var(--bg-hover); border-radius:10px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:44px; height:44px; background:var(--primary); border-radius:10px; display:flex; align-items:center; justify-content:center; color:white; font-size:20px;">${g.icon || '👥'}</div>
                    <div>
                        <div style="font-weight:600;">${g.name}</div>
                        <div style="font-size:12px; color:var(--text-muted);">${members.length} members</div>
                    </div>
                </div>
                <button class="btn-zen" onclick="joinGroup('${g.id}')" style="padding:6px 14px; font-size:12px;">Join</button>
            </div>
        `;
    }).join('') || '<p style="color:var(--text-muted); text-align:center;">No other groups available.</p>';
    
    return `
        <div class="col-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="margin:0;">👥 Groups</h2>
                <button class="btn-zen primary" onclick="openModal('createGroup')">+ Create Group</button>
            </div>
            
            <div class="post-box" style="margin-bottom:24px;">
                <h3 style="margin:0 0 16px 0;">My Groups</h3>
                ${myGroupsHtml}
            </div>
            
            <div class="post-box">
                <h3 style="margin:0 0 16px 0;">Discover Groups</h3>
                ${discoverHtml}
            </div>
        </div>
    `;
}

function viewGroup(groupId) {
    let group = db.groups.find(g => g.id === groupId);
    if (!group) return;
    
    let members = db.groupMembers.filter(m => String(m.groupId) === String(groupId));
    let resources = db.resources?.filter(r => r.groupId === groupId) || [];
    let isAdmin = db.users[state.user].role === 'admin';
    let isMember = members.some(m => m.user === state.user);
    
    let membersHtml = members.map(m => {
        let user = db.users[m.user];
        return `
            <div style="display:flex; align-items:center; gap:10px; padding:8px; background:var(--bg-hover); border-radius:8px;">
                <div style="width:32px; height:32px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:14px;">
                    ${(user?.name || m.user).charAt(0)}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:14px;">${user?.name || m.user}</div>
                    <div style="font-size:11px; color:var(--text-muted); text-transform:capitalize;">${user?.role || 'member'}</div>
                </div>
                ${isAdmin && m.user !== state.user ? `<button class="btn-zen" onclick="removeGroupMember('${groupId}', '${m.user}')" style="padding:4px 8px; font-size:11px; color:var(--danger);">Remove</button>` : ''}
            </div>
        `;
    }).join('');
    
    let resourcesHtml = resources.map(r => `
        <div style="padding:12px; background:var(--bg-hover); border-radius:8px; margin-bottom:8px; cursor:pointer;" onclick="openFileViewer('${r.url}', '${r.title}')">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px;">${r.type === 'link' ? '🔗' : r.type === 'pdf' ? '📄' : '📁'}</span>
                <div>
                    <div style="font-weight:600; font-size:14px;">${r.title}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${r.type}</div>
                </div>
            </div>
        </div>
    `).join('') || '<p style="color:var(--text-muted);">No resources shared in this group.</p>';
    
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width:600px; max-height:90vh; overflow-y:auto;" onclick="event.stopPropagation()">
                <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
                    <div style="width:64px; height:64px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:16px; display:flex; align-items:center; justify-content:center; color:white; font-size:32px;">${group.icon || '👥'}</div>
                    <div>
                        <h2 style="margin:0;">${group.name}</h2>
                        <p style="margin:4px 0 0 0; color:var(--text-muted);">${group.description || 'No description'}</p>
                    </div>
                </div>
                
                <div style="margin-bottom:24px;">
                    <h4 style="margin:0 0 12px 0;">Members (${members.length})</h4>
                    <div style="max-height:200px; overflow-y:auto;">
                        ${membersHtml}
                    </div>
                </div>
                
                <div style="margin-bottom:20px;">
                    <h4 style="margin:0 0 12px 0;">Shared Resources</h4>
                    ${resourcesHtml}
                </div>
                
                <div class="modal-buttons">
                    ${isMember ? `<button class="btn-zen" onclick="leaveGroup('${groupId}')" style="margin-right:auto; color:var(--danger);">Leave Group</button>` : ''}
                    <button class="btn-zen primary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function joinGroup(groupId) {
    db.groupMembers.push({ groupId, user: state.user, joinedAt: new Date().toISOString() });
    save();
    render();
    showToast('Joined group!');
}

function leaveGroup(groupId) {
    if (!confirm('Leave this group?')) return;
    db.groupMembers = db.groupMembers.filter(m => !(String(m.groupId) === String(groupId) && m.user === state.user));
    save();
    closeModal();
    render();
    showToast('Left group');
}

function removeGroupMember(groupId, user) {
    db.groupMembers = db.groupMembers.filter(m => !(String(m.groupId) === String(groupId) && m.user === user));
    save();
    viewGroup(groupId);
}

function createGroup() {
    let name = prompt('Group name:');
    if (!name) return;
    
    let description = prompt('Description (optional):') || '';
    let icon = prompt('Icon emoji (optional):') || '👥';
    
    let groupId = 'group_' + Date.now();
    db.groups.push({ id: groupId, name, description, icon, createdBy: state.user, createdAt: new Date().toISOString() });
    db.groupMembers.push({ groupId, user: state.user, joinedAt: new Date().toISOString(), role: 'admin' });
    
    save();
    closeModal();
    render();
    showToast('Group created!');
}

// ====== RESOURCES ======
function initResources() {
    if (!db.resources) db.resources = [];
}

function renderResources() {
    initResources();
    let myResources = db.resources.filter(r => r.user === state.user || r.shared);
    
    let resourcesHtml = myResources.length === 0 ?
        '<p style="text-align:center; color:var(--text-muted); padding:40px;">Your Resources collection is empty. Add some resources!</p>' :
        myResources.map(r => `
            <div style="padding:16px; background:var(--bg-hover); border-radius:12px; margin-bottom:12px; cursor:pointer;" onclick="openFileViewer('${r.url}', '${r.title}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:48px; height:48px; background:${r.type === 'link' ? '#4285f4' : r.type === 'pdf' ? '#ea4335' : '#34a853'}; border-radius:10px; display:flex; align-items:center; justify-content:center; color:white; font-size:22px;">
                        ${r.type === 'link' ? '🔗' : r.type === 'pdf' ? '📄' : r.type === 'video' ? '🎬' : '📁'}
                    </div>
                    <div style="flex:1;">
                        <h4 style="margin:0 0 4px 0;">${r.title}</h4>
                        <p style="margin:0; font-size:12px; color:var(--text-muted);">${r.type} • Added ${new Date(r.addedAt).toLocaleDateString()}</p>
                    </div>
                    <button class="btn-zen" onclick="event.stopPropagation(); deleteResource('${r.id}')" style="padding:6px 10px; color:var(--danger);">🗑️</button>
                </div>
            </div>
        `).join('');
    
    return `
        <div class="col-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="margin:0;">📁 Resources</h2>
                <button class="btn-zen primary" onclick="openModal('addResource')">+ Add Resource</button>
            </div>
            
            <div class="post-box">
                <h3 style="margin:0 0 16px 0;">My Collection</h3>
                ${resourcesHtml}
            </div>
        </div>
    `;
}

function addResource() {
    let title = prompt('Resource title:');
    if (!title) return;
    
    let url = prompt('URL:');
    if (!url) return;
    
    let type = 'file';
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) type = 'link';
    else if (url.includes('.pdf')) type = 'pdf';
    else if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'video';
    
    db.resources.push({
        id: 'res_' + Date.now(),
        title,
        url,
        type,
        user: state.user,
        addedAt: new Date().toISOString(),
        shared: false
    });
    
    save();
    closeModal();
    render();
    showToast('Resource added!');
}

function deleteResource(resId) {
    if (!confirm('Delete this resource?')) return;
    db.resources = db.resources.filter(r => r.id !== resId);
    save();
    render();
    showToast('Resource deleted');
}

// ====== MOBILE VIEW (iPad Optimized) ======
function checkMobileView() {
    let width = window.innerWidth;
    if (width <= 1024) {
        document.body.classList.add('mobile-view');
    } else {
        document.body.classList.remove('mobile-view');
    }
}

window.addEventListener('resize', checkMobileView);
document.addEventListener('DOMContentLoaded', checkMobileView);

// Add mobile CSS
let mobileCSS = document.createElement('style');
mobileCSS.textContent = `
    @media (max-width: 1024px) {
        .mobile-view .zen-header {
            height: 60px;
            padding: 0 16px;
        }
        .mobile-view .zen-header .logo-text {
            font-size: 20px;
            margin-right: 16px;
        }
        .mobile-view .top-nav {
            display: none !important;
        }
        .mobile-view .zen-container {
            flex-direction: column !important;
            padding: 16px !important;
            gap: 16px !important;
        }
        .mobile-view .col-left,
        .mobile-view .col-right {
            width: 100% !important;
            position: static !important;
            height: auto !important;
            border-radius: 16px !important;
        }
        .mobile-view .col-main {
            padding: 0 !important;
            min-height: auto !important;
        }
        .mobile-view .mobile-container {
            display: flex;
            flex-direction: column;
        }
        .mobile-view .post-box {
            padding: 16px !important;
            margin-bottom: 12px !important;
        }
        .mobile-view .course-grid {
            grid-template-columns: 1fr !important;
        }
        .mobile-view .stats-card {
            padding: 16px !important;
        }
        .mobile-view .stats-card h3 {
            font-size: 24px !important;
        }
        .mobile-view .gradebook-table {
            font-size: 12px !important;
        }
        .mobile-view .gradebook-table th,
        .mobile-view .gradebook-table td {
            padding: 8px !important;
        }
        .mobile-view .welcome-banner {
            padding: 20px !important;
        }
        .mobile-view .welcome-banner h2 {
            font-size: 20px !important;
        }
        .mobile-view .btn-zen {
            padding: 10px 16px !important;
            font-size: 13px !important;
        }
        .mobile-view .materials-wrapper {
            min-height: auto !important;
        }
        .mobile-view .course-header {
            padding: 16px !important;
        }
        .mobile-view .course-header h1 {
            font-size: 18px !important;
        }
        .mobile-view .left-nav-menu li {
            padding: 12px 16px !important;
        }
        .mobile-view .feed-item {
            padding: 16px !important;
        }
        .mobile-view .modal-content {
            width: 95% !important;
            padding: 20px !important;
            margin: 16px !important;
        }
        .mobile-view #pdf-viewer {
            height: 70vh !important;
        }
        .mobile-view .zen-header .mobile-menu-btn {
            display: flex !important;
        }
    }
    
    @media (min-width: 769px) and (max-width: 1024px) {
        .tablet-two-col {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
        }
    }
    
    .zen-header .mobile-menu-btn {
        display: none;
    }
    
    @media (max-width: 768px) {
        .phone-hide {
            display: none !important;
        }
    }
`;
document.head.appendChild(mobileCSS);

// ====== QUICK ACTIONS BAR ======
function renderQuickActions() {
    return `
        <div id="quickActionsBar" style="position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:12px;">
            <button onclick="toggleQuickGrade()" style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-dark)); border:none; color:white; font-size:24px; cursor:pointer; box-shadow:0 4px 20px rgba(99,102,241,0.4); transition:all 0.3s;" title="Quick Grade">📊</button>
            <button onclick="toggleQuickPoll()" style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--secondary)); border:none; color:white; font-size:24px; cursor:pointer; box-shadow:0 4px 20px rgba(236,72,153,0.4); transition:all 0.3s;" title="Quick Poll">📋</button>
            <button onclick="toggleNotes()" style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, var(--success), #059669); border:none; color:white; font-size:24px; cursor:pointer; box-shadow:0 4px 20px rgba(16,185,129,0.4); transition:all 0.3s;" title="Quick Notes">📝</button>
            <button onclick="toggleHelp()" style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, #636b7a, #4a5568); border:none; color:white; font-size:24px; cursor:pointer; box-shadow:0 4px 20px rgba(99,102,115,0.4); transition:all 0.3s;" title="Help">❓</button>
            <button onclick="scrollToTop()" id="scrollTopBtn" style="width:48px; height:48px; border-radius:50%; background:var(--primary); border:none; color:white; font-size:20px; cursor:pointer; opacity:0; transition:opacity 0.3s;" title="Scroll to Top">↑</button>
        </div>
        <script>
            window.addEventListener('scroll', function() {
                let btn = document.getElementById('scrollTopBtn');
                if (window.scrollY > 300) {
                    btn.style.opacity = '1';
                } else {
                    btn.style.opacity = '0';
                }
            });
            function scrollToTop() {
                window.scrollTo({top: 0, behavior: 'smooth'});
            }
        </script>
    `;
}

function toggleQuickGrade() {
    let panel = document.getElementById('quickGradePanel');
    if (panel) { panel.remove(); return; }
    
    let courses = db.courses.filter(c => c.teacher === state.user || db.users[state.user].role === 'admin');
    let courseOptions = courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    let html = `
        <div id="quickGradePanel" style="position:fixed; bottom:100px; right:24px; width:350px; max-height:500px; background:white; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.2); z-index:99998; overflow:hidden;">
            <div style="padding:16px 20px; background:linear-gradient(135deg, var(--primary), var(--primary-dark)); color:white;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:16px;">📊 Quick Grade Entry</span>
                    <button onclick="document.getElementById('quickGradePanel').remove()" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">✕</button>
                </div>
            </div>
            <div style="padding:16px;">
                <select id="qgCourse" onchange="loadQuickGradeStudents()" style="width:100%; padding:10px; border-radius:8px; margin-bottom:12px;">
                    <option value="">Select Course</option>
                    ${courseOptions}
                </select>
                <div id="qgStudents"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function loadQuickGradeStudents() {
    let courseId = document.getElementById('qgCourse').value;
    if (!courseId) return;
    
    let students = db.enrollments.filter(e => String(e.courseId) === String(courseId)).map(e => db.users[e.user]).filter(u => u && u.role === 'student');
    let assignments = db.materials.filter(m => String(m.courseId) === String(courseId) && (m.type.includes('Assign') || m.type.includes('Assess')));
    
    let html = students.slice(0, 5).map(s => `
        <div style="padding:10px; background:var(--bg-hover); border-radius:8px; margin-bottom:8px;">
            <div style="font-weight:600; margin-bottom:8px;">${s.name}</div>
            <div style="display:grid; grid-template-columns:repeat(${Math.min(assignments.length, 3)}, 1fr); gap:6px;">
                ${assignments.slice(0, 3).map(a => {
                    let g = db.grades.find(x => String(x.assignId) === String(a.id) && String(x.user) === String(s.name));
                    return `<input type="number" placeholder="${a.title.substring(0,8)}" value="${g?.score || ''}" style="padding:6px; border-radius:4px; width:60px;" onchange="quickSaveGrade('${a.id}', '${s.name}', this.value)">`;
                }).join('')}
            </div>
        </div>
    `).join('');
    
    document.getElementById('qgStudents').innerHTML = html || '<p style="color:var(--text-muted);">No students enrolled</p>';
}

function quickSaveGrade(assignId, studentName, score) {
    if (!score) return;
    
    let existing = db.grades.findIndex(g => String(g.assignId) === String(assignId) && String(g.user) === String(studentName));
    if (existing >= 0) {
        db.grades[existing].score = parseFloat(score);
        db.grades[existing].timestamp = new Date().toISOString();
    } else {
        db.grades.push({ id: 'grade_' + Date.now(), assignId, user: studentName, score: parseFloat(score), timestamp: new Date().toISOString() });
    }
    save();
    showToast('Grade saved!');
}

function toggleQuickPoll() {
    let panel = document.getElementById('quickPollPanel');
    if (panel) { panel.remove(); return; }
    
    let html = `
        <div id="quickPollPanel" style="position:fixed; bottom:100px; right:24px; width:350px; background:white; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.2); z-index:99998; overflow:hidden;">
            <div style="padding:16px 20px; background:linear-gradient(135deg, var(--accent), var(--secondary)); color:white;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:16px;">📋 Quick Poll</span>
                    <button onclick="document.getElementById('quickPollPanel').remove()" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">✕</button>
                </div>
            </div>
            <div style="padding:16px;">
                <input type="text" id="pollQuestion" placeholder="Ask a question..." style="width:100%; padding:10px; border-radius:8px; margin-bottom:12px;">
                <div id="pollOptions">
                    <input type="text" placeholder="Option 1" style="width:100%; padding:10px; border-radius:8px; margin-bottom:8px;">
                    <input type="text" placeholder="Option 2" style="width:100%; padding:10px; border-radius:8px; margin-bottom:8px;">
                </div>
                <button onclick="addPollOption()" style="width:100%; padding:8px; background:var(--bg-hover); border:none; border-radius:8px; cursor:pointer; margin-bottom:12px;">+ Add Option</button>
                <button onclick="createPoll()" class="btn-zen primary" style="width:100%;">Create Poll</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function addPollOption() {
    let optionsDiv = document.getElementById('pollOptions');
    let count = optionsDiv.children.length + 1;
    let input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Option ' + count;
    input.style.cssText = 'width:100%; padding:10px; border-radius:8px; margin-bottom:8px;';
    optionsDiv.appendChild(input);
}

function createPoll() {
    let question = document.getElementById('pollQuestion').value.trim();
    let options = Array.from(document.getElementById('pollOptions').children).map(i => i.value.trim()).filter(v => v);
    
    if (!question || options.length < 2) {
        showToast('Please enter a question and at least 2 options');
        return;
    }
    
    if (!db.polls) db.polls = [];
    
    db.polls.push({
        id: 'poll_' + Date.now(),
        question,
        options: options.map(o => ({ text: o, votes: 0 })),
        createdBy: state.user,
        courseId: state.courseId,
        createdAt: new Date().toISOString()
    });
    
    save();
    document.getElementById('quickPollPanel').remove();
    showToast('Poll created!');
    render();
}

function toggleNotes() {
    let panel = document.getElementById('notesPanel');
    if (panel) { panel.remove(); return; }
    
    let notes = db.notes || [];
    let notesHtml = notes.map(n => `
        <div style="padding:12px; background:var(--bg-hover); border-radius:8px; margin-bottom:8px;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">${new Date(n.timestamp).toLocaleDateString()}</div>
            <div>${n.text}</div>
        </div>
    `).join('') || '<p style="color:var(--text-muted);">No notes yet.</p>';
    
    let html = `
        <div id="notesPanel" style="position:fixed; bottom:100px; right:24px; width:350px; max-height:400px; background:white; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,0.2); z-index:99998; overflow:hidden;">
            <div style="padding:16px 20px; background:linear-gradient(135deg, var(--success), #059669); color:white;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:16px;">📝 Quick Notes</span>
                    <button onclick="document.getElementById('notesPanel').remove()" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">✕</button>
                </div>
            </div>
            <div style="padding:16px; max-height:300px; overflow-y:auto;">
                ${notesHtml}
            </div>
            <div style="padding:12px; border-top:1px solid var(--border);">
                <div style="display:flex; gap:8px;">
                    <input type="text" id="newNoteInput" placeholder="Type a note..." style="flex:1; padding:10px; border-radius:8px;" onkeyup="if(event.key==='Enter')addQuickNote()">
                    <button onclick="addQuickNote()" class="btn-zen primary" style="padding:10px 14px;">Add</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function addQuickNote() {
    let text = document.getElementById('newNoteInput').value.trim();
    if (!text) return;
    
    if (!db.notes) db.notes = [];
    db.notes.unshift({ id: 'note_' + Date.now(), text, timestamp: new Date().toISOString() });
    if (db.notes.length > 50) db.notes = db.notes.slice(0, 50);
    
    save();
    toggleNotes();
    showToast('Note saved!');
}

function toggleHelp() {
    let html = `
        <div id="helpPanel" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center;" onclick="this.remove()">
            <div style="background:white; padding:32px; border-radius:20px; width:600px; max-height:80vh; overflow-y:auto;" onclick="event.stopPropagation()">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="margin:0;">❓ Help Center</h2>
                    <button onclick="document.getElementById('helpPanel').remove()" style="background:none; border:none; font-size:24px; cursor:pointer;">✕</button>
                </div>
                
                <div style="margin-bottom:20px;">
                    <h3 style="margin:0 0 12px 0; color:var(--primary);">⌨️ Keyboard Shortcuts</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <div style="padding:8px; background:var(--bg-hover); border-radius:6px; display:flex; justify-content:space-between;"><span>Dashboard</span><code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">Ctrl + D</code></div>
                        <div style="padding:8px; background:var(--bg-hover); border-radius:6px; display:flex; justify-content:space-between;"><span>New Todo</span><code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">Ctrl + N</code></div>
                        <div style="padding:8px; background:var(--bg-hover); border-radius:6px; display:flex; justify-content:space-between;"><span>Messages</span><code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">Ctrl + M</code></div>
                        <div style="padding:8px; background:var(--bg-hover); border-radius:6px; display:flex; justify-content:space-between;"><span>Calendar</span><code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">Ctrl + K</code></div>
                        <div style="padding:8px; background:var(--bg-hover); border-radius:6px; display:flex; justify-content:space-between;"><span>Search</span><code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">/</code></div>
                        <div style="padding:8px; background:var(--bg-hover); border-radius:6px; display:flex; justify-content:space-between;"><span>Close Modal</span><code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">Esc</code></div>
                    </div>
                </div>
                
                <div style="margin-bottom:20px;">
                    <h3 style="margin:0 0 12px 0; color:var(--primary);">📚 Quick Guide</h3>
                    <div style="line-height:1.8;">
                        <p><strong>For Students:</strong> Join courses with codes, submit assignments, view grades, participate in discussions.</p>
                        <p><strong>For Teachers:</strong> Create courses, add materials, grade submissions, post announcements.</p>
                        <p><strong>For Admins:</strong> Manage users, configure school settings, access all features.</p>
                    </div>
                </div>
                
                <div>
                    <h3 style="margin:0 0 12px 0; color:var(--primary);">🔗 Quick Links</h3>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button onclick="navigate('dashboard'); document.getElementById('helpPanel').remove();" class="btn-zen">Dashboard</button>
                        <button onclick="navigate('calendar'); document.getElementById('helpPanel').remove();" class="btn-zen">Calendar</button>
                        <button onclick="navigate('messages'); document.getElementById('helpPanel').remove();" class="btn-zen">Messages</button>
                        <button onclick="navigate('badges'); document.getElementById('helpPanel').remove();" class="btn-zen">Badges</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ====== GRADE HISTORY & AUDIT TRAIL ======
function initGradeHistory() {
    if (!db.gradeHistory) db.gradeHistory = [];
}

function logGradeChange(gradeId, student, oldScore, newScore, action) {
    initGradeHistory();
    db.gradeHistory.push({
        id: 'gh_' + Date.now(),
        gradeId,
        student,
        oldScore,
        newScore,
        action,
        changedBy: state.user,
        timestamp: new Date().toISOString()
    });
    save();
}

function viewGradeHistory(studentName, courseId) {
    initGradeHistory();
    let history = db.gradeHistory.filter(h => h.student === studentName);
    
    let html = history.map(h => `
        <div style="padding:12px; border-bottom:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between;">
                <span style="font-weight:600;">${h.action}</span>
                <span style="color:var(--text-muted); font-size:12px;">${new Date(h.timestamp).toLocaleString()}</span>
            </div>
            <div style="font-size:13px; color:var(--text-secondary);">
                Changed by: ${db.users[h.changedBy]?.name || h.changedBy}
            </div>
        </div>
    `).join('') || '<p style="padding:20px; color:var(--text-muted);">No grade history for this student.</p>';
    
    let panel = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width:500px;" onclick="event.stopPropagation()">
                <h3>📜 Grade History: ${studentName}</h3>
                <div style="max-height:400px; overflow-y:auto;">
                    ${html}
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', panel);
}

// ====== STUDENT NOTES ======
function initStudentNotes() {
    if (!db.studentNotes) db.studentNotes = [];
}

function viewStudentNotes(studentName) {
    initStudentNotes();
    let notes = db.studentNotes.filter(n => n.student === studentName);
    
    let notesHtml = notes.map(n => `
        <div style="padding:12px; background:var(--bg-hover); border-radius:8px; margin-bottom:8px;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">${new Date(n.timestamp).toLocaleDateString()}</div>
            <div>${n.text}</div>
        </div>
    `).join('') || '<p style="color:var(--text-muted);">No notes yet.</p>';
    
    let panel = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>📝 Notes: ${studentName}</h3>
                <div id="studentNotesArea" style="max-height:300px; overflow-y:auto; margin-bottom:16px;">
                    ${notesHtml}
                </div>
                <textarea id="newStudentNote" placeholder="Add a note..." rows="3" style="width:100%; padding:10px; border-radius:8px; margin-bottom:10px;"></textarea>
                <button class="btn-zen primary" onclick="addStudentNote('${studentName}')" style="width:100%;">Save Note</button>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', panel);
}

function addStudentNote(studentName) {
    let text = document.getElementById('newStudentNote').value.trim();
    if (!text) return;
    
    initStudentNotes();
    db.studentNotes.push({
        id: 'sn_' + Date.now(),
        student: studentName,
        text,
        addedBy: state.user,
        timestamp: new Date().toISOString()
    });
    
    save();
    viewStudentNotes(studentName);
    showToast('Note saved!');
}

// ====== LATE PENALTY SYSTEM ======
function initLatePenalties() {
    if (!db.latePenaltyRules) {
        db.latePenaltyRules = {
            enabled: true,
            dailyPenalty: 10,
            maxPenalty: 50
        };
    }
}

function calculateLatePenalty(originalScore, dueDate, submittedDate) {
    initLatePenalties();
    if (!db.latePenaltyRules.enabled) return originalScore;
    
    let due = new Date(dueDate);
    let submitted = new Date(submittedDate);
    let daysLate = Math.ceil((submitted - due) / (1000 * 60 * 60 * 24));
    
    if (daysLate <= 0) return originalScore;
    
    let penalty = Math.min(daysLate * db.latePenaltyRules.dailyPenalty, db.latePenaltyRules.maxPenalty);
    return Math.max(originalScore - penalty, 0);
}

function renderPenaltySettings() {
    initLatePenaltyRules();
    let rules = db.latePenaltyRules;
    
    return `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>⏰ Late Penalty Settings</h3>
                <div style="margin-bottom:16px;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                        <input type="checkbox" id="penaltyEnabled" ${rules.enabled ? 'checked' : ''} onchange="updatePenaltyRules()">
                        <span>Enable late penalties</span>
                    </label>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; margin-bottom:6px;">Daily penalty %</label>
                    <input type="number" id="dailyPenalty" value="${rules.dailyPenalty}" min="0" max="100" style="width:100px; padding:10px;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; margin-bottom:6px;">Maximum penalty %</label>
                    <input type="number" id="maxPenalty" value="${rules.maxPenalty}" min="0" max="100" style="width:100px; padding:10px;">
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Cancel</button>
                    <button class="btn-zen primary" onclick="savePenaltyRules()">Save</button>
                </div>
            </div>
        </div>
    `;
}

function initPenaltyRules() {
    if (!db.latePenaltyRules) {
        db.latePenaltyRules = { enabled: true, dailyPenalty: 10, maxPenalty: 50 };
    }
}

function savePenaltyRules() {
    db.latePenaltyRules = {
        enabled: document.getElementById('penaltyEnabled').checked,
        dailyPenalty: parseInt(document.getElementById('dailyPenalty').value) || 10,
        maxPenalty: parseInt(document.getElementById('maxPenalty').value) || 50
    };
    save();
    closeModal();
    showToast('Penalty settings saved!');
}

// ====== CUSTOM GRADE SCALES ======
function initGradeScales() {
    if (!db.gradeScales) {
        db.gradeScales = {
            standard: { name: 'Standard', scale: [{ letter: 'A', min: 90 }, { letter: 'B', min: 80 }, { letter: 'C', min: 70 }, { letter: 'D', min: 60 }, { letter: 'F', min: 0 }] },
            honors: { name: 'Honors', scale: [{ letter: 'A', min: 93 }, { letter: 'A-', min: 90 }, { letter: 'B+', min: 87 }, { letter: 'B', min: 83 }, { letter: 'B-', min: 80 }, { letter: 'C+', min: 77 }, { letter: 'C', min: 73 }, { letter: 'C-', min: 70 }, { letter: 'D', min: 60 }, { letter: 'F', min: 0 }] },
            ap: { name: 'AP/College', scale: [{ letter: 'A', min: 93 }, { letter: 'A-', min: 90 }, { letter: 'B+', min: 87 }, { letter: 'B', min: 83 }, { letter: 'B-', min: 80 }, { letter: 'C+', min: 77 }, { letter: 'C', min: 73 }, { letter: 'C-', min: 70 }, { letter: 'D', min: 65 }, { letter: 'F', min: 0 }] }
        };
    }
}

function getLetterGrade(percentage, scaleName = 'standard') {
    initGradeScales();
    let scale = db.gradeScales[scaleName] || db.gradeScales.standard;
    for (let s of scale.scale) {
        if (percentage >= s.min) return s.letter;
    }
    return 'F';
}

function renderGradeScaleSettings() {
    initGradeScales();
    let html = Object.entries(db.gradeScales).map(([key, val]) => `
        <div style="padding:16px; background:var(--bg-hover); border-radius:10px; margin-bottom:12px;">
            <div style="font-weight:700; margin-bottom:8px;">${val.name}</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${val.scale.map(s => `<span style="padding:4px 10px; background:white; border-radius:4px; font-size:13px;">${s.letter}: ${s.min}%</span>`).join('')}
            </div>
        </div>
    `).join('');
    
    let panel = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>📊 Grade Scales</h3>
                ${html}
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', panel);
}

// ====== COURSE COPY ======
function copyCourse(courseId) {
    let original = db.courses.find(c => c.id === courseId);
    if (!original) return;
    
    let newName = prompt('New course name:', original.name + ' (Copy)');
    if (!newName) return;
    
    let newId = 'course_' + Date.now();
    let newCode = 'COURSE' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    db.courses.push({
        id: newId,
        name: newName,
        section: original.section,
        teacher: state.user,
        joinCode: newCode,
        image: original.image,
        createdAt: new Date().toISOString()
    });
    
    let materials = db.materials.filter(m => String(m.courseId) === String(courseId));
    let idMap = {};
    
    materials.forEach(m => {
        let oldId = m.id;
        let newMatId = 'mat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        idMap[oldId] = newMatId;
        
        db.materials.push({
            ...m,
            id: newMatId,
            courseId: newId
        });
    });
    
    save();
    showToast('Course copied!');
    render();
}

// ====== ACTIVITY LOG ======
function initActivityLog() {
    if (!db.activityLog) db.activityLog = [];
}

function logActivity(action, details) {
    initActivityLog();
    db.activityLog.unshift({
        id: 'act_' + Date.now(),
        user: state.user,
        action,
        details,
        timestamp: new Date().toISOString()
    });
    if (db.activityLog.length > 100) db.activityLog = db.activityLog.slice(0, 100);
    save();
}

function renderActivityLog() {
    initActivityLog();
    let isAdmin = db.users[state.user].role === 'admin';
    let activities = isAdmin ? db.activityLog : db.activityLog.filter(a => a.user === state.user);
    
    let html = activities.slice(0, 50).map(a => {
        let icons = { 'login': '🔑', 'logout': '🚪', 'grade': '📝', 'submit': '📤', 'create': '✨', 'delete': '🗑️', 'update': '✏️' };
        return `
            <div style="padding:12px; border-bottom:1px solid var(--border); display:flex; gap:12px; align-items:start;">
                <div style="width:36px; height:36px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0;">
                    ${icons[a.action] || '📌'}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:600;">${db.users[a.user]?.name || a.user}</div>
                    <div style="font-size:13px; color:var(--text-secondary);">${a.details}</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${new Date(a.timestamp).toLocaleString()}</div>
                </div>
            </div>
        `;
    }).join('') || '<p style="padding:40px; text-align:center; color:var(--text-muted);">No activity recorded.</p>';
    
    let panel = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width:600px; max-height:80vh;" onclick="event.stopPropagation()">
                <h3>📋 Activity Log ${isAdmin ? '(Admin)' : ''}</h3>
                <div style="max-height:60vh; overflow-y:auto;">
                    ${html}
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', panel);
}

// ====== ENHANCED KEYBOARD SHORTCUTS ======
document.addEventListener('keydown', function(e) {
    if (!state.user) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector('#globalSearch')?.focus();
    }
    if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        navigate('dashboard');
    }
    if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        navigate('messages');
    }
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        navigate('calendar');
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay, #quickGradePanel, #quickPollPanel, #notesPanel, #helpPanel').forEach(el => el.remove());
    }
});

// Initialize all systems
initGroups();
initResources();
initAchievements();
initMessages();
initActivityLog();
initLatePenalties();
initGradeScales();
initStudentNotes();

// Log login activity
if (state.user) {
    logActivity('login', 'User logged in');
}

// ====== PARENT PORTAL ======
function renderParentPortal() {
    let parentData = db.parents?.find(p => p.user === state.user);
    let linkedStudents = parentData?.students || [];
    
    let studentsHtml = linkedStudents.length === 0 ?
        '<p style="text-align:center; color:var(--text-muted); padding:40px;">No students linked to your account. Contact your school administrator.</p>' :
        linkedStudents.map(studentName => {
            let student = Object.values(db.users).find(u => u.name === studentName);
            if (!student) return '';
            
            let courses = db.enrollments.filter(e => e.user === studentName).map(e => db.courses.find(c => c.id === e.courseId)).filter(c => c);
            
            let assignments = [];
            courses.forEach(c => {
                let mats = db.materials.filter(m => String(m.courseId) === String(c.id) && (m.type.includes('Assign') || m.type.includes('Assess')));
                mats.forEach(m => assignments.push({...m, courseName: c.name}));
            });
            
            let upcomingHtml = assignments.filter(a => a.due && new Date(a.due) >= new Date()).slice(0, 5).map(a => {
                let sub = db.submissions.find(s => String(s.assignId) === String(a.id) && s.user === studentName);
                let grade = db.grades.find(g => String(g.assignId) === String(a.id) && g.user === studentName);
                let status = sub ? (grade ? `Graded: ${grade.score}/${a.points || 100}` : 'Submitted') : (a.due ? `Due: ${new Date(a.due).toLocaleDateString()}` : 'No due date');
                return `
                    <div style="padding:12px; background:${grade ? '#d1fae5' : sub ? '#fef3c7' : '#e3f2fd'}; border-radius:8px; margin-bottom:8px;">
                        <div style="font-weight:600; margin-bottom:4px;">${a.title}</div>
                        <div style="font-size:12px; color:var(--text-secondary);">${a.courseName} • ${status}</div>
                    </div>
                `;
            }).join('') || '<p style="color:var(--text-muted);">No upcoming assignments.</p>';
            
            let gradesHtml = assignments.map(a => {
                let grade = db.grades.find(g => String(g.assignId) === String(a.id) && g.user === studentName);
                if (!grade) return '';
                let pct = Math.round((grade.score / (a.points || 100)) * 100);
                return `
                    <tr>
                        <td style="padding:10px;">${a.title}</td>
                        <td style="padding:10px;">${a.courseName}</td>
                        <td style="padding:10px; text-align:center;">${grade.score}/${a.points || 100}</td>
                        <td style="padding:10px; text-align:center;"><strong style="color:${pct >= 70 ? 'var(--success)' : 'var(--danger)'};">${pct}%</strong></td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--text-muted);">No grades yet.</td></tr>';
            
            let avgGrade = 0, count = 0;
            assignments.forEach(a => {
                let grade = db.grades.find(g => String(g.assignId) === String(a.id) && g.user === studentName);
                if (grade) {
                    avgGrade += (grade.score / (a.points || 100)) * 100;
                    count++;
                }
            });
            let avg = count > 0 ? Math.round(avgGrade / count) : 0;
            
            return `
                <div class="post-box" style="margin-bottom:24px;">
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
                        <div style="width:64px; height:64px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:28px; font-weight:700;">
                            ${studentName.charAt(0)}
                        </div>
                        <div>
                            <h3 style="margin:0;">${studentName}</h3>
                            <p style="margin:4px 0 0 0; color:var(--text-muted);">${courses.length} course(s)</p>
                        </div>
                        <div style="margin-left:auto; text-align:right;">
                            <div style="font-size:32px; font-weight:800; color:${avg >= 70 ? 'var(--success)' : 'var(--danger)'};">${avg}%</div>
                            <div style="font-size:12px; color:var(--text-muted);">Average Grade</div>
                        </div>
                    </div>
                    
                    <h4 style="margin:0 0 12px 0;">📚 Courses</h4>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
                        ${courses.map(c => `<span style="padding:6px 12px; background:var(--bg-hover); border-radius:20px; font-size:13px;">${c.name}</span>`).join('')}
                    </div>
                    
                    <h4 style="margin:0 0 12px 0;">📋 Recent Grades</h4>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                        <thead>
                            <tr style="background:var(--bg-hover);">
                                <th style="padding:10px; text-align:left;">Assignment</th>
                                <th style="padding:10px; text-align:left;">Course</th>
                                <th style="padding:10px; text-align:center;">Score</th>
                                <th style="padding:10px; text-align:center;">%</th>
                            </tr>
                        </thead>
                        <tbody>${gradesHtml}</tbody>
                    </table>
                    
                    <h4 style="margin:0 0 12px 0;">📅 Upcoming</h4>
                    ${upcomingHtml}
                </div>
            `;
        }).join('');
    
    return `
        <div class="col-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <div>
                    <h2 style="margin:0;">👨‍👩‍👧 Parent Portal</h2>
                    <p style="margin:8px 0 0 0; color:var(--text-muted);">Monitor your student's progress</p>
                </div>
                <button class="btn-zen" onclick="refreshParentPortal()">🔄 Refresh</button>
            </div>
            ${studentsHtml}
        </div>
    `;
}

function refreshParentPortal() {
    render();
    showToast('Portal refreshed!');
}

// ====== TEACHER NOTIFICATIONS CENTER ======
function renderNotificationsCenter() {
    let notifications = [];
    
    let gradeNotifications = db.grades.filter(g => {
        let mat = db.materials.find(m => String(m.id) === String(g.assignId));
        return mat && new Date(g.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).map(g => ({
        type: 'grade',
        message: `New grade for ${db.materials.find(m => String(m.id) === String(g.assignId))?.title}`,
        user: g.user,
        time: g.timestamp
    }));
    
    let submissionNotifications = db.submissions.filter(s => 
        new Date(s.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).map(s => ({
        type: 'submission',
        message: `New submission for ${db.materials.find(m => String(m.id) === String(s.assignId))?.title}`,
        user: s.user,
        time: s.date
    }));
    
    notifications = [...gradeNotifications, ...submissionNotifications].sort((a, b) => new Date(b.time) - new Date(a.time));
    
    let html = notifications.map(n => `
        <div style="padding:16px; border-bottom:1px solid var(--border); display:flex; gap:12px; align-items:start;">
            <div style="width:40px; height:40px; background:${n.type === 'grade' ? '#fef3c7' : '#d1fae5'}; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${n.type === 'grade' ? '📝' : '📤'}
            </div>
            <div style="flex:1;">
                <div style="font-weight:600;">${n.message}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${db.users[n.user]?.name || n.user} • ${new Date(n.time).toLocaleString()}</div>
            </div>
        </div>
    `).join('') || '<p style="padding:40px; text-align:center; color:var(--text-muted);">No recent notifications.</p>';
    
    return `
        <div class="col-main">
            <h2 style="margin:0 0 24px 0;">🔔 Notifications</h2>
            <div class="post-box" style="padding:0;">
                ${html}
            </div>
        </div>
    `;
}

// ====== ATTENDANCE TRACKING ======
function initAttendance() {
    if (!db.attendanceRecords) db.attendanceRecords = [];
}

function renderAttendanceTrack(courseId) {
    initAttendance();
    let course = db.courses.find(c => String(c.id) === String(courseId));
    let students = db.enrollments.filter(e => String(e.courseId) === String(courseId)).map(e => db.users[e.user]).filter(u => u && u.role === 'student');
    
    let records = db.attendanceRecords.filter(r => String(r.courseId) === String(courseId));
    let dates = [...new Set(records.map(r => r.date))].sort();
    
    let attendanceByStudent = {};
    students.forEach(s => {
        attendanceByStudent[s.name] = { present: 0, absent: 0, tardy: 0, total: 0 };
    });
    
    records.forEach(r => {
        if (attendanceByStudent[r.student]) {
            attendanceByStudent[r.student][r.status]++;
            attendanceByStudent[r.student].total++;
        }
    });
    
    let tableHtml = students.map(s => {
        let stats = attendanceByStudent[s.name] || { present: 0, absent: 0, tardy: 0, total: 0 };
        let rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100;
        return `
            <tr>
                <td style="padding:12px; font-weight:600;">${s.name}</td>
                <td style="padding:12px; text-align:center; color:var(--success);">${stats.present}</td>
                <td style="padding:12px; text-align:center; color:var(--danger);">${stats.absent}</td>
                <td style="padding:12px; text-align:center; color:var(--warning);">${stats.tardy}</td>
                <td style="padding:12px; text-align:center;"><strong style="color:${rate >= 90 ? 'var(--success)' : rate >= 70 ? 'var(--warning)' : 'var(--danger)'};">${rate}%</strong></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" style="padding:20px; text-align:center; color:var(--text-muted);">No students enrolled.</td></tr>';
    
    return `
        <div class="post-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0;">📋 Attendance - ${course?.name || 'Course'}</h3>
                <button class="btn-zen primary" onclick="takeAttendance('${courseId}')">+ Take Attendance</button>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:var(--bg-hover);">
                        <th style="padding:12px; text-align:left;">Student</th>
                        <th style="padding:12px; text-align:center;">Present</th>
                        <th style="padding:12px; text-align:center;">Absent</th>
                        <th style="padding:12px; text-align:center;">Tardy</th>
                        <th style="padding:12px; text-align:center;">Rate</th>
                    </tr>
                </thead>
                <tbody>${tableHtml}</tbody>
            </table>
        </div>
    `;
}

function takeAttendance(courseId) {
    let students = db.enrollments.filter(e => String(e.courseId) === String(courseId)).map(e => e.user);
    let today = new Date().toISOString().split('T')[0];
    
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width:500px;" onclick="event.stopPropagation()">
                <h3>📋 Take Attendance - ${today}</h3>
                <div style="max-height:400px; overflow-y:auto;">
                    ${students.map(s => {
                        let user = db.users[s];
                        return `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--bg-hover); border-radius:8px; margin-bottom:8px;">
                                <span style="font-weight:600;">${user?.name || s}</span>
                                <div style="display:flex; gap:8px;">
                                    <button onclick="markAttendance('${courseId}', '${s}', 'present', '${today}')" style="padding:6px 12px; background:#d1fae5; border:none; border-radius:6px; cursor:pointer; color:#065f46;">✓</button>
                                    <button onclick="markAttendance('${courseId}', '${s}', 'absent', '${today}')" style="padding:6px 12px; background:#fee2e2; border:none; border-radius:6px; cursor:pointer; color:#991b1b;">✗</button>
                                    <button onclick="markAttendance('${courseId}', '${s}', 'tardy', '${today}')" style="padding:6px 12px; background:#fef3c7; border:none; border-radius:6px; cursor:pointer; color:#92400e;">T</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Done</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function markAttendance(courseId, student, status, date) {
    let existing = db.attendanceRecords.findIndex(r => 
        String(r.courseId) === String(courseId) && r.student === student && r.date === date
    );
    
    if (existing >= 0) {
        db.attendanceRecords[existing].status = status;
    } else {
        db.attendanceRecords.push({ courseId: String(courseId), student, status, date, markedBy: state.user });
    }
    
    save();
    let btn = event.target;
    let parent = btn.parentElement;
    parent.querySelectorAll('button').forEach(b => b.style.opacity = '0.5');
    btn.style.opacity = '1';
}

// ====== EXTRA FEATURES ======

// Export grades to PDF
function exportGradesPDF(courseId) {
    let course = db.courses.find(c => String(c.id) === String(courseId));
    let students = db.enrollments.filter(e => String(e.courseId) === String(courseId)).map(e => db.users[e.user]).filter(u => u && u.role === 'student');
    let assignments = db.materials.filter(m => String(m.courseId) === String(courseId) && (m.type.includes('Assign') || m.type.includes('Assess')));
    
    let content = `GRADE REPORT\n${course?.name || 'Course'}\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
    content += `Student\t\tAvg\t${assignments.map(a => a.title.substring(0, 15)).join('\t')}\n`;
    content += '─'.repeat(80) + '\n';
    
    students.forEach(s => {
        let earned = 0, possible = 0;
        assignments.forEach(a => {
            let g = db.grades.find(x => String(x.assignId) === String(a.id) && x.user === s.name);
            if (g) { earned += g.score; possible += (a.points || 100); }
        });
        let pct = possible > 0 ? Math.round((earned/possible)*100) : 0;
        content += `${s.name}\t${pct}%\n`;
    });
    
    let blob = new Blob([content], { type: 'text/plain' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `grades_${course?.name || 'course'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Grade report exported!');
}

// Quick attendance report
function attendanceReport() {
    let courseId = prompt('Enter course ID for attendance report:');
    if (!courseId) return;
    
    let records = db.attendanceRecords.filter(r => String(r.courseId) === String(courseId));
    let summary = { present: 0, absent: 0, tardy: 0 };
    records.forEach(r => summary[r.status]++);
    
    alert(`Attendance Summary:\n\nPresent: ${summary.present}\nAbsent: ${summary.absent}\nTardy: ${summary.tardy}\n\nTotal Records: ${records.length}`);
}

// Mass message to class
function massMessage() {
    let courseId = state.courseId;
    if (!courseId) {
        showToast('Please open a course first');
        return;
    }
    
    let students = db.enrollments.filter(e => String(e.courseId) === String(courseId)).map(e => e.user);
    let message = prompt('Enter message to send to all students:');
    if (!message) return;
    
    students.forEach(student => {
        let conv = db.conversations.find(c => c.participants.includes(state.user) && c.participants.includes(student));
        if (conv) {
            conv.messages.push({ from: state.user, text: message, timestamp: Date.now() });
            conv.lastMessage = message;
            conv.updatedAt = new Date().toISOString();
        } else {
            let newConvId = 'conv_' + Date.now();
            db.conversations.push({
                id: newConvId,
                participants: [state.user, student],
                messages: [{ from: state.user, text: message, timestamp: Date.now() }],
                lastMessage: message,
                updatedAt: new Date().toISOString()
            });
        }
    });
    
    save();
    showToast(`Message sent to ${students.length} students!`);
}

// Progress bar for courses
function renderCourseProgress() {
    let myCourses = db.courses.filter(c => 
        db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(c.id))
    );
    
    return myCourses.map(course => {
        let assignments = db.materials.filter(m => 
            String(m.courseId) === String(course.id) && (m.type.includes('Assign') || m.type.includes('Assess'))
        );
        let completed = assignments.filter(a => 
            db.submissions.some(s => String(s.assignId) === String(a.id) && s.user === state.user && s.status !== 'draft')
        ).length;
        let pct = assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0;
        
        return `
            <div style="padding:16px; background:var(--bg-hover); border-radius:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-weight:600;">${course.name}</span>
                    <span style="color:var(--primary);">${pct}%</span>
                </div>
                <div style="height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--accent)); border-radius:4px;"></div>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${completed}/${assignments.length} completed</div>
            </div>
        `;
    }).join('');
}

// ====== LOGIN ======
function renderLogin() {
    let school = db.schools[0];
    return `
    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:linear-gradient(135deg, ${school.primaryColor} 0%, ${school.secondaryColor} 100%); position:relative; overflow:hidden;">
        <div style="position:absolute; top:-50%; left:-50%; width:200%; height:200%; background: radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%);"></div>
        <div style="background:white; padding:48px; border-radius:20px; text-align:center; width:420px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); position:relative; z-index:1;">
            <div style="width:80px; height:80px; background:linear-gradient(135deg, ${school.primaryColor}, ${school.secondaryColor}); border-radius:20px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; font-size:40px; box-shadow: 0 8px 20px ${school.primaryColor}40;">
                ${school.logo ? `<img src="${school.logo}" style="width:50px; height:50px; border-radius:12px;">` : '🎓'}
            </div>
            <h1 style="color:${school.primaryColor}; margin:0 0 8px 0; font-size:32px; font-family:'Nunito', sans-serif;">${school.name}</h1>
            <p style="color:#888; margin:0 0 32px 0; font-size:14px;">${school.tagline || 'Sign in to continue'}</p>
            <input type="text" id="user" placeholder="Username" value="piercesn" style="width:100%; padding:16px; margin-bottom:16px; box-sizing:border-box; border:2px solid #e2e8f0; border-radius:12px; font-size:16px; transition:all 0.2s;">
            <input type="password" id="pass" placeholder="Password" value="dt466e" style="width:100%; padding:16px; margin-bottom:24px; box-sizing:border-box; border:2px solid #e2e8f0; border-radius:12px; font-size:16px; transition:all 0.2s;">
            <button class="btn-zen primary" style="width:100%; font-size:18px; padding:16px; border-radius:12px; font-weight:700;" onclick="login()">Sign In →</button>
            <p id="err" style="color:#ef4444; font-size:14px; margin-top:16px; font-weight:500;"></p>
            <div style="margin-top:20px; padding-top:20px; border-top:1px solid #e2e8f0;">
                <p style="color:#666; font-size:13px; margin-bottom:12px;">Don't have an account?</p>
                <button class="btn-zen" style="width:100%; padding:12px;" onclick="renderSignup()">Create Account</button>
            </div>
        </div>
    </div>`;
}

function login() {
    let u = document.getElementById('user').value; let p = document.getElementById('pass').value;
    if (db.users[u] && db.users[u].pass === p) { state.user = u; navigate('dashboard'); } 
    else { document.getElementById('err').innerText = "Invalid credentials."; }
}

function logout(e) { if(e) e.preventDefault(); state.user = null; render(); }

// ====== SIGNUP ======
function renderSignup() {
    let school = db.schools[0];
    let schoolOptions = db.schools
        .filter(s => s.name.toLowerCase() !== 'example')
        .map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    if (!schoolOptions) {
        schoolOptions = '<option value="">No schools available</option>';
    }
    
    document.getElementById('root').innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:100vh; background:linear-gradient(135deg, ${school.primaryColor} 0%, ${school.secondaryColor} 100%); position:relative; overflow:hidden;">
        <div style="position:absolute; top:-50%; left:-50%; width:200%; height:200%; background: radial-gradient(circle at 70% 80%, rgba(255,255,255,0.1) 0%, transparent 50%);"></div>
        <div style="background:white; padding:48px; border-radius:20px; text-align:center; width:480px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); position:relative; z-index:1;">
            <button onclick="render()" style="position:absolute; top:16px; left:16px; background:none; border:none; font-size:20px; cursor:pointer; color:#666;">← Back</button>
            <div style="width:80px; height:80px; background:linear-gradient(135deg, ${school.primaryColor}, ${school.secondaryColor}); border-radius:20px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; font-size:40px;">
                🎓
            </div>
            <h1 style="color:${school.primaryColor}; margin:0 0 8px 0; font-size:28px; font-family:'Nunito', sans-serif;">Create Account</h1>
            <p style="color:#888; margin:0 0 32px 0; font-size:14px;">Join your school's learning platform</p>
            
            <div id="signupError" style="color:#ef4444; font-size:14px; margin-bottom:16px; display:none;"></div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div style="text-align:left;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">First Name *</label>
                    <input type="text" id="signupFirstName" placeholder="John" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px; box-sizing:border-box;">
                </div>
                <div style="text-align:left;">
                    <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">Last Name *</label>
                    <input type="text" id="signupLastName" placeholder="Doe" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px; box-sizing:border-box;">
                </div>
            </div>
            
            <div style="margin-bottom:16px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">Role *</label>
                <select id="signupRole" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px;">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>
            
            <div style="margin-bottom:16px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">School *</label>
                <div style="display:flex; gap:10px;">
                    <select id="signupSchool" style="flex:1; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px;">
                        ${schoolOptions}
                    </select>
                    <button type="button" onclick="renderCreateSchool()" style="padding:14px 20px; background:#f0f0f0; border:2px solid #e2e8f0; border-radius:10px; cursor:pointer; font-size:14px; white-space:nowrap;">+ New School</button>
                </div>
            </div>
            
            <div style="margin-bottom:16px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">Username *</label>
                <input type="text" id="signupUsername" placeholder="johndoe123" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px;">
            </div>
            
            <div style="margin-bottom:24px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">Password *</label>
                <input type="password" id="signupPassword" placeholder="Create a secure password" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px;">
            </div>
            
            <button class="btn-zen primary" style="width:100%; font-size:18px; padding:16px; border-radius:12px; font-weight:700;" onclick="processSignup()">Create Account</button>
            
            <p style="color:#888; font-size:12px; margin-top:20px;">
                By creating an account, you agree to your school's data policies.
            </p>
        </div>
    </div>`;
}

function processSignup() {
    let firstName = document.getElementById('signupFirstName').value.trim();
    let lastName = document.getElementById('signupLastName').value.trim();
    let role = document.getElementById('signupRole').value;
    let schoolId = document.getElementById('signupSchool').value;
    let username = document.getElementById('signupUsername').value.trim();
    let password = document.getElementById('signupPassword').value;
    
    let error = document.getElementById('signupError');
    
    if (!firstName || !lastName || !username || !password) {
        error.textContent = "Please fill in all required fields.";
        error.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        error.textContent = "Password must be at least 6 characters.";
        error.style.display = 'block';
        return;
    }
    
    if (db.users[username]) {
        error.textContent = "Username already exists. Please choose another.";
        error.style.display = 'block';
        return;
    }
    
    let fullName = firstName + ' ' + lastName;
    
    db.users[username] = {
        pass: password,
        role: role,
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        schoolId: schoolId,
        createdAt: new Date().toISOString()
    };
    
    save();
    
    state.user = username;
    showToast('Account created successfully!');
    navigate('dashboard');
}

// ====== CREATE SCHOOL ======
function renderCreateSchool() {
    let school = db.schools[0];
    
    document.getElementById('root').innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; min-height:100vh; background:linear-gradient(135deg, ${school.primaryColor} 0%, ${school.secondaryColor} 100%); position:relative; overflow:hidden;">
        <div style="position:absolute; top:-50%; left:-50%; width:200%; height:200%; background: radial-gradient(circle at 70% 80%, rgba(255,255,255,0.1) 0%, transparent 50%);"></div>
        <div style="background:white; padding:48px; border-radius:20px; text-align:center; width:500px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); position:relative; z-index:1;">
            <button onclick="renderSignup()" style="position:absolute; top:16px; left:16px; background:none; border:none; font-size:20px; cursor:pointer; color:#666;">← Back</button>
            <div style="width:80px; height:80px; background:linear-gradient(135deg, ${school.primaryColor}, ${school.secondaryColor}); border-radius:20px; margin:0 auto 20px; display:flex; align-items:center; justify-content:center; font-size:40px;">
                🏫
            </div>
            <h1 style="color:${school.primaryColor}; margin:0 0 8px 0; font-size:28px; font-family:'Nunito', sans-serif;">Create New School</h1>
            <p style="color:#888; margin:0 0 32px 0; font-size:14px;">Set up a new learning institution</p>
            
            <div id="schoolError" style="color:#ef4444; font-size:14px; margin-bottom:16px; display:none;"></div>
            
            <div style="margin-bottom:16px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">School Name *</label>
                <input type="text" id="newSchoolName" placeholder="e.g., Spring Valley High School" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px; box-sizing:border-box;">
            </div>
            
            <div style="margin-bottom:16px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">Tagline</label>
                <input type="text" id="newSchoolTagline" placeholder="e.g., Excellence in Education" style="width:100%; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px; box-sizing:border-box;">
            </div>
            
            <div style="margin-bottom:16px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">Primary Color</label>
                <div style="display:flex; gap:12px; align-items:center;">
                    <input type="color" id="newSchoolColor" value="#6366f1" style="width:50px; height:50px; border:none; border-radius:10px; cursor:pointer;">
                    <input type="text" id="newSchoolColorHex" value="#6366f1" placeholder="#6366f1" style="flex:1; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px; font-family:monospace;">
                </div>
            </div>
            
            <div style="margin-bottom:24px; text-align:left;">
                <label style="display:block; font-size:13px; font-weight:600; color:#333; margin-bottom:6px; text-align:left;">Secondary Color</label>
                <div style="display:flex; gap:12px; align-items:center;">
                    <input type="color" id="newSchoolColor2" value="#ec4899" style="width:50px; height:50px; border:none; border-radius:10px; cursor:pointer;">
                    <input type="text" id="newSchoolColor2Hex" value="#ec4899" placeholder="#ec4899" style="flex:1; padding:14px; border:2px solid #e2e8f0; border-radius:10px; font-size:15px; font-family:monospace;">
                </div>
            </div>
            
            <div style="margin-bottom:24px; padding:16px; background:#f8f9fc; border-radius:10px; border:2px dashed #e2e8f0;">
                <h4 style="margin:0 0 8px 0; font-size:14px; color:#333;">Preview</h4>
                <div id="schoolPreview" style="padding:16px; background:linear-gradient(135deg, #6366f1, #ec4899); border-radius:8px; color:white;">
                    <div style="font-weight:700; font-size:18px;" id="previewSchoolName">School Name</div>
                    <div style="font-size:13px; opacity:0.9;" id="previewSchoolTagline">Your tagline here</div>
                </div>
            </div>
            
            <button class="btn-zen primary" style="width:100%; font-size:18px; padding:16px; border-radius:12px; font-weight:700;" onclick="processCreateSchool()">Create School</button>
            
            <p style="color:#888; font-size:12px; margin-top:16px;">
                The first admin account will be created automatically.
            </p>
        </div>
    </div>
    <script>
        document.getElementById('newSchoolName').addEventListener('input', function(e) {
            document.getElementById('previewSchoolName').textContent = e.target.value || 'School Name';
        });
        document.getElementById('newSchoolTagline').addEventListener('input', function(e) {
            document.getElementById('previewSchoolTagline').textContent = e.target.value || 'Your tagline here';
        });
        document.getElementById('newSchoolColor').addEventListener('input', function(e) {
            document.getElementById('newSchoolColorHex').value = e.target.value;
            updatePreviewGradient();
        });
        document.getElementById('newSchoolColorHex').addEventListener('input', function(e) {
            document.getElementById('newSchoolColor').value = e.target.value;
            updatePreviewGradient();
        });
        document.getElementById('newSchoolColor2').addEventListener('input', function(e) {
            document.getElementById('newSchoolColor2Hex').value = e.target.value;
            updatePreviewGradient();
        });
        document.getElementById('newSchoolColor2Hex').addEventListener('input', function(e) {
            document.getElementById('newSchoolColor2').value = e.target.value;
            updatePreviewGradient();
        });
        function updatePreviewGradient() {
            let c1 = document.getElementById('newSchoolColorHex').value;
            let c2 = document.getElementById('newSchoolColor2Hex').value;
            document.getElementById('schoolPreview').style.background = 'linear-gradient(135deg, ' + c1 + ', ' + c2 + ')';
        }
    </script>`;
}

function processCreateSchool() {
    let name = document.getElementById('newSchoolName').value.trim();
    let tagline = document.getElementById('newSchoolTagline').value.trim();
    let primaryColor = document.getElementById('newSchoolColorHex').value || '#6366f1';
    let secondaryColor = document.getElementById('newSchoolColor2Hex').value || '#ec4899';
    
    let error = document.getElementById('schoolError');
    
    if (!name) {
        error.textContent = "Please enter a school name.";
        error.style.display = 'block';
        return;
    }
    
    let normalizedName = name.toLowerCase();
    if (normalizedName === 'example') {
        error.textContent = 'School name "Example" is reserved and cannot be used.';
        error.style.display = 'block';
        return;
    }
    
    let duplicateExists = db.schools.some(s => s.name.toLowerCase() === normalizedName);
    if (duplicateExists) {
        error.textContent = 'A school with this name already exists. Please choose a different name.';
        error.style.display = 'block';
        return;
    }
    
    let schoolId = 'school_' + Date.now();
    let adminUsername = name.toLowerCase().replace(/\s+/g, '_') + '_admin';
    let adminPassword = 'admin123';
    
    let newSchool = {
        id: schoolId,
        name: name,
        tagline: tagline,
        logo: "",
        primaryColor: primaryColor,
        secondaryColor: secondaryColor,
        features: {
            messaging: true,
            calendar: true,
            announcements: true,
            progressTracking: true,
            classRankings: true,
            gpaCalculator: true,
            gradeChart: true,
            badges: true,
            darkMode: true
        },
        createdAt: new Date().toISOString()
    };
    
    db.schools.push(newSchool);
    
    db.users[adminUsername] = {
        pass: adminPassword,
        role: 'admin',
        name: name + ' Admin',
        firstName: name,
        lastName: 'Admin',
        schoolId: schoolId,
        createdAt: new Date().toISOString()
    };
    
    save();
    
    alert('School "' + name + '" created successfully!\n\nAdmin Username: ' + adminUsername + '\nAdmin Password: ' + adminPassword + '\n\nPlease save these credentials!');
    
    renderSignup();
    showToast('School created! You can now select it and create your account.');
}

// ====== CALENDAR VIEW ======
function renderCalendar() {
    let currentDate = new Date();
    let month = state.calendarMonth || currentDate.getMonth();
    let year = state.calendarYear || currentDate.getFullYear();
    
    let firstDay = new Date(year, month, 1).getDay();
    let daysInMonth = new Date(year, month + 1, 0).getDate();
    let monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    let events = getCalendarEvents();
    
    let calendarDays = '';
    for (let i = 0; i < firstDay; i++) {
        calendarDays += '<div style="padding:10px; background:var(--bg-hover); opacity:0.5;"></div>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        let dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let dayEvents = events.filter(e => e.date === dateStr);
        let isToday = currentDate.getDate() === day && currentDate.getMonth() === month && currentDate.getFullYear() === year;
        let hasEvent = dayEvents.length > 0;
        
        calendarDays += `
            <div style="padding:10px; min-height:80px; background:${hasEvent ? 'linear-gradient(135deg, #e8f0fe 0%, #d4e4fd 100%)' : 'white'}; border:1px solid var(--border); border-radius:8px; cursor:pointer; ${isToday ? 'border:2px solid var(--primary); box-shadow:0 0 0 3px rgba(99,102,241,0.2);' : ''}" onclick="showDayDetails('${dateStr}')">
                <div style="font-weight:700; font-size:16px; color:${isToday ? 'var(--primary)' : 'var(--text-main)'}; margin-bottom:4px;">${day}</div>
                ${dayEvents.slice(0, 2).map(e => `<div style="font-size:10px; padding:2px 6px; background:${e.type === 'assignment' ? '#fef3c7' : e.type === 'event' ? '#d1fae5' : '#e3f2fd'}; border-radius:4px; margin-bottom:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.title}</div>`).join('')}
                ${dayEvents.length > 2 ? `<div style="font-size:10px; color:var(--text-muted);">+${dayEvents.length - 2} more</div>` : ''}
            </div>`;
    }
    
    return `
        <div class="col-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="margin:0;">📅 Calendar</h2>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button class="btn-zen" onclick="prevMonth()">← Prev</button>
                    <span style="font-size:20px; font-weight:700; min-width:180px; text-align:center;">${monthNames[month]} ${year}</span>
                    <button class="btn-zen" onclick="nextMonth()">Next →</button>
                </div>
            </div>
            <div class="post-box" style="padding:0; overflow:hidden;">
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); background:var(--bg-hover); border-bottom:2px solid var(--border);">
                    ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div style="padding:12px; text-align:center; font-weight:700; color:var(--text-secondary);">${d}</div>`).join('')}
                </div>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:0;">
                    ${calendarDays}
                </div>
            </div>
            <div style="margin-top:20px; display:flex; gap:16px; flex-wrap:wrap;">
                <div style="padding:8px 16px; background:#fef3c7; border-radius:8px; font-size:13px;">🟡 Assignment Due</div>
                <div style="padding:8px 16px; background:#d1fae5; border-radius:8px; font-size:13px;">🟢 Event</div>
                <div style="padding:8px 16px; background:#e3f2fd; border-radius:8px; font-size:13px;">🔵 Reminder</div>
                <button class="btn-zen primary" onclick="openModal('addEvent')" style="margin-left:auto;">+ Add Event</button>
            </div>
        </div>
    `;
}

function getCalendarEvents() {
    let events = [];
    
    db.materials.filter(m => m.due).forEach(m => {
        events.push({
            date: m.due,
            title: m.title,
            type: 'assignment',
            id: m.id
        });
    });
    
    if (db.events) {
        db.events.forEach(e => {
            events.push({
                date: e.date,
                title: e.title,
                type: e.type || 'event',
                id: e.id
            });
        });
    }
    
    return events;
}

function prevMonth() {
    if (!state.calendarMonth) state.calendarMonth = new Date().getMonth();
    if (!state.calendarYear) state.calendarYear = new Date().getFullYear();
    state.calendarMonth--;
    if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
    render();
}

function nextMonth() {
    if (!state.calendarMonth) state.calendarMonth = new Date().getMonth();
    if (!state.calendarYear) state.calendarYear = new Date().getFullYear();
    state.calendarMonth++;
    if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
    render();
}

function showDayDetails(dateStr) {
    let events = getCalendarEvents().filter(e => e.date === dateStr);
    let formattedDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let eventsHtml = events.map(e => `
        <div style="padding:16px; background:${e.type === 'assignment' ? '#fef3c7' : e.type === 'event' ? '#d1fae5' : '#e3f2fd'}; border-radius:8px; margin-bottom:8px;">
            <div style="font-weight:700; margin-bottom:4px;">${e.title}</div>
            <div style="font-size:12px; text-transform:capitalize;">${e.type}</div>
        </div>
    `).join('') || '<p style="color:var(--text-muted);">No events on this day.</p>';
    
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>📅 ${formattedDate}</h3>
                <div style="margin:20px 0;">
                    ${eventsHtml}
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Close</button>
                    <button class="btn-zen primary" onclick="closeModal(); openModal('addEvent')">+ Add Event</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function saveCalendarEvent() {
    let title = document.getElementById('eventTitle').value.trim();
    let date = document.getElementById('eventDate').value;
    let type = document.getElementById('eventType').value;
    
    if (!title || !date) {
        showToast('Please fill in all fields');
        return;
    }
    
    if (!db.events) db.events = [];
    
    db.events.push({
        id: 'event_' + Date.now(),
        title,
        date,
        type,
        createdBy: state.user
    });
    
    save();
    closeModal();
    render();
    showToast('Event added to calendar!');
}

function processCreateGroup() {
    let name = document.getElementById('groupName').value.trim();
    let description = document.getElementById('groupDesc').value.trim();
    let icon = document.getElementById('groupIcon').value.trim() || '👥';
    
    if (!name) {
        showToast('Please enter a group name');
        return;
    }
    
    initGroups();
    let groupId = 'group_' + Date.now();
    db.groups.push({ id: groupId, name, description, icon, createdBy: state.user, createdAt: new Date().toISOString() });
    db.groupMembers.push({ groupId, user: state.user, joinedAt: new Date().toISOString(), role: 'admin' });
    
    save();
    closeModal();
    render();
    showToast('Group created!');
}

function processAddResource() {
    let title = document.getElementById('resourceTitle').value.trim();
    let url = document.getElementById('resourceUrl').value.trim();
    
    if (!title || !url) {
        showToast('Please fill in all fields');
        return;
    }
    
    initResources();
    let type = 'file';
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) type = 'link';
    else if (url.includes('.pdf')) type = 'pdf';
    else if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'video';
    
    db.resources.push({ id: 'res_' + Date.now(), title, url, type, user: state.user, addedAt: new Date().toISOString(), shared: false });
    
    save();
    closeModal();
    render();
    showToast('Resource added!');
}

// ====== MESSAGING SYSTEM ======
function initMessages() {
    if (!db.messages) db.messages = [];
    if (!db.conversations) db.conversations = [];
}

function renderMessages() {
    initMessages();
    let userConversations = db.conversations.filter(c => c.participants.includes(state.user));
    
    let convHtml = userConversations.map(conv => {
        let otherUser = conv.participants.find(p => p !== state.user);
        let otherUserName = db.users[otherUser]?.name || otherUser;
        let lastMsg = conv.lastMessage || 'No messages yet';
        let unread = conv.unread?.[state.user] || 0;
        
        return `
            <div style="padding:16px; border-bottom:1px solid var(--border); cursor:pointer; background:${unread > 0 ? '#f0f4ff' : 'white'}; hover:background:var(--bg-hover);" onclick="openConversation('${conv.id}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:48px; height:48px; background:linear-gradient(135deg, var(--primary), var(--accent)); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:18px;">
                        ${otherUserName.charAt(0).toUpperCase()}
                    </div>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between;">
                            <strong>${otherUserName}</strong>
                            <span style="font-size:11px; color:var(--text-muted);">${conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : ''}</span>
                        </div>
                        <div style="font-size:13px; color:var(--text-muted); display:flex; justify-content:space-between;">
                            <span>${lastMsg.substring(0, 30)}${lastMsg.length > 30 ? '...' : ''}</span>
                            ${unread > 0 ? `<span style="background:var(--primary); color:white; padding:2px 8px; border-radius:10px; font-size:11px;">${unread}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('') || '<p style="padding:40px; text-align:center; color:var(--text-muted);">No conversations yet. Start one!</p>';
    
    return `
        <div class="col-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="margin:0;">💬 Messages</h2>
                <button class="btn-zen primary" onclick="openModal('newMessage')">+ New Message</button>
            </div>
            <div style="display:grid; grid-template-columns:300px 1fr; gap:20px; height:calc(100vh - 200px);">
                <div class="post-box" style="padding:0; overflow-y:auto; height:100%;">
                    ${convHtml}
                </div>
                <div class="post-box" style="display:flex; flex-direction:column; padding:0;">
                    <div style="padding:16px; border-bottom:1px solid var(--border); background:var(--bg-hover);">
                        <p style="text-align:center; color:var(--text-muted); margin:0;">Select a conversation or start a new one</p>
                    </div>
                    <div id="messageArea" style="flex:1; padding:20px; overflow-y:auto;"></div>
                </div>
            </div>
        </div>
    `;
}

function getUnreadMessageCount() {
    initMessages();
    let count = 0;
    db.conversations.filter(c => c.participants.includes(state.user)).forEach(c => {
        count += c.unread?.[state.user] || 0;
    });
    return count;
}

function openConversation(convId) {
    let conv = db.conversations.find(c => c.id === convId);
    if (!conv) return;
    
    conv.unread = conv.unread || {};
    conv.unread[state.user] = 0;
    save();
    
    let otherUser = conv.participants.find(p => p !== state.user);
    let otherUserName = db.users[otherUser]?.name || otherUser;
    
    let messagesHtml = conv.messages?.map(msg => {
        let isMe = msg.from === state.user;
        return `
            <div style="display:flex; justify-content:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:12px;">
                <div style="max-width:70%; padding:12px 16px; background:${isMe ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--bg-hover)'}; color:${isMe ? 'white' : 'var(--text-main)'}; border-radius:16px; ${isMe ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'}">
                    <div style="margin-bottom:4px;">${msg.text}</div>
                    <div style="font-size:10px; opacity:0.7; text-align:right;">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
            </div>
        `;
    }).join('') || '<p style="text-align:center; color:var(--text-muted);">No messages yet.</p>';
    
    document.getElementById('messageArea').innerHTML = `
        <div style="padding:12px 16px; background:var(--bg-hover); border-radius:8px; margin-bottom:16px;">
            <strong>${otherUserName}</strong>
        </div>
        <div style="flex:1; overflow-y:auto; margin-bottom:16px;">
            ${messagesHtml}
        </div>
        <div style="display:flex; gap:10px;">
            <input type="text" id="msgInput" placeholder="Type a message..." style="flex:1; padding:12px; border-radius:24px;" onkeyup="if(event.key==='Enter')sendMessage('${convId}')">
            <button class="btn-zen primary" onclick="sendMessage('${convId}')" style="padding:12px 20px; border-radius:24px;">Send</button>
        </div>
    `;
    
    document.getElementById('messageArea').scrollTop = document.getElementById('messageArea').scrollHeight;
}

function sendMessage(convId) {
    let text = document.getElementById('msgInput').value.trim();
    if (!text) return;
    
    let conv = db.conversations.find(c => c.id === convId);
    if (!conv) return;
    
    if (!conv.messages) conv.messages = [];
    
    conv.messages.push({
        from: state.user,
        text: text,
        timestamp: Date.now()
    });
    
    conv.lastMessage = text;
    conv.updatedAt = new Date().toISOString();
    conv.unread = conv.unread || {};
    conv.participants.forEach(p => {
        if (p !== state.user) conv.unread[p] = (conv.unread[p] || 0) + 1;
    });
    
    save();
    openConversation(convId);
}

function startNewConversation(withUser) {
    let users = Object.keys(db.users).filter(u => u !== state.user);
    let userOptions = users.map(u => `<option value="${u}">${db.users[u].name} (${u})</option>`).join('');
    
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>💬 New Message</h3>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; margin-bottom:6px;">Select Recipient</label>
                    <select id="msgRecipient" style="width:100%; padding:12px; border-radius:8px;">
                        ${userOptions}
                    </select>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block; font-size:13px; font-weight:600; margin-bottom:6px;">Message</label>
                    <textarea id="msgText" rows="4" style="width:100%; padding:12px; border-radius:8px;" placeholder="Type your message..."></textarea>
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Cancel</button>
                    <button class="btn-zen primary" onclick="createConversation()">Send</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function createConversation() {
    let recipient = document.getElementById('msgRecipient').value;
    let text = document.getElementById('msgText').value.trim();
    
    if (!recipient || !text) {
        showToast('Please select a recipient and enter a message');
        return;
    }
    
    let existingConv = db.conversations.find(c => 
        c.participants.includes(state.user) && c.participants.includes(recipient)
    );
    
    if (existingConv) {
        if (!existingConv.messages) existingConv.messages = [];
        existingConv.messages.push({ from: state.user, text, timestamp: Date.now() });
        existingConv.lastMessage = text;
        existingConv.updatedAt = new Date().toISOString();
        save();
        closeModal();
        navigate('messages');
        return;
    }
    
    let convId = 'conv_' + Date.now();
    db.conversations.push({
        id: convId,
        participants: [state.user, recipient],
        messages: [{ from: state.user, text, timestamp: Date.now() }],
        lastMessage: text,
        updatedAt: new Date().toISOString(),
        unread: { [recipient]: 1 }
    });
    
    save();
    closeModal();
    navigate('messages');
    showToast('Message sent!');
}

// ====== ACHIEVEMENTS & BADGES ======
function initAchievements() {
    if (!db.achievements) db.achievements = [];
    if (!db.unlockedBadges) db.unlockedBadges = [];
}

function getAchievementBadge(type) {
    let badges = {
        'first_course': { icon: '🎓', name: 'First Steps', desc: 'Joined your first course' },
        'perfect_score': { icon: '⭐', name: 'Perfect Score', desc: 'Got 100% on an assignment' },
        'early_bird': { icon: '🐦', name: 'Early Bird', desc: 'Submitted before deadline' },
        'streak_7': { icon: '🔥', name: 'On Fire', desc: '7 day login streak' },
        'helpful': { icon: '🤝', name: 'Helpful', desc: 'Helped 5 classmates' },
        'organized': { icon: '📋', name: 'Organized', desc: 'Completed all todos' },
        'grade_teacher': { icon: '📚', name: 'Educator', desc: 'Graded 50 assignments' }
    };
    return badges[type] || { icon: '🏅', name: type, desc: '' };
}

function checkAchievements() {
    initAchievements();
    
    let myCourses = db.enrollments.filter(e => String(e.user) === String(state.user)).length;
    if (myCourses >= 1 && !db.unlockedBadges.includes('first_course')) {
        unlockBadge('first_course');
    }
}

function unlockBadge(badge) {
    if (db.unlockedBadges.includes(badge)) return;
    db.unlockedBadges.push(badge);
    save();
    showToast('🏅 Achievement Unlocked: ' + getAchievementBadge(badge).name);
}

function renderBadges() {
    initAchievements();
    let allBadges = ['first_course', 'perfect_score', 'early_bird', 'streak_7', 'helpful', 'organized', 'grade_teacher'];
    
    let badgesHtml = allBadges.map(b => {
        let info = getAchievementBadge(b);
        let unlocked = db.unlockedBadges.includes(b);
        return `
            <div style="text-align:center; padding:20px; background:${unlocked ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'var(--bg-hover)'}; border-radius:12px; opacity:${unlocked ? 1 : 0.5}; transition:all 0.3s;">
                <div style="font-size:40px; ${unlocked ? '' : 'filter:grayscale(100%);'}">${info.icon}</div>
                <div style="font-weight:700; margin-top:8px;">${info.name}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${info.desc}</div>
                ${unlocked ? '<div style="margin-top:8px; color:var(--success); font-size:11px;">✓ Unlocked</div>' : '<div style="margin-top:8px; color:var(--text-muted); font-size:11px;">🔒 Locked</div>'}
            </div>
        `;
    }).join('');
    
    return `
        <div class="col-main">
            <h2 style="margin:0 0 24px 0;">🏅 My Achievements</h2>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:16px;">
                ${badgesHtml}
            </div>
        </div>
    `;
}

// ====== ANNOUNCEMENTS ======
function renderAnnouncements(courseId) {
    let announcements = db.updates.filter(u => u.type === 'announcement' && (!courseId || u.courseId === courseId));
    let isTeacher = db.users[state.user].role === 'admin' || db.users[state.user].role === 'teacher';
    
    let announceHtml = announcements.map(a => `
        <div style="padding:20px; background:linear-gradient(135deg, #fef3c7, #fde68a); border-radius:12px; margin-bottom:12px; border-left:4px solid #f59e0b;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:36px; height:36px; background:#f59e0b; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700;">
                        ${(db.users[a.user]?.name || '?').charAt(0)}
                    </div>
                    <div>
                        <div style="font-weight:700;">${db.users[a.user]?.name || a.user}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${new Date(a.timestamp).toLocaleDateString()}</div>
                    </div>
                </div>
                ${isTeacher ? `<button class="btn-zen" onclick="deleteAnnouncement('${a.id}')" style="padding:4px 10px; font-size:11px;">🗑️</button>` : ''}
            </div>
            <div style="font-size:15px; line-height:1.6;">${a.message}</div>
        </div>
    `).join('') || '<p style="text-align:center; color:var(--text-muted); padding:40px;">No announcements yet.</p>';
    
    return `
        <div class="col-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="margin:0;">📢 Announcements</h2>
                ${isTeacher ? `<button class="btn-zen primary" onclick="postAnnouncement()">+ Post Announcement</button>` : ''}
            </div>
            ${announceHtml}
        </div>
    `;
}

function postAnnouncement() {
    let message = prompt('Enter your announcement:');
    if (!message) return;
    
    db.updates.unshift({
        id: 'ann_' + Date.now(),
        user: state.user,
        type: 'announcement',
        message: message,
        courseId: state.courseId,
        timestamp: new Date().toISOString()
    });
    
    save();
    render();
    showToast('Announcement posted!');
}

function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    db.updates = db.updates.filter(u => u.id !== id);
    save();
    render();
    showToast('Announcement deleted');
}

// ====== COURSE ANALYTICS ======
function renderCourseAnalytics(courseId) {
    let course = db.courses.find(c => String(c.id) === String(courseId));
    if (!course) return '<div>Course not found</div>';
    
    let assignments = db.materials.filter(m => String(m.courseId) === String(courseId) && (m.type.includes('Assign') || m.type.includes('Assess')));
    let submissions = db.submissions.filter(s => {
        let mat = db.materials.find(m => String(m.id) === String(s.assignId));
        return mat && String(mat.courseId) === String(courseId);
    });
    
    let avgCompletion = assignments.length > 0 ? Math.round((submissions.length / (assignments.length * getStudentCount(courseId))) * 100) : 0;
    let gradedCount = submissions.filter(s => db.grades.some(g => String(g.assignId) === String(s.assignId))).length;
    let onTimeCount = submissions.filter(s => {
        let mat = db.materials.find(m => String(m.id) === String(s.assignId));
        return mat && mat.due && new Date(s.date) <= new Date(mat.due);
    }).length;
    
    return `
        <div class="col-main">
            <h2 style="margin:0 0 24px 0;">📊 ${course.name} Analytics</h2>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin-bottom:24px;">
                <div class="stats-card">
                    <h3>${assignments.length}</h3>
                    <p>Total Assignments</p>
                </div>
                <div class="stats-card">
                    <h3>${getStudentCount(courseId)}</h3>
                    <p>Enrolled Students</p>
                </div>
                <div class="stats-card">
                    <h3>${submissions.length}</h3>
                    <p>Submissions</p>
                </div>
                <div class="stats-card">
                    <h3 style="color:${avgCompletion >= 70 ? 'var(--success)' : 'var(--warning)'};">${avgCompletion}%</h3>
                    <p>Completion Rate</p>
                </div>
            </div>
            <div class="post-box">
                <h3 style="margin-top:0;">Submission Statistics</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                    <div>
                        <h4 style="margin:0 0 12px 0;">On-Time vs Late</h4>
                        <div style="display:flex; height:30px; border-radius:8px; overflow:hidden;">
                            <div style="width:${onTimeCount > 0 ? (onTimeCount / submissions.length * 100) : 0}%; background:var(--success); display:flex; align-items:center; justify-content:center; color:white; font-size:12px;">${onTimeCount} on-time</div>
                            <div style="width:${onTimeCount > 0 ? ((submissions.length - onTimeCount) / submissions.length * 100) : 0}%; background:var(--danger); display:flex; align-items:center; justify-content:center; color:white; font-size:12px;">${submissions.length - onTimeCount} late</div>
                        </div>
                    </div>
                    <div>
                        <h4 style="margin:0 0 12px 0;">Graded vs Ungraded</h4>
                        <div style="display:flex; height:30px; border-radius:8px; overflow:hidden;">
                            <div style="width:${gradedCount > 0 ? (gradedCount / submissions.length * 100) : 0}%; background:var(--primary); display:flex; align-items:center; justify-content:center; color:white; font-size:12px;">${gradedCount} graded</div>
                            <div style="width:${gradedCount > 0 ? ((submissions.length - gradedCount) / submissions.length * 100) : 0}%; background:var(--text-muted); display:flex; align-items:center; justify-content:center; color:white; font-size:12px;">${submissions.length - gradedCount} pending</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getStudentCount(courseId) {
    return db.enrollments.filter(e => String(e.courseId) === String(courseId)).length;
}

// ====== BULK IMPORT ======
function openBulkImport() {
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width:600px;" onclick="event.stopPropagation()">
                <h3>📥 Bulk Import Students</h3>
                <p style="color:var(--text-secondary); margin-bottom:20px;">Paste student data below (one per line, format: username,password,firstname,lastname)</p>
                <textarea id="bulkImportData" rows="10" style="width:100%; padding:12px; border-radius:8px; font-family:monospace; font-size:12px;" placeholder="john123,pass123,John,Smith
jane456,pass456,Jane,Doe
mike789,pass789,Mike,Jones"></textarea>
                <div style="margin-top:16px; padding:12px; background:#e8f0fe; border-radius:8px; font-size:13px;">
                    <strong>Format:</strong> username,password,firstname,lastname<br>
                    <strong>Example:</strong> student1,password123,John,Smith
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Cancel</button>
                    <button class="btn-zen primary" onclick="processBulkImport()">Import Students</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function processBulkImport() {
    let data = document.getElementById('bulkImportData').value.trim();
    if (!data) {
        showToast('Please enter student data');
        return;
    }
    
    let lines = data.split('\n');
    let imported = 0;
    let errors = [];
    
    lines.forEach((line, idx) => {
        let parts = line.split(',').map(p => p.trim());
        if (parts.length >= 4) {
            let [username, password, firstname, lastname] = parts;
            
            if (db.users[username]) {
                errors.push(`Line ${idx + 1}: Username "${username}" already exists`);
            } else {
                db.users[username] = {
                    pass: password,
                    role: 'student',
                    name: firstname + ' ' + lastname,
                    firstName: firstname,
                    lastName: lastname,
                    schoolId: db.users[state.user].schoolId,
                    createdAt: new Date().toISOString()
                };
                imported++;
            }
        } else {
            errors.push(`Line ${idx + 1}: Invalid format`);
        }
    });
    
    save();
    closeModal();
    render();
    
    let msg = `Imported ${imported} students successfully!`;
    if (errors.length > 0) {
        msg += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`;
    }
    alert(msg);
}

// Initialize achievements
initAchievements();
initMessages();

function showJoinCode(courseId) {
    let course = db.courses.find(c => String(c.id) === String(courseId));
    if(!course) return;
    alert(`Course Join Code for "${course.name}":\n\n${course.joinCode}\n\nShare this code with students to let them enroll.`);
}

function unsubmitAssignment(assignId) {
    let item = db.materials.find(m => String(m.id) === String(assignId));
    if(item && item.due && new Date() > new Date(item.due)) {
        alert("This assignment is past due and cannot be unsubmit.");
        return;
    }
    let sub = db.submissions.find(s => String(s.assignId) === String(assignId) && String(s.user) === String(state.user));
    if(sub) {
        sub.status = 'draft';
        sub.date = new Date().toLocaleDateString();
        save(); closeModal(); render();
    }
}

function teacherUnsubmit(assignId, studentUser) {
    let sub = db.submissions.find(s => String(s.assignId) === String(assignId) && String(s.user) === String(studentUser));
    if(sub) {
        sub.status = 'draft';
        sub.date = new Date().toLocaleDateString();
        let grade = db.grades.find(g => String(g.assignId) === String(assignId) && String(g.user) === String(studentUser));
        if(grade) {
            db.grades = db.grades.filter(g => !(String(g.assignId) === String(assignId) && String(g.user) === String(studentUser)));
        }
        save(); closeModal(); render();
    }
}

function adminAddUser() {
    let username = document.getElementById('newUserName').value.trim();
    let password = document.getElementById('newUserPass').value;
    let displayName = document.getElementById('newUserDisplayName').value.trim();
    let role = document.getElementById('newUserRole').value;
    
    if(!username || !password || !displayName) {
        alert("Please fill in all fields");
        return;
    }
    if(db.users[username]) {
        alert("Username already exists");
        return;
    }
    
    db.users[username] = {
        pass: password,
        role: role,
        name: displayName,
        schoolId: "1",
        picture: ""
    };
    save(); closeModal(); render();
}

window.adminSaveUser = function(username) {
    let name = document.getElementById('editUserName').value.trim();
    let password = document.getElementById('editUserPass').value;
    let role = document.getElementById('editUserRole').value;
    
    if(!name) {
        alert("Display name is required");
        return;
    }
    
    db.users[username].name = name;
    db.users[username].role = role;
    
    if(password) {
        db.users[username].pass = password;
    }
    
    save(); closeModal(); render();
    showToast('User updated!');
}

function adminDeleteUser(username) {
    if(!confirm(`Delete user "${username}"?`)) return;
    if(username === state.user) {
        alert("You cannot delete yourself");
        return;
    }
    delete db.users[username];
    db.enrollments = db.enrollments.filter(e => e.user !== username);
    save(); render();
}

function saveGrade(assignId, studentUser) {
    let score = Number(document.getElementById('gScore').value);
    if(isNaN(score)) {
        alert("Please enter a valid grade.");
        return;
    }
    let comment = document.getElementById('gComment') ? document.getElementById('gComment').value : '';
    let item = db.materials.find(m => String(m.id) === String(assignId));
    let maxPts = item ? (item.points || 100) : 100;
    if(score > maxPts && !item?.extraCredit) {
        alert(`Grade cannot exceed ${maxPts} points.`);
        return;
    }
    db.grades = db.grades.filter(g => !(String(g.assignId) === String(assignId) && String(g.user) === String(studentUser)));
    db.grades.push({ assignId: String(assignId), user: String(studentUser), score: score, comment: comment, status: 'graded', timestamp: new Date().toISOString() });
    save(); closeModal(); render();
}

window.joinCourse = function() {
    let code = document.getElementById('jCourseCode').value.trim().toUpperCase();
    let error = document.getElementById('joinCourseError');
    
    if (!code) {
        error.textContent = "Please enter a course code.";
        error.style.display = 'block';
        return;
    }
    
    let course = db.courses.find(c => c.joinCode === code);
    
    if (!course) {
        error.textContent = "Course not found. Please check the code and try again.";
        error.style.display = 'block';
        return;
    }
    
    let alreadyEnrolled = db.enrollments.some(e => String(e.courseId) === String(course.id) && e.user === state.user);
    if (alreadyEnrolled) {
        error.textContent = "You are already enrolled in this course.";
        error.style.display = 'block';
        return;
    }
    
    db.enrollments.push({ user: state.user, courseId: course.id });
    save();
    closeModal();
    showToast('Successfully joined ' + course.name + '!');
    navigate('dashboard');
};

// ====== TOPBAR ======
function renderTopbar() {
    let isAdmin = db.users[state.user].role === 'admin';
    let school = db.schools[0];
    let currentTheme = document.body.getAttribute('data-theme') || 'light';
    let headerStyle = school.primaryColor ? 'background: linear-gradient(135deg, ' + school.primaryColor + ' 0%, ' + adjustColor(school.primaryColor, -20) + ' 100%);' : '';
    let notifications = getNotifications();
    let notifBadge = notifications.length > 0 ? '<span style="background:var(--danger); color:white; font-size:10px; padding:2px 6px; border-radius:10px; position:absolute; top:-2px; right:-2px;">' + notifications.length + '</span>' : '';
    let notifList = notifications.length === 0 ? '<div style="padding:20px; text-align:center; color:var(--text-muted);">No new notifications</div>' : notifications.map(function(n) {
        return '<div style="padding:12px 15px; border-bottom:1px solid var(--border);"><div style="font-size:13px; color:var(--text-main);">' + n.message + '</div><div style="font-size:11px; color:var(--text-muted); margin-top:4px;">' + formatTimeAgo(n.time) + '</div></div>';
    }).join('');
    
    return '<div class="zen-header" style="' + headerStyle + '">' +
        '<div class="logo-text" style="cursor:pointer;" onclick="navigate(\'dashboard\')">' + (school.logo ? '<img src="' + school.logo + '" style="height:40px; margin-right:10px;">' : '') + school.name + '</div>' +
        '<div class="top-nav">' +
            '<div class="top-nav-item ' + (['dashboard','course','folder','item'].includes(state.page) ? 'active' : '') + '" onclick="navigate(\'dashboard\')">🏠 Home</div>' +
            '<div class="top-nav-item ' + (state.page === 'groups' ? 'active' : '') + '" onclick="navigate(\'groups\')">👥 Groups</div>' +
            '<div class="top-nav-item ' + (state.page === 'flashcards' || state.page === 'flashcardStudy' ? 'active' : '') + '" onclick="navigate(\'flashcards\')">📚 Flashcards</div>' +
            '<div class="top-nav-item ' + (state.page === 'studyNotes' ? 'active' : '') + '" onclick="navigate(\'studyNotes\')">📝 Notes</div>' +
            '<div class="top-nav-item ' + (state.page === 'calendar' ? 'active' : '') + '" onclick="navigate(\'calendar\')">📅 Calendar</div>' +
            '<div class="top-nav-item ' + (state.page === 'messages' ? 'active' : '') + '" onclick="navigate(\'messages\')">💬 Messages' + (getUnreadMessageCount() > 0 ? ' <span style="background:var(--danger); color:white; padding:1px 6px; border-radius:10px; font-size:10px;">' + getUnreadMessageCount() + '</span>' : '') + '</div>' +
            '<div class="top-nav-item ' + (state.page === 'badges' ? 'active' : '') + '" onclick="navigate(\'badges\')">🏅 Badges</div>' +
            '<div class="top-nav-item ' + (state.page === 'analytics' ? 'active' : '') + '" onclick="navigate(\'analytics\')">📊 Analytics</div>' +
            '<div class="top-nav-item ' + (state.page === 'learningGoals' ? 'active' : '') + '" onclick="navigate(\'learningGoals\')">🎯 Goals</div>' +
            '<div class="top-nav-item ' + (state.page === 'resources' ? 'active' : '') + '" onclick="navigate(\'resources\')">📁 Resources</div>' +
            (isAdmin ? '<div class="top-nav-item ' + (state.page === 'admin' ? 'active' : '') + '" onclick="navigate(\'admin\')">⚙️ Admin</div>' : '') +
        '</div>' +
        '<div style="margin-left:auto; margin-right:20px;">' +
            '<input type="text" id="globalSearch" placeholder="Search..." onkeyup="handleSearch(this.value)" style="padding:8px 14px; border:none; border-radius:20px; width:200px; font-size:13px; background:rgba(255,255,255,0.15); color:white;">' +
            '<div id="searchResults" class="dropdown-panel hidden" style="right:0; top:50px; width:300px; max-height:400px; overflow-y:auto;"></div>' +
        '</div>' +
        '<button onclick="toggleImmersiveReader()" style="background:rgba(255,255,255,0.1); border:none; padding:8px 12px; border-radius:8px; cursor:pointer; color:white; font-size:16px; margin-right:8px;" title="Immersive Reader">📖</button>' +
        '<button onclick="togglePowerBuddy()" style="background:linear-gradient(135deg, rgba(124,58,237,0.5), rgba(168,85,247,0.5)); border:none; padding:8px 12px; border-radius:8px; cursor:pointer; color:white; font-size:16px; margin-right:8px;" title="PowerBuddy AI">🤖</button>' +
        '<button onclick="toggleTheme()" style="background:rgba(255,255,255,0.1); border:none; padding:8px 12px; border-radius:8px; cursor:pointer; color:white; font-size:18px; margin-right:10px;" title="Toggle Theme">' + (currentTheme === 'dark' ? '☀️' : '🌙') + '</button>' +
        '<button onclick="toggleNotifications()" style="position:relative; background:rgba(255,255,255,0.1); border:none; padding:8px 12px; border-radius:8px; cursor:pointer; color:white; font-size:18px; margin-right:10px;" title="Notifications">🔔' + notifBadge + '</button>' +
        '<div class="header-profile" onclick="toggleDropdown(\'userMenuDrop\', event)" title="Click for options">' +
            '<span style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.3); color:white; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold;">' + db.users[state.user].name.charAt(0).toUpperCase() + '</span>' +
            '<span style="margin-left:5px;">' + db.users[state.user].name + '</span>' +
            '<span style="opacity:0.7;">▼</span>' +
        '</div>' +
        '<div id="userMenuDrop" class="dropdown-panel hidden" style="right:10px; top:55px; width:180px;">' +
            '<div style="padding:12px 15px; border-bottom:1px solid var(--border);"><div style="font-weight:700; color:var(--text-main);">' + db.users[state.user].name + '</div><div style="font-size:12px; color:var(--text-muted); text-transform:capitalize;">' + db.users[state.user].role + '</div></div>' +
            '<div style="padding:12px 15px; cursor:pointer; border-bottom:1px solid var(--border);" onclick="openModal(\'userSettings\'); toggleDropdown(\'userMenuDrop\');">⚙️ Settings</div>' +
            '<div style="padding:12px 15px; cursor:pointer; color:var(--danger);" onclick="logout(event)">🚪 Logout</div>' +
        '</div>' +
        '<div id="notifPanel" class="dropdown-panel hidden" style="right:80px; top:60px; width:300px; max-height:400px; overflow-y:auto;">' +
            '<div style="padding:12px 15px; border-bottom:1px solid var(--border); font-weight:700; color:var(--text-main);">Notifications</div>' +
            notifList +
        '</div>' +
    '</div>';
}

function toggleNotifications() {
    document.getElementById('notifPanel').classList.toggle('hidden');
}

function handleSearch(query) {
    var results = document.getElementById('searchResults');
    if (!query || query.length < 2) {
        results.classList.add('hidden');
        return;
    }
    
    var matches = [];
    query = query.toLowerCase();
    
    db.courses.forEach(function(c) {
        if (c.name.toLowerCase().includes(query) || c.section.toLowerCase().includes(query)) {
            matches.push({ type: 'course', id: c.id, title: c.name, subtitle: c.section });
        }
    });
    
    db.materials.forEach(function(m) {
        if (m.title.toLowerCase().includes(query) || (m.desc && m.desc.toLowerCase().includes(query))) {
            var course = db.courses.find(function(x) { return String(x.id) === String(m.courseId); });
            matches.push({ type: 'material', id: m.id, title: m.title, subtitle: course ? course.name : '' });
        }
    });
    
    if (matches.length === 0) {
        results.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No results found</div>';
    } else {
        results.innerHTML = matches.slice(0, 10).map(function(m) {
            return '<div style="padding:12px 15px; cursor:pointer; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px;" onclick="handleSearchResult(\'' + m.type + '\', \'' + m.id + '\')">' +
                '<span style="font-size:18px;">' + (m.type === 'course' ? '📚' : '📄') + '</span>' +
                '<div><div style="font-weight:600; color:var(--text-main); font-size:13px;">' + m.title + '</div>' +
                '<div style="font-size:11px; color:var(--text-muted);">' + m.subtitle + '</div></div></div>';
        }).join('');
    }
    results.classList.remove('hidden');
}

function handleSearchResult(type, id) {
    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('globalSearch').value = '';
    if (type === 'course') navigate('course', id);
    else navigate('item', id);
}

function adjustColor(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function renderPlaceholder(title, text) { return `<div class="col-main"><h2 class="page-title">${title}</h2><div class="post-box" style="text-align:center; color:#777;">${text}</div></div>`; }

// ====== DASHBOARD ======
function renderDashboard() {
    let school = db.schools[0];
    let myCourses = db.courses.filter(c => c.teacher === state.user || db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(c.id)));
    let isAdmin = db.users[state.user].role === 'admin' || db.users[state.user].role === 'teacher';
    let stats = getUserStats();
    let todos = getUserTodos();
    let activities = getRecentActivity();
    let isStudent = db.users[state.user].role === 'student';
    let unreadMessages = getUnreadMessageCount();
    
    let welcomeLinks = `<div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:16px;">
        ${isAdmin ? `<button class="btn-zen primary" onclick="openModal('createCourse')" style="padding:12px 24px;">✨ Create Course</button>` : ''}
        <button class="btn-zen" onclick="openModal('joinCourse')" style="padding:12px 24px;">🎫 Join Course</button>
        <button class="btn-zen" onclick="openModal('userSettings')" style="padding:12px 24px;">👤 Profile</button>
        <button class="btn-zen" onclick="navigate('calendar')" style="padding:12px 24px;">📅 Calendar</button>
        <button class="btn-zen" onclick="navigate('messages')" style="padding:12px 24px;">💬 Messages ${unreadMessages > 0 ? `<span style="background:var(--danger); color:white; padding:2px 8px; border-radius:10px; font-size:11px; margin-left:6px;">${unreadMessages}</span>` : ''}</button>
    </div>`;
    
    let statsCards = `
        <div style="display:grid; grid-template-columns:repeat(${isStudent ? 4 : 3}, 1fr); gap:16px; margin-bottom:24px;">
            <div class="post-box" style="text-align:center; padding:20px; margin-bottom:0;">
                <div style="font-size:32px; font-weight:800; color:${school.primaryColor};">${stats.courses}</div>
                <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Courses</div>
            </div>
            <div class="post-box" style="text-align:center; padding:20px; margin-bottom:0;">
                <div style="font-size:32px; font-weight:800; color:${school.secondaryColor};">${stats.assignments}</div>
                <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Assignments</div>
            </div>
            ${isStudent ? `
            <div class="post-box" style="text-align:center; padding:20px; margin-bottom:0;">
                <div style="font-size:32px; font-weight:800; color:${stats.missing > 0 ? 'var(--danger)' : 'var(--success)'};">${stats.missing}</div>
                <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Missing</div>
            </div>` : ''}
            <div class="post-box" style="text-align:center; padding:20px; margin-bottom:0;">
                <div style="font-size:32px; font-weight:800; color:var(--accent);">${stats.avgGrade}%</div>
                <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">Avg Grade</div>
            </div>
        </div>
    `;
    
    let todoSection = `
        <div class="post-box" style="margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; color:var(--text-main);">📝 My Todos</h3>
                <button class="btn-zen" onclick="addTodo()" style="padding:6px 14px; font-size:12px;">+ Add</button>
            </div>
            <div style="max-height:200px; overflow-y:auto;">
                ${todos.length === 0 ? '<p style="color:var(--text-muted); text-align:center; padding:20px;">No todos yet. Add one!</p>' : 
                todos.map(t => `
                    <div style="display:flex; align-items:center; gap:12px; padding:10px; background:var(--bg-hover); border-radius:var(--radius-sm); margin-bottom:8px;">
                        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodo('${t.id}')" style="width:18px; height:18px; cursor:pointer;">
                        <span style="flex:1; text-decoration:${t.completed ? 'line-through' : 'none'}; color:${t.completed ? 'var(--text-muted)' : 'var(--text-main)'};">${t.text}</span>
                        <button onclick="deleteTodo('${t.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:14px;">✕</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    let activitySection = activities.length > 0 ? `
        <div class="post-box">
            <h3 style="margin:0 0 16px 0; color:var(--text-main);">🕐 Recent Activity</h3>
            <div style="max-height:200px; overflow-y:auto;">
                ${activities.map(a => `
                    <div style="padding:10px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px;">
                        <span style="font-size:16px;">${a.type === 'grade' ? '✅' : a.type === 'submit' ? '📤' : '📌'}</span>
                        <div style="flex:1;">
                            <div style="font-size:13px; color:var(--text-main);">${a.message}</div>
                            <div style="font-size:11px; color:var(--text-muted);">${formatTimeAgo(a.timestamp)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    return `
        <div class="col-left">
            ${isStudent ? renderXPBar() : ''}
            ${isStudent ? renderStreakWidget() : ''}
            ${isStudent ? renderPomodoroWidget() : ''}
            ${isStudent ? renderFocusModeWidget() : ''}
            <ul class="left-nav-menu">
                <li class="active" onclick="navigate('dashboard')">🏠 Dashboard</li>
                ${isStudent ? '<li onclick="navigate(\'flashcards\')">📚 Flashcards</li>' : ''}
                ${isStudent ? '<li onclick="navigate(\'studyNotes\')">📝 Notes</li>' : ''}
                ${isStudent ? '<li onclick="navigate(\'learningGoals\')">🎯 Goals</li>' : ''}
                ${isStudent ? '<li onclick="navigate(\'studyPartners\')">👥 Partners</li>' : ''}
                ${isStudent ? '<li onclick="navigate(\'analytics\')">📊 Analytics</li>' : ''}
                ${isStudent ? '<li onclick="navigate(\'peerReviews\')">🔍 Peer Reviews</li>' : ''}
                ${myCourses.map(c => `<li onclick="navigate('course', '${c.id}')">📚 ${c.name.substring(0, 15)}${c.name.length > 15 ? '...' : ''}</li>`).join('')}
            </ul>
        </div>
        <div class="col-main">
            <div class="welcome-banner" style="background:linear-gradient(135deg, ${school.primaryColor} 0%, ${school.secondaryColor} 100%);">
                <h2>Welcome back, ${db.users[state.user].name}! 👋</h2>
                <p style="margin:0; opacity:0.9; font-size:16px;">${school.tagline || ''}</p>
                ${welcomeLinks}
            </div>
            ${statsCards}
            ${isStudent ? renderGradeChart() : ''}
            ${isStudent ? renderQuickNote() : ''}
            <h3 style="color:var(--text-main); margin-bottom:20px; font-family:'Nunito', sans-serif; font-size:22px;">📚 My Courses</h3>
            ${myCourses.length === 0 ? '<div class="post-box" style="text-align:center; padding:50px;"><div style="font-size:64px; margin-bottom:20px;">📚</div><h3 style="color:var(--text-main); margin:0 0 10px 0; font-family:\'Nunito\', sans-serif;">No Courses Yet</h3><p style="color:var(--text-secondary); margin-bottom:24px;">Join a course with a code or create one to get started.</p>' + (isAdmin ? '<button class="btn-zen primary" onclick="openModal(\'createCourse\')" style="padding:14px 28px; font-size:16px;">✨ Create Your First Course</button>' : '<button class="btn-zen primary" onclick="openModal(\'joinCourse\')" style="padding:14px 28px; font-size:16px;">🎫 Join a Course</button>') + '</div>' : '<div class="course-grid">' + myCourses.map(function(c) {
                    var studentCount = db.enrollments.filter(function(e) { return String(e.courseId) === String(c.id); }).length;
                    var progress = isStudent ? getCourseProgress(c.id) : 0;
                    var headerStyle = c.image ? 'background-image: url(\'' + c.image + '\'); background-size: cover; background-position: center;' : 'background: linear-gradient(135deg, ' + school.primaryColor + ' 0%, ' + school.secondaryColor + ' 100%);';
                    var headerContent = !c.image ? '<span style="font-size:42px; color:white; font-weight:800; text-shadow: 0 2px 8px rgba(0,0,0,0.2);">' + c.name.substring(0,2).toUpperCase() + '</span>' : '';
                    var extra = isStudent ? '<div style="margin-top:12px;"><div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:4px;"><span>Progress</span><span>' + progress + '%</span></div><div style="height:6px; background:var(--border); border-radius:3px; overflow:hidden;"><div style="height:100%; width:' + progress + '%; background:linear-gradient(90deg, ' + school.primaryColor + ', ' + school.secondaryColor + '); border-radius:3px;"></div></div></div>' : '<div class="student-count">👥 ' + studentCount + ' student' + (studentCount !== 1 ? 's' : '') + '</div>';
                    var favIcon = isFavorite(c.id) ? '⭐' : '☆';
                    var favBtn = (isAdmin || !isStudent) ? '<span onclick="event.stopPropagation(); toggleFavorite(\'' + c.id + '\')" style="position:absolute; top:10px; right:10px; font-size:20px; cursor:pointer; z-index:10; text-shadow:0 1px 3px rgba(0,0,0,0.3);">' + favIcon + '</span>' : '';
                    return '<div class="course-tile" onclick="navigate(\'course\', \'' + c.id + '\')" style="position:relative;"><div class="course-tile-header" style="' + headerStyle + '">' + headerContent + favBtn + '</div><div class="course-tile-body"><h4>' + c.name + '</h4><p>' + c.section + '</p>' + extra + '</div></div>';
                }).join('') + '</div>'}
        </div>
        <div class="col-right">
            ${isStudent ? `
            <div class="widget-box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <button onclick="navigate('flashcards')" style="background: rgba(255,255,255,0.2); border: none; padding: 16px 12px; border-radius: 12px; color: white; cursor: pointer; text-align: center; font-size: 13px; font-weight: 600;">
                        <div style="font-size: 24px; margin-bottom: 4px;">📚</div>
                        Flashcards
                    </button>
                    <button onclick="navigate('studyNotes')" style="background: rgba(255,255,255,0.2); border: none; padding: 16px 12px; border-radius: 12px; color: white; cursor: pointer; text-align: center; font-size: 13px; font-weight: 600;">
                        <div style="font-size: 24px; margin-bottom: 4px;">📝</div>
                        Notes
                    </button>
                    <button onclick="startPomodoro(25)" style="background: rgba(255,255,255,0.2); border: none; padding: 16px 12px; border-radius: 12px; color: white; cursor: pointer; text-align: center; font-size: 13px; font-weight: 600;">
                        <div style="font-size: 24px; margin-bottom: 4px;">⏱️</div>
                        25min Timer
                    </button>
                    <button onclick="navigate('analytics')" style="background: rgba(255,255,255,0.2); border: none; padding: 16px 12px; border-radius: 12px; color: white; cursor: pointer; text-align: center; font-size: 13px; font-weight: 600;">
                        <div style="font-size: 24px; margin-bottom: 4px;">📊</div>
                        Analytics
                    </button>
                </div>
            </div>
            ` : ''}
            ${activitySection}
            <div class="widget-box">
                <div class="right-heading">Tools</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${isStudent ? '<a onclick="calculateGPA()" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">📊 Calculate GPA</a>' : ''}
                    ${isStudent ? '<a onclick="calculateNeededGrade()" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">🎯 Grade Needed</a>' : ''}
                    ${isStudent ? '<a onclick="navigate(\'learningGoals\')" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">🎯 My Goals</a>' : ''}
                    ${isStudent ? '<a onclick="navigate(\'studyPartners\')" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">👥 Study Partners</a>' : ''}
                    ${isStudent ? '<a onclick="document.body.insertAdjacentHTML(\'beforeend\', studentViewRegradeRequests())" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">🔄 Regrade Requests</a>' : ''}
                    ${!isStudent && isAdmin ? '<a onclick="scheduleConference()" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">📅 Schedule Conference</a>' : ''}
                    ${!isStudent ? '<a onclick="renderOfficeHours()" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">🕐 Office Hours</a>' : ''}
                    <a onclick="openModal('joinCourse')" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">
                        🎫 Join Course
                     </a>
                    ${isAdmin ? '<a onclick="openModal(\'createCourse\')" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">✨ Create Course</a>' : ''}
                    ${isAdmin ? '<a onclick="document.body.insertAdjacentHTML(\'beforeend\', showArchivedCourses())" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">📦 Archived Courses</a>' : ''}
                    <a onclick="openModal('userSettings')" style="display:flex; align-items:center; gap:10px; padding:12px; background:var(--bg-hover); border-radius:var(--radius-sm); color:var(--text-main); cursor:pointer; text-decoration:none;">
                        👤 Profile Settings
                    </a>
                </div>
            </div>
            </div>
            <div class="widget-box">
                <div class="right-heading">Upcoming Deadlines</div>
                ${renderUpcomingDeadlines()}
            </div>
        </div>
    `;
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function renderUpcomingDeadlines() {
    const role = db.users[state.user].role;
    let items = [];
    
    if (role === 'student') {
        const myCourses = db.courses.filter(c => 
            db.enrollments.some(e => String(e.user) === String(state.user) && String(e.courseId) === String(c.id))
        );
        myCourses.forEach(course => {
            const assignments = db.materials.filter(m => 
                String(m.courseId) === String(course.id) && m.due && m.published && 
                (m.type.includes('Assign') || m.type.includes('Assess'))
            );
            assignments.forEach(a => {
                const sub = db.submissions.find(s => String(s.assignId) === String(a.id) && String(s.user) === String(state.user));
                if (!sub || sub.status === 'draft') {
                    items.push({...a, courseName: course.name, daysLeft: Math.ceil((new Date(a.due) - new Date()) / 86400000)});
                }
            });
        });
    } else {
        const myCourses = db.courses.filter(c => c.teacher === state.user);
        myCourses.forEach(course => {
            const assignments = db.materials.filter(m => 
                String(m.courseId) === String(course.id) && m.due && m.published && 
                (m.type.includes('Assign') || m.type.includes('Assess'))
            );
            assignments.forEach(a => {
                items.push({...a, courseName: course.name, daysLeft: Math.ceil((new Date(a.due) - new Date()) / 86400000)});
            });
        });
    }
    
    items.sort((a, b) => new Date(a.due) - new Date(b.due));
    items = items.slice(0, 5);
    
    if (items.length === 0) return '<p style="font-size:12px; color:#777;">No upcoming deadlines</p>';
    
    return items.map(item => {
        let colorClass = item.daysLeft < 0 ? 'var(--danger)' : item.daysLeft <= 2 ? 'var(--warning)' : 'var(--text-secondary)';
        let label = item.daysLeft < 0 ? 'Overdue' : item.daysLeft === 0 ? 'Today' : item.daysLeft === 1 ? 'Tomorrow' : `${item.daysLeft} days`;
        return `
            <div class="upcoming-item" onclick="navigate('item', '${item.id}')">
                <div style="font-weight:600;">${item.title}</div>
                <div style="font-size:11px; color:var(--text-muted);">${item.courseName} • <span style="color:${colorClass};">${label}</span></div>
            </div>
        `;
    }).join('');
}

// ====== ADMIN PANEL ======
function renderAdminContainer() {
    if (db.users[state.user].role !== 'admin') return `<div class="col-main"><div class="post-box"><p>Access Denied</p></div></div>`;
    let content = '';
    if (state.adminTab === 'users') {
        content = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; font-family:'Nunito', sans-serif;">User Management</h3>
                <button class="btn-zen primary" onclick="openModal('adminAddUser')">➕ Add User</button>
            </div>
            <div style="background:var(--bg-card); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); border:1px solid var(--border);">
                <table style="width:100%; border-collapse:collapse;">
                    <tr style="background:linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color:white;">
                        <th style="padding:16px; text-align:left; font-weight:700;">Username</th>
                        <th style="padding:16px; text-align:left; font-weight:700;">Name</th>
                        <th style="padding:16px; text-align:left; font-weight:700;">Role</th>
                        <th style="padding:16px; text-align:center; font-weight:700;">Actions</th>
                    </tr>
                    ${Object.keys(db.users).map(u => `
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:14px 16px; font-weight:600;">${u}</td>
                            <td style="padding:14px 16px;">${db.users[u].name}</td>
                            <td style="padding:14px 16px;"><span class="badge ${db.users[u].role === 'admin' ? 'badge-info' : (db.users[u].role === 'teacher' ? 'badge-warning' : (db.users[u].role === 'parent' ? 'badge-purple' : 'badge-success'))}">${db.users[u].role}</span></td>
                            <td style="padding:14px 16px; text-align:center;"><button style="background:#6366f1; border:none; cursor:pointer; font-size:14px; padding:6px 12px; border-radius:4px; color:white; margin-right:5px;" onclick="openModal('editUser', '${u}')">✏️ Edit</button><button style="background:none; border:none; cursor:pointer; font-size:18px; padding:6px;" onclick="adminDeleteUser('${u}')">🗑️</button></td>
                        </tr>
                    `).join('')}
                </table>
            </div>`;
    } else if (state.adminTab === 'school') {
        content = renderSchoolSettings();
    }
    return `<div class="col-left"><ul class="left-nav-menu"><li class="${state.adminTab==='users'?'active':''}" onclick="setAdminTab('users')">👥 Users</li><li class="${state.adminTab==='school'?'active':''}" onclick="setAdminTab('school')">🏫 School Settings</li></ul></div><div class="col-main"><div class="post-box">${content}</div></div>`;
}

function renderSchoolSettings() {
    let school = db.schools[0];
    if (!school.features) {
        school.features = {
            messaging: true,
            calendar: true,
            announcements: true,
            progressTracking: true,
            classRankings: true,
            gpaCalculator: true,
            gradeChart: true,
            badges: true,
            darkMode: true
        };
    }
    let f = school.features;
    
    return `
        <h3 style="margin-top:0; font-family:'Nunito', sans-serif;">🏫 School Customization</h3>
        <p style="color:var(--text-secondary); margin-bottom:24px;">Customize your school's branding and enable/disable features.</p>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>
                <label style="display:block; font-weight:600; margin-bottom:8px; color:var(--text-main);">School Name</label>
                <input type="text" id="schoolName" value="${school.name}" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div>
                <label style="display:block; font-weight:600; margin-bottom:8px; color:var(--text-main);">Tagline</label>
                <input type="text" id="schoolTagline" value="${school.tagline || ''}" placeholder="Your school tagline" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
        </div>
        
        <div style="margin-top:20px;">
            <label style="display:block; font-weight:600; margin-bottom:8px; color:var(--text-main);">School Logo URL</label>
            <input type="text" id="schoolLogo" value="${school.logo || ''}" placeholder="https://example.com/logo.png" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
        </div>
        
        <div style="margin-top:20px;">
            <label style="display:block; font-weight:600; margin-bottom:12px; color:var(--text-main);">Brand Colors</label>
            <div style="display:flex; gap:20px; align-items:center;">
                <div>
                    <label style="display:block; font-size:12px; color:var(--text-secondary); margin-bottom:6px;">Primary Color</label>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="color" id="schoolPrimaryColor" value="${school.primaryColor || '#6366f1'}" style="width:50px; height:50px; border:none; border-radius:var(--radius-sm); cursor:pointer;">
                        <input type="text" id="schoolPrimaryHex" value="${school.primaryColor || '#6366f1'}" style="width:100px; padding:10px; border:2px solid var(--border); border-radius:var(--radius-sm); font-family:monospace;">
                    </div>
                </div>
                <div>
                    <label style="display:block; font-size:12px; color:var(--text-secondary); margin-bottom:6px;">Secondary Color</label>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="color" id="schoolSecondaryColor" value="${school.secondaryColor || '#ec4899'}" style="width:50px; height:50px; border:none; border-radius:var(--radius-sm); cursor:pointer;">
                        <input type="text" id="schoolSecondaryHex" value="${school.secondaryColor || '#ec4899'}" style="width:100px; padding:10px; border:2px solid var(--border); border-radius:var(--radius-sm); font-family:monospace;">
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin-top:32px; padding-top:24px; border-top:2px solid var(--border);">
            <h4 style="margin:0 0 16px 0; color:var(--text-main); font-family:'Nunito', sans-serif;">⚙️ Feature Settings</h4>
            <p style="color:var(--text-secondary); margin-bottom:20px; font-size:13px;">Toggle features on or off for your school. Disabled features will be hidden from users.</p>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
                ${renderFeatureToggle('messaging', '💬 Messaging', 'Allow users to send direct messages', f.messaging)}
                ${renderFeatureToggle('calendar', '📅 Calendar', 'Show calendar view with events', f.calendar)}
                ${renderFeatureToggle('announcements', '📢 Announcements', 'Enable course announcements', f.announcements)}
                ${renderFeatureToggle('progressTracking', '📊 Progress Tracking', 'Show student progress stats', f.progressTracking)}
                ${renderFeatureToggle('classRankings', '🏆 Class Rankings', 'Display student rankings', f.classRankings)}
                ${renderFeatureToggle('gpaCalculator', '🎓 GPA Calculator', 'Allow GPA calculations', f.gpaCalculator)}
                ${renderFeatureToggle('gradeChart', '📈 Grade Chart', 'Show grade distribution chart', f.gradeChart)}
                ${renderFeatureToggle('badges', '🏅 Badges', 'Enable achievement badges', f.badges)}
                ${renderFeatureToggle('darkMode', '🌙 Dark Mode', 'Allow dark theme toggle', f.darkMode)}
            </div>
        </div>
        
        <div style="margin-top:24px; padding:20px; background:linear-gradient(135deg, ${school.primaryColor || '#6366f1'}20 0%, ${school.secondaryColor || '#ec4899'}10 100%); border-radius:var(--radius); border:2px solid var(--border);">
            <label style="display:block; font-weight:600; margin-bottom:12px;">Preview</label>
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:50px; height:50px; background:${school.primaryColor || '#6366f1'}; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:20px;">
                    ${school.logo ? '📷' : school.name.charAt(0)}
                </div>
                <div>
                    <div style="font-weight:700; font-size:18px; font-family:'Nunito', sans-serif;">${school.name}</div>
                    <div style="font-size:13px; color:var(--text-secondary);">${school.tagline || 'Your tagline here'}</div>
                </div>
            </div>
        </div>
        
        <div style="margin-top:24px; display:flex; gap:12px;">
            <button class="btn-zen primary" onclick="saveSchoolSettings()">💾 Save Settings</button>
            <button class="btn-zen" onclick="resetSchoolSettings()">↺ Reset to Default</button>
        </div>
    `;
}

function renderFeatureToggle(feature, label, description, enabled) {
    return `
        <div style="padding:16px; background:${enabled ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'var(--bg-hover)'}; border-radius:var(--radius-sm); border:2px solid ${enabled ? '#10b981' : 'var(--border)'}; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.2s;" onclick="toggleFeature('${feature}')">
            <div>
                <div style="font-weight:600; font-size:14px; color:${enabled ? '#065f46' : 'var(--text-main)'};">${label}</div>
                <div style="font-size:12px; color:${enabled ? '#047857' : 'var(--text-muted)'}; margin-top:4px;">${description}</div>
            </div>
            <div style="width:48px; height:28px; background:${enabled ? '#10b981' : '#ccc'}; border-radius:14px; position:relative; transition:all 0.2s;">
                <div style="width:24px; height:24px; background:white; border-radius:50%; position:absolute; top:2px; ${enabled ? 'right:2px;' : 'left:2px;'} transition:all 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>
            </div>
        </div>
    `;
}

function saveSchoolSettings() {
    let school = db.schools[0];
    let newName = document.getElementById('schoolName').value.trim() || 'My School';
    
    let normalizedNew = newName.toLowerCase();
    if (normalizedNew === 'example') {
        alert('School name "Example" is reserved and cannot be used.');
        return;
    }
    
    let duplicateExists = db.schools.some(s => 
        s.id !== school.id && s.name.toLowerCase() === normalizedNew
    );
    if (duplicateExists) {
        alert('A school with this name already exists. Please choose a different name.');
        return;
    }
    
    school.name = newName;
    school.tagline = document.getElementById('schoolTagline').value;
    school.logo = document.getElementById('schoolLogo').value;
    school.primaryColor = document.getElementById('schoolPrimaryHex').value || '#6366f1';
    school.secondaryColor = document.getElementById('schoolSecondaryHex').value || '#ec4899';
    save();
    render();
    alert('School settings saved!');
}

function isSchoolNameTaken(name, excludeId) {
    let normalized = name.toLowerCase().trim();
    if (normalized === 'example') return true;
    return db.schools.some(s => s.id !== excludeId && s.name.toLowerCase() === normalized);
}

function resetSchoolSettings() {
    if(!confirm('Reset to default settings?')) return;
    let school = db.schools[0];
    school.name = 'Zentelle Academy';
    school.tagline = 'Empowering Education';
    school.logo = '';
    school.primaryColor = '#6366f1';
    school.secondaryColor = '#ec4899';
    school.features = {
        messaging: true,
        calendar: true,
        announcements: true,
        progressTracking: true,
        classRankings: true,
        gpaCalculator: true,
        gradeChart: true,
        badges: true,
        darkMode: true
    };
    save();
    render();
}

// ====== GRADE CATEGORIES ======
function renderGradeCategories(courseId) {
    let categories = db.gradeCategories.filter(c => String(c.courseId) === String(courseId)) || [];
    let defaultCats = [
        { id: 'cat_1', name: 'Homework', weight: 20, courseId: courseId },
        { id: 'cat_2', name: 'Quizzes', weight: 20, courseId: courseId },
        { id: 'cat_3', name: 'Tests', weight: 40, courseId: courseId },
        { id: 'cat_4', name: 'Projects', weight: 20, courseId: courseId }
    ];
    
    if (categories.length === 0) {
        categories = defaultCats;
        db.gradeCategories = [...db.gradeCategories, ...categories];
        save();
    }
    
    let totalWeight = categories.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
    let weightWarning = totalWeight !== 100 ? `<div style="margin-top:12px; padding:10px; background:#fef3c7; border-radius:var(--radius-sm); color:#92400e; font-size:13px;">⚠️ Total weight is ${totalWeight}% (should be 100%)</div>` : '';
    
    return `
        <div class="post-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0;">📂 Grade Categories</h3>
                <button class="btn-zen primary" onclick="openModal('addCategory', '${courseId}')">+ Add Category</button>
            </div>
            ${weightWarning}
            <table class="gradebook-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Weight (%)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${categories.map(cat => `
                        <tr>
                            <td style="font-weight:600;">${cat.name}</td>
                            <td>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="flex:1; background:#e2e8f0; border-radius:4px; height:8px; overflow:hidden;">
                                        <div style="width:${cat.weight}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--accent));"></div>
                                    </div>
                                    <span style="font-weight:700; color:var(--primary);">${cat.weight}%</span>
                                </div>
                            </td>
                            <td>
                                <button class="btn-zen" onclick="editCategory('${cat.id}')" style="padding:6px 12px; margin-right:6px;">✏️</button>
                                <button class="btn-zen" onclick="deleteCategory('${cat.id}', '${courseId}')" style="padding:6px 12px; color:var(--danger);">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background:#f8f9fc; font-weight:700;">
                        <td>Total</td>
                        <td>
                            <span style="color:${totalWeight === 100 ? 'var(--success)' : 'var(--warning)'}; font-size:16px;">${totalWeight}%</span>
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
}

function addGradeCategory(courseId) {
    let name = prompt('Category name (e.g., Homework, Tests):');
    if (!name) return;
    
    let weight = parseFloat(prompt('Weight percentage (e.g., 20):') || '0');
    if (isNaN(weight) || weight < 0) weight = 0;
    
    let id = 'cat_' + Date.now();
    db.gradeCategories.push({ id, name, weight, courseId });
    save();
    render();
    showToast(`Category "${name}" added!`);
}

function addGradeCategoryFromModal(courseId) {
    let name = document.getElementById('newCatName').value.trim();
    let weight = parseFloat(document.getElementById('newCatWeight').value) || 0;
    
    if (!name) {
        showToast('Please enter a category name');
        return;
    }
    
    let id = 'cat_' + Date.now();
    db.gradeCategories.push({ id, name, weight, courseId });
    save();
    closeModal();
    openModal('gradeCategories', courseId);
    showToast(`Category "${name}" added!`);
}

function editCategory(catId) {
    let cat = db.gradeCategories.find(c => c.id === catId);
    if (!cat) return;
    
    let name = prompt('Category name:', cat.name);
    if (!name) return;
    
    let weight = parseFloat(prompt('Weight percentage:', cat.weight.toString()) || '0');
    if (isNaN(weight) || weight < 0) weight = 0;
    
    cat.name = name;
    cat.weight = weight;
    save();
    render();
    showToast('Category updated!');
}

function deleteCategory(catId, courseId) {
    if (!confirm('Delete this category?')) return;
    db.gradeCategories = db.gradeCategories.filter(c => c.id !== catId);
    save();
    render();
    showToast('Category deleted');
}

function getCategoryWeight(courseId, categoryName) {
    let cat = db.gradeCategories.find(c => String(c.courseId) === String(courseId) && c.name.toLowerCase() === categoryName.toLowerCase());
    return cat ? parseFloat(cat.weight) || 0 : 0;
}

function calculateWeightedGrade(courseId, userId) {
    let categories = db.gradeCategories.filter(c => String(c.courseId) === String(courseId));
    if (categories.length === 0) return null;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    categories.forEach(cat => {
        let assignments = db.materials.filter(m => 
            String(m.courseId) === String(courseId) && 
            (m.type.includes('Assign') || m.type.includes('Assess')) &&
            m.category === cat.name
        );
        
        if (assignments.length > 0) {
            let earned = 0, possible = 0;
            assignments.forEach(a => {
                let g = db.grades.find(x => String(x.assignId) === String(a.id) && String(x.user) === String(userId));
                if (g) {
                    earned += g.score;
                    possible += (a.points || 100);
                }
            });
            
            if (possible > 0) {
                let catAvg = (earned / possible) * 100;
                totalWeightedScore += catAvg * (cat.weight / 100);
                totalWeight += cat.weight / 100;
            }
        }
    });
    
    return totalWeight > 0 ? (totalWeightedScore / totalWeight) : null;
}

// ====== DIGITAL RUBRICS ======
function initRubrics() {
    if (!db.rubrics) db.rubrics = [];
    if (!db.rubricScores) db.rubricScores = [];
}

function createRubric() {
    let name = prompt('Rubric name:');
    if (!name) return;
    
    let criteria = [];
    let addMore = true;
    while (addMore) {
        let desc = prompt('Criteria description:');
        if (!desc) break;
        let levels = [];
        for (let i = 4; i >= 1; i--) {
            let pts = prompt(`Points for level ${i}:`);
            if (!pts) { pts = i * 10; }
            levels.push({ level: i, points: parseInt(pts), description: i === 4 ? 'Exceeds' : i === 3 ? 'Meets' : i === 2 ? 'Approaching' : 'Beginning' });
        }
        criteria.push({ description: desc, levels: levels });
        addMore = confirm('Add another criteria?');
    }
    
    let id = 'rubric_' + Date.now();
    db.rubrics.push({ id, name, criteria, createdBy: state.user });
    save();
    showToast(`Rubric "${name}" created!`);
    return id;
}

function attachRubricToAssignment(assignId) {
    if (db.rubrics.length === 0) {
        showToast('No rubrics available. Create one first!');
        return;
    }
    
    let options = db.rubrics.map(r => `<option value="${r.id}">${r.name} (${r.criteria.length} criteria)</option>`).join('');
    let rubricId = prompt(`Select rubric:\n${db.rubrics.map(r => `${r.id}: ${r.name}`).join('\n')}\n\nEnter rubric ID:`);
    
    if (!rubricId) return;
    
    let rubric = db.rubrics.find(r => r.id === rubricId);
    if (!rubric) {
        showToast('Rubric not found');
        return;
    }
    
    let item = db.materials.find(m => String(m.id) === String(assignId));
    if (item) {
        item.rubricId = rubricId;
        save();
        showToast('Rubric attached!');
    }
}

function gradeWithRubric(assignId, studentUser) {
    let item = db.materials.find(m => String(m.id) === String(assignId));
    if (!item || !item.rubricId) {
        showToast('No rubric attached to this assignment');
        return;
    }
    
    let rubric = db.rubrics.find(r => r.id === item.rubricId);
    if (!rubric) return;
    
    let totalScore = 0;
    let maxScore = rubric.criteria.length * 4;
    let feedback = [];
    
    rubric.criteria.forEach((criteria, idx) => {
        let level = prompt(`Criteria ${idx + 1}: ${criteria.description}\n\nLevels:\n4: ${criteria.levels[3]?.description} (${criteria.levels[3]?.points}pts)\n3: ${criteria.levels[2]?.description} (${criteria.levels[2]?.points}pts)\n2: ${criteria.levels[1]?.description} (${criteria.levels[1]?.points}pts)\n1: ${criteria.levels[0]?.description} (${criteria.levels[0]?.points}pts)\n\nEnter level (1-4):`);
        
        if (level && level >= 1 && level <= 4) {
            let pts = criteria.levels[level - 1]?.points || level * 10;
            totalScore += pts;
            feedback.push(`${criteria.description}: ${pts}pts (${criteria.levels[level - 1]?.description})`);
        }
    });
    
    if (confirm(`Total: ${totalScore}/${maxScore}\n\nSave this grade?`)) {
        saveGrade(assignId, studentUser);
        let grade = db.grades.find(g => String(g.assignId) === String(assignId) && String(g.user) === String(studentUser));
        if (grade) {
            grade.rubricFeedback = feedback.join('\n');
            grade.rubricScore = totalScore;
            grade.rubricMax = maxScore;
        }
        save();
        render();
        showToast('Graded with rubric!');
    }
}

function viewRubric(rubricId) {
    let rubric = db.rubrics.find(r => r.id === rubricId);
    if (!rubric) return;
    
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width:700px; max-width:95%;" onclick="event.stopPropagation()">
                <h3>📋 ${rubric.name}</h3>
                <p style="color:var(--text-muted); margin-bottom:20px;">Created by ${rubric.createdBy}</p>
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:var(--bg-hover);">
                            <th style="padding:12px; text-align:left; border:1px solid var(--border);">Criteria</th>
                            <th style="padding:12px; text-align:center; border:1px solid var(--border); width:80px;">1 pt</th>
                            <th style="padding:12px; text-align:center; border:1px solid var(--border); width:80px;">2 pts</th>
                            <th style="padding:12px; text-align:center; border:1px solid var(--border); width:80px;">3 pts</th>
                            <th style="padding:12px; text-align:center; border:1px solid var(--border); width:80px;">4 pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rubric.criteria.map(c => `
                            <tr>
                                <td style="padding:12px; border:1px solid var(--border); font-weight:600;">${c.description}</td>
                                <td style="padding:12px; border:1px solid var(--border); text-align:center; font-size:12px;">${c.levels[0]?.description || '-'}</td>
                                <td style="padding:12px; border:1px solid var(--border); text-align:center; font-size:12px;">${c.levels[1]?.description || '-'}</td>
                                <td style="padding:12px; border:1px solid var(--border); text-align:center; font-size:12px;">${c.levels[2]?.description || '-'}</td>
                                <td style="padding:12px; border:1px solid var(--border); text-align:center; font-size:12px;">${c.levels[3]?.description || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ====== COLLABORATIVE DISCUSSIONS ======
function initDiscussions() {
    if (!db.discussions) db.discussions = [];
}

function createDiscussion() {
    let title = prompt('Discussion title:');
    if (!title) return;
    
    let prompt_ = prompt('Discussion prompt/question:');
    
    let id = 'disc_' + Date.now();
    db.discussions.push({
        id,
        title,
        prompt: prompt_,
        courseId: state.courseId,
        createdBy: state.user,
        createdAt: new Date().toISOString(),
        posts: []
    });
    save();
    showToast('Discussion created!');
    render();
}

function viewDiscussion(discId) {
    let disc = db.discussions.find(d => d.id === discId);
    if (!disc) return;
    
    let postsHtml = disc.posts.map(post => `
        <div style="padding:16px; background:var(--bg-hover); border-radius:var(--radius-sm); margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <div style="width:32px; height:32px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:14px;">
                    ${(db.users[post.user]?.name || post.user || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style="font-weight:600;">${db.users[post.user]?.name || post.user}</div>
                    <div style="font-size:12px; color:var(--text-muted);">${new Date(post.timestamp).toLocaleDateString()}</div>
                </div>
            </div>
            <div style="margin-left:42px;">${post.content}</div>
        </div>
    `).join('') || '<p style="color:var(--text-muted); text-align:center; padding:20px;">No posts yet. Be the first to respond!</p>';
    
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="width:700px; max-width:95%; max-height:90vh; overflow-y:auto;" onclick="event.stopPropagation()">
                <h3>💬 ${disc.title}</h3>
                <p style="color:var(--primary); font-style:italic; margin-bottom:20px; padding:12px; background:#e8f0fe; border-radius:var(--radius-sm);">${disc.prompt || 'Discussion topic'}</p>
                <div style="margin-bottom:20px;">
                    ${postsHtml}
                </div>
                <div style="margin-top:16px;">
                    <textarea id="newPostContent" placeholder="Write your response..." rows="3" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);"></textarea>
                    <button class="btn-zen primary" style="margin-top:10px;" onclick="postReply('${disc.id}')">Post Reply</button>
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function postReply(discId) {
    let content = document.getElementById('newPostContent').value.trim();
    if (!content) {
        showToast('Please write something!');
        return;
    }
    
    let disc = db.discussions.find(d => d.id === discId);
    if (disc) {
        disc.posts.push({
            id: 'post_' + Date.now(),
            user: state.user,
            content,
            timestamp: new Date().toISOString()
        });
        save();
        viewDiscussion(discId);
        showToast('Reply posted!');
    }
}

// ====== MASTERY & STANDARDS TRACKING ======
function initMastery() {
    if (!db.mastery) db.mastery = [];
    if (!db.standards) db.standards = [
        { id: 'std_1', name: 'Reading Comprehension', code: 'RC.1' },
        { id: 'std_2', name: 'Written Expression', code: 'WE.1' },
        { id: 'std_3', name: 'Mathematical Reasoning', code: 'MR.1' },
        { id: 'std_4', name: 'Scientific Inquiry', code: 'SI.1' },
        { id: 'std_5', name: 'Critical Thinking', code: 'CT.1' }
    ];
}

function attachStandard(assignId) {
    let options = db.standards.map(s => `<option value="${s.id}">${s.code}: ${s.name}</option>`).join('');
    let stdId = prompt(`Attach Standard:\n\n${db.standards.map(s => `${s.id}: ${s.code} - ${s.name}`).join('\n')}\n\nEnter standard ID:`);
    
    if (!stdId) return;
    
    let standard = db.standards.find(s => s.id === stdId);
    let item = db.materials.find(m => String(m.id) === String(assignId));
    
    if (item && standard) {
        if (!item.standards) item.standards = [];
        if (!item.standards.includes(stdId)) {
            item.standards.push(stdId);
            save();
            showToast(`Standard ${standard.code} attached!`);
        } else {
            showToast('Standard already attached');
        }
    }
}

function trackMastery(courseId) {
    let html = `
        <div class="post-box">
            <h3 style="margin-top:0;">📊 Mastery Report</h3>
            <p style="color:var(--text-secondary); margin-bottom:20px;">Track student progress against learning standards.</p>
            <table class="gradebook-table">
                <thead>
                    <tr>
                        <th>Standard</th>
                        <th>Code</th>
                        <th>Mastery Level</th>
                        <th>Students</th>
                    </tr>
                </thead>
                <tbody>
                    ${db.standards.map(std => {
                        let assessments = db.materials.filter(m => m.standards && m.standards.includes(std.id) && String(m.courseId) === String(courseId));
                        let masteryLevel = calculateStandardMastery(std.id, courseId);
                        let colors = { 'Mastered': '#10b981', 'Proficient': '#3b82f6', 'Developing': '#f59e0b', 'Beginning': '#ef4444' };
                        return `
                            <tr>
                                <td style="font-weight:600;">${std.name}</td>
                                <td><code style="background:var(--bg-hover); padding:4px 8px; border-radius:4px;">${std.code}</code></td>
                                <td>
                                    <span style="padding:4px 12px; border-radius:20px; background:${colors[masteryLevel] || '#ccc'}20; color:${colors[masteryLevel] || '#666'}; font-weight:600;">
                                        ${masteryLevel}
                                    </span>
                                </td>
                                <td>${assessments.length} assessments</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    return html;
}

function calculateStandardMastery(stdId, courseId) {
    let assessments = db.materials.filter(m => m.standards && m.standards.includes(stdId) && String(m.courseId) === String(courseId));
    if (assessments.length === 0) return 'Not Assessed';
    
    let totalScore = 0, count = 0;
    assessments.forEach(a => {
        let g = db.grades.find(gr => String(gr.assignId) === String(a.id) && String(gr.user) === String(state.user));
        if (g) {
            totalScore += (g.score / (a.points || 100)) * 100;
            count++;
        }
    });
    
    if (count === 0) return 'Not Attempted';
    let avg = totalScore / count;
    if (avg >= 90) return 'Mastered';
    if (avg >= 75) return 'Proficient';
    if (avg >= 60) return 'Developing';
    return 'Beginning';
}

// ====== IMMERSIVE READER ======
function toggleImmersiveReader() {
    let reader = document.getElementById('immersiveReaderPanel');
    if (reader) {
        reader.remove();
        return;
    }
    
    let content = document.getElementById('itemContent')?.innerText || 
                  document.querySelector('.materials-wrapper')?.innerText ||
                  'No content available for reading.';
    
    let html = `
        <div id="immersiveReaderPanel" style="position:fixed; top:72px; right:20px; width:500px; max-height:70vh; background:white; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.2); z-index:99996; overflow:hidden;">
            <div style="background:linear-gradient(135deg, var(--primary), var(--accent)); padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:white; font-weight:700; font-size:16px;">📖 Immersive Reader</span>
                <button onclick="toggleImmersiveReader()" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">✕</button>
            </div>
            <div style="padding:20px;">
                <div style="margin-bottom:16px; display:flex; gap:10px; flex-wrap:wrap;">
                    <select id="readerVoice" style="flex:1; padding:8px; border-radius:8px;">
                        <option value="">Select Voice</option>
                    </select>
                    <select id="readerSpeed" style="padding:8px; border-radius:8px;">
                        <option value="0.7">0.7x</option>
                        <option value="1" selected>1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                    </select>
                    <button onclick="startReading()" style="padding:8px 16px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">▶ Play</button>
                    <button onclick="stopReading()" style="padding:8px 16px; background:var(--danger); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">⏹ Stop</button>
                </div>
                <div style="font-size:18px; line-height:1.8; color:var(--text-main); max-height:300px; overflow-y:auto;" id="readerContent">
                    ${content.replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    populateVoices();
}

function populateVoices() {
    let select = document.getElementById('readerVoice');
    if (!select || !window.speechSynthesis) return;
    
    let voices = speechSynthesis.getVoices();
    voices.forEach((voice, i) => {
        let option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.default) option.selected = true;
        select.appendChild(option);
    });
}

function startReading() {
    let content = document.getElementById('readerContent')?.innerText;
    let voiceName = document.getElementById('readerVoice')?.value;
    let speed = parseFloat(document.getElementById('readerSpeed')?.value) || 1;
    
    if (!content) return;
    
    stopReading();
    
    let utterance = new SpeechSynthesisUtterance(content);
    let voices = speechSynthesis.getVoices();
    let voice = voices.find(v => v.name === voiceName) || voices[0];
    if (voice) utterance.voice = voice;
    utterance.rate = speed;
    
    window.currentUtterance = utterance;
    speechSynthesis.speak(utterance);
}

function stopReading() {
    speechSynthesis.cancel();
}

// ====== POWERBUDDY AI ASSISTANT ======
function togglePowerBuddy() {
    let buddy = document.getElementById('powerBuddyPanel');
    if (buddy) {
        buddy.remove();
        return;
    }
    
    let html = `
        <div id="powerBuddyPanel" style="position:fixed; bottom:20px; right:20px; width:380px; background:white; border-radius:20px; box-shadow:0 10px 40px rgba(0,0,0,0.25); z-index:99996; overflow:hidden;">
            <div style="background:linear-gradient(135deg, #7c3aed, #a855f7); padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">🤖</span>
                    <span style="color:white; font-weight:700; font-size:16px;">PowerBuddy AI</span>
                </div>
                <button onclick="togglePowerBuddy()" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">✕</button>
            </div>
            <div id="powerBuddyChat" style="height:300px; overflow-y:auto; padding:16px; background:#f8f9fc;">
                <div style="background:white; padding:12px 16px; border-radius:12px 12px 12px 4px; margin-bottom:12px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    <p style="margin:0; font-size:14px;">👋 Hi! I&apos;m PowerBuddy. I can help you with:</p>
                    <ul style="margin:8px 0 0 0; padding-left:20px; font-size:13px; color:var(--text-secondary);">
                        <li>Generate assessment questions</li>
                        <li>Create rubric criteria</li>
                        <li>Write announcements</li>
                        <li>Suggest discussion prompts</li>
                        <li>Draft assignment descriptions</li>
                    </ul>
                </div>
            </div>
            <div style="padding:12px; border-top:1px solid var(--border);">
                <div style="display:flex; gap:8px;">
                    <select id="powerBuddyTask" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border);">
                        <option value="questions">Generate Questions</option>
                        <option value="rubric">Suggest Rubric Criteria</option>
                        <option value="announcement">Write Announcement</option>
                        <option value="discussion">Discussion Prompt</option>
                        <option value="description">Assignment Description</option>
                    </select>
                    <button onclick="askPowerBuddy()" style="padding:10px 16px; background:linear-gradient(135deg, #7c3aed, #a855f7); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Ask</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function askPowerBuddy() {
    let task = document.getElementById('powerBuddyTask')?.value;
    let chat = document.getElementById('powerBuddyChat');
    if (!chat) return;
    
    let userMsg = document.createElement('div');
    userMsg.style.cssText = 'background:#7c3aed; color:white; padding:10px 14px; border-radius:12px 12px 4px 12px; margin-bottom:12px; font-size:14px;';
    userMsg.innerHTML = `<strong>You:</strong> ${task}`;
    chat.appendChild(userMsg);
    
    let responses = {
        questions: `Here are 5 multiple-choice questions:

**1.** What is the main purpose of [topic]?
   A) Option A
   B) Option B ✓
   C) Option C
   D) Option D

**2.** Which statement best describes [concept]?
   A) Statement A
   B) Statement B ✓
   C) Statement C
   D) Statement D

**3.** How would you apply [skill] in a real scenario?
   A) Method A
   B) Method B ✓
   C) Method C
   D) Method D

**4.** What is the relationship between [A] and [B]?
   A) Direct correlation
   B) Inverse relationship ✓
   C) No relationship
   D) Cannot be determined

**5.** Which example best illustrates [principle]?
   A) Example A
   B) Example B
   C) Example C ✓
   D) Example D`,
        
        rubric: `**Suggested Rubric Criteria:**

| Criteria | Exceeds (4) | Meets (3) | Approaching (2) | Beginning (1) |
|----------|-------------|-----------|----------------|--------------|
| Content | Comprehensive & insightful | Complete & accurate | Partial | Incomplete |
| Organization | Clear flow | Well organized | Some confusion | Disorganized |
| Evidence | Strong support | Adequate support | Limited support | No support |
| Creativity | Highly original | Some originality | Formulaic | Minimal effort`,
        
        announcement: `**Sample Announcement:**

📢 **Important Update for [Course/Class]**

Hi everyone,

I wanted to share some exciting news about [topic]!

**[Key Point 1]** - Details about the first important item.

**[Key Point 2]** - Additional information students need to know.

📅 **Reminder:** Don't forget about [upcoming deadline/event]!

Please reach out if you have any questions.

Best,
[Teacher Name]`,
        
        discussion: `**Discussion Prompt Ideas:**

1. **Opinion-based:** "What are your thoughts on [topic]? How does this relate to your own experiences?"

2. **Analysis:** "Compare and contrast [concept A] with [concept B]. Which do you find more effective and why?"

3. **Application:** "How would you apply [skill/strategy] to solve a real-world problem? Share your approach."

4. **Evaluation:** "Assess the effectiveness of [method/approach]. What evidence supports your evaluation?"

5. **Synthesis:** "If you could combine [elements A and B], what new solution would you create?"`,
        
        description: `**Assignment Description Template:**

📚 **[Assignment Title]**

**Objective:** Students will [learning outcome] by completing [activity].

**Instructions:**
1. [First step]
2. [Second step]
3. [Third step]

**Requirements:**
- [Requirement 1]
- [Requirement 2]

**Resources:**
- [Resource/link 1]
- [Resource/link 2]

**Due Date:** [Date]
**Points:** [Number]

**Grading:** This assignment will be evaluated based on [criteria].`
    };
    
    setTimeout(() => {
        let botMsg = document.createElement('div');
        botMsg.style.cssText = 'background:white; padding:12px 16px; border-radius:12px 12px 12px 4px; margin-bottom:12px; box-shadow:0 2px 4px rgba(0,0,0,0.05); font-size:13px; white-space:pre-wrap; line-height:1.6;';
        botMsg.innerHTML = `<strong style="color:#7c3aed;">🤖 PowerBuddy:</strong><br><br>${responses[task] || 'I can help with that! Try one of the options above.'}`;
        chat.appendChild(botMsg);
        chat.scrollTop = chat.scrollHeight;
    }, 500);
    
    chat.scrollTop = chat.scrollHeight;
}

// ====== COURSE TEMPLATES ======
function initTemplates() {
    if (!db.courseTemplates) {
        db.courseTemplates = [
            {
                id: 'tpl_1',
                name: 'Standard Course',
                description: 'Basic course with folders by week',
                materials: [
                    { type: 'Blue Folder', title: 'Week 1 - Introduction', parent: null },
                    { type: 'Blue Folder', title: 'Week 2 - Fundamentals', parent: null },
                    { type: 'Assignment', title: 'Syllabus Quiz', parent: 'tpl_1_week1' },
                    { type: 'Assignment', title: 'Week 1 Homework', parent: 'tpl_1_week1' },
                    { type: 'Discussion', title: 'Introductions', parent: 'tpl_1_week1' },
                    { type: 'Page', title: 'Course Overview', parent: null }
                ]
            },
            {
                id: 'tpl_2',
                name: 'Project-Based Learning',
                description: 'Course organized around major projects',
                materials: [
                    { type: 'Blue Folder', title: 'Project 1: Research', parent: null },
                    { type: 'Blue Folder', title: 'Project 2: Development', parent: null },
                    { type: 'Blue Folder', title: 'Project 3: Presentation', parent: null },
                    { type: 'Assignment', title: 'Project Proposal', parent: 'tpl_2_proj1' },
                    { type: 'Assignment', title: 'Final Project Submission', parent: 'tpl_2_proj3' },
                    { type: 'Page', title: 'Project Guidelines', parent: null }
                ]
            },
            {
                id: 'tpl_3',
                name: 'Getting Started',
                description: 'Essential first-week materials',
                materials: [
                    { type: 'Page', title: 'Welcome to the Course!', parent: null },
                    { type: 'Page', title: 'Course Syllabus', parent: null },
                    { type: 'Assignment', title: 'Syllabus Agreement', parent: null },
                    { type: 'Discussion', title: 'Get to Know You', parent: null },
                    { type: 'Link', title: 'Technical Requirements', parent: null }
                ]
            }
        ];
        save();
    }
}

function applyCourseTemplate(templateId) {
    let template = db.courseTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    let courseId = state.courseId;
    
    template.materials.forEach(mat => {
        let newId = 'mat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        db.materials.push({
            id: newId,
            courseId: courseId,
            type: mat.type,
            title: mat.title,
            parent: null,
            published: false
        });
    });
    
    save();
    showToast(`Template "${template.name}" applied!`);
    render();
}

// Initialize all new features
initRubrics();
initDiscussions();
initMastery();
initTemplates();
initRegradeRequests();

// ====== REGRADE REQUESTS =====
function initRegradeRequests() {
    if (!db.regradeRequests) db.regradeRequests = [];
}

function requestRegrade(assignId) {
    let reason = prompt('Why do you believe this grade needs to be re-evaluated?\n\nEnter your reason:');
    if (!reason || !reason.trim()) return;
    
    db.regradeRequests.push({
        id: 'rr_' + Date.now(),
        assignId: String(assignId),
        user: state.user,
        reason: reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
    });
    
    save();
    showToast('Regrade request submitted!');
    render();
}

function viewRegradeRequests() {
    let requests = db.regradeRequests.filter(r => {
        let item = db.materials.find(m => String(m.id) === String(r.assignId));
        return item && item.courseId === state.courseId;
    });
    
    let html = requests.map(r => {
        let student = db.users[r.user];
        let item = db.materials.find(m => String(m.id) === String(r.assignId));
        let grade = db.grades.find(g => String(g.assignId) === String(r.assignId) && g.user === r.user);
        let statusColor = r.status === 'pending' ? '#f59e0b' : (r.status === 'approved' ? '#10b981' : '#ef4444');
        
        return `
            <div style="padding:16px; background:var(--bg-hover); border-radius:8px; margin-bottom:12px; border-left:4px solid ${statusColor};">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                    <div>
                        <div style="font-weight:700;">${student?.name || r.user}</div>
                        <div style="font-size:12px; color:var(--text-muted);">${item?.title || 'Unknown Assignment'}</div>
                    </div>
                    <span style="padding:4px 10px; background:${statusColor}; color:white; border-radius:12px; font-size:11px; font-weight:600; text-transform:uppercase;">${r.status}</span>
                </div>
                <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">"${r.reason}"</div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Current Grade: ${grade ? grade.score + '/' + (item?.points || 100) : 'Not graded'}</div>
                ${r.status === 'pending' ? `
                    <div style="display:flex; gap:8px;">
                        <button class="btn-zen" onclick="respondRegrade('${r.id}', 'approved')" style="background:#10b981; color:white; padding:6px 14px; font-size:12px;">✓ Approve</button>
                        <button class="btn-zen" onclick="respondRegrade('${r.id}', 'denied')" style="background:#ef4444; color:white; padding:6px 14px; font-size:12px;">✗ Deny</button>
                        <button class="btn-zen" onclick="openModal('gradeSub', {assignId: '${r.assignId}', user: '${r.user}'})" style="padding:6px 14px; font-size:12px;">View/Edit Grade</button>
                    </div>
                ` : `<div style="font-size:12px; color:var(--text-muted);">Response: ${r.response || 'No response'}</div>`}
            </div>
        `;
    }).join('');
    
    return `
        <div class="col-main">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h3 style="margin:0;">🔄 Regrade Requests</h3>
                <button class="btn-zen" onclick="closeModal()">Close</button>
            </div>
            ${requests.length === 0 ? '<p style="text-align:center; color:var(--text-muted); padding:40px;">No regrade requests for this course.</p>' : html}
        </div>
    `;
}

function respondRegrade(requestId, status) {
    let request = db.regradeRequests.find(r => r.id === requestId);
    if (!request) return;
    
    let response = prompt(`Regrade request for ${db.users[request.user]?.name}:\n\nStatus: ${status}\n\nAdd a response note (optional):`);
    
    request.status = status;
    request.response = response || '';
    request.respondedAt = new Date().toISOString();
    
    save();
    render();
    showToast('Regrade request ' + status + '!');
}

function studentViewRegradeRequests() {
    let requests = db.regradeRequests.filter(r => r.user === state.user);
    
    let html = requests.map(r => {
        let item = db.materials.find(m => String(m.id) === String(r.assignId));
        let grade = db.grades.find(g => String(g.assignId) === String(r.assignId) && g.user === state.user);
        let statusColor = r.status === 'pending' ? '#f59e0b' : (r.status === 'approved' ? '#10b981' : '#ef4444');
        
        return `
            <div style="padding:16px; background:var(--bg-hover); border-radius:8px; margin-bottom:12px; border-left:4px solid ${statusColor};">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                    <div style="font-weight:700;">${item?.title || 'Unknown Assignment'}</div>
                    <span style="padding:4px 10px; background:${statusColor}; color:white; border-radius:12px; font-size:11px; font-weight:600;">${r.status}</span>
                </div>
                <div style="font-size:13px; margin-bottom:8px;">Your reason: "${r.reason}"</div>
                ${r.response ? `<div style="font-size:13px; color:var(--primary);">Teacher response: "${r.response}"</div>` : ''}
            </div>
        `;
    }).join('');
    
    return html || '<p style="text-align:center; color:var(--text-muted);">You have no regrade requests.</p>';
}

// ====== GRADE POLICIES =====
function initGradePolicies() {
    if (!db.gradePolicies) db.gradePolicies = {};
    if (!db.gradePolicies[state.courseId]) {
        db.gradePolicies[state.courseId] = {
            weights: {},
            dropLowest: {},
            weightByType: false
        };
    }
}

function renderGradePolicies() {
    let policies = db.gradePolicies[state.courseId] || { weights: {}, dropLowest: {}, weightByType: false };
    
    let typeOptions = `
        <select id="gpType" onchange="updateGradePolicyUI()" style="width:100%; padding:8px; margin-bottom:10px;">
            <option value="">Select Assignment Type</option>
            <option value="homework">Homework</option>
            <option value="quiz">Quiz</option>
            <option value="test">Test</option>
            <option value="project">Project</option>
            <option value="participation">Participation</option>
            <option value="other">Other</option>
        </select>
    `;
    
    let weightInputs = Object.keys(policies.weights).map(type => `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; padding:8px; background:var(--bg-hover); border-radius:6px;">
            <span style="flex:1; font-weight:600; text-transform:capitalize;">${type}</span>
            <input type="number" id="gpw_${type}" value="${policies.weights[type]}" min="0" max="100" style="width:80px; padding:6px;">
            <span>%</span>
            <button onclick="removeGradeWeight('${type}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px;">✕</button>
        </div>
    `).join('');
    
    let dropInputs = Object.keys(policies.dropLowest).map(type => `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; padding:8px; background:var(--bg-hover); border-radius:6px;">
            <span style="flex:1; font-weight:600; text-transform:capitalize;">${type}</span>
            <span>Drop lowest</span>
            <input type="number" id="gpd_${type}" value="${policies.dropLowest[type]}" min="0" max="10" style="width:60px; padding:6px;">
            <span>grades</span>
            <button onclick="removeDropLowest('${type}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px;">✕</button>
        </div>
    `).join('');
    
    return `
        <div class="post-box" style="margin-bottom:20px;">
            <h3 style="margin-top:0;">⚖️ Grade Weights by Type</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Set weight percentages for each assignment type. Weights should add up to 100%.</p>
            
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                ${typeOptions}
                <input type="number" id="gpWeight" placeholder="Weight %" min="0" max="100" style="width:100px; padding:8px;">
                <button onclick="addGradeWeight()" class="btn-zen primary" style="padding:8px 16px;">Add</button>
            </div>
            
            ${weightInputs || '<p style="color:var(--text-muted); font-size:13px;">No weights set. Add assignment type weights above.</p>'}
            
            <div style="margin-top:15px; padding-top:15px; border-top:1px solid var(--border);">
                <div style="font-weight:600; margin-bottom:8px;">Total Weight: <span id="totalWeight">${Object.values(policies.weights).reduce((a,b) => a + b, 0)}</span>%</div>
                ${Object.values(policies.weights).reduce((a,b) => a + b, 0) !== 100 ? '<div style="color:var(--warning); font-size:12px;">⚠️ Weights should add up to 100%</div>' : '<div style="color:var(--success); font-size:12px;">✓ Weights are balanced</div>'}
            </div>
        </div>
        
        <div class="post-box">
            <h3 style="margin-top:0;">📉 Drop Lowest Grades</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Automatically drop the lowest X grades per category (e.g., drop lowest 2 quizzes).</p>
            
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <select id="gpdType" style="flex:1; padding:8px;">
                    <option value="">Select Assignment Type</option>
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="test">Test</option>
                    <option value="project">Project</option>
                    <option value="participation">Participation</option>
                    <option value="other">Other</option>
                </select>
                <input type="number" id="gpdCount" placeholder="#" min="0" max="10" style="width:60px; padding:8px;">
                <span style="line-height:36px;">grades</span>
                <button onclick="addDropLowest()" class="btn-zen primary" style="padding:8px 16px;">Set</button>
            </div>
            
            ${dropInputs || '<p style="color:var(--text-muted); font-size:13px;">No grades set to drop.</p>'}
        </div>
    `;
}

function addGradeWeight() {
    let type = document.getElementById('gpType').value;
    let weight = Number(document.getElementById('gpWeight').value);
    if (!type || !weight) return alert('Please select a type and enter a weight');
    
    if (!db.gradePolicies[state.courseId]) db.gradePolicies[state.courseId] = { weights: {}, dropLowest: {}, weightByType: false };
    db.gradePolicies[state.courseId].weights[type] = weight;
    save();
    showToast('Weight added!');
    openModal('gradePolicies');
}

function removeGradeWeight(type) {
    if (!db.gradePolicies[state.courseId]) return;
    delete db.gradePolicies[state.courseId].weights[type];
    save();
    openModal('gradePolicies');
}

function addDropLowest() {
    let type = document.getElementById('gpdType').value;
    let count = Number(document.getElementById('gpdCount').value);
    if (!type || count === undefined) return alert('Please select a type and enter a count');
    
    if (!db.gradePolicies[state.courseId]) db.gradePolicies[state.courseId] = { weights: {}, dropLowest: {}, weightByType: false };
    db.gradePolicies[state.courseId].dropLowest[type] = count;
    save();
    showToast('Drop lowest set!');
    openModal('gradePolicies');
}

function removeDropLowest(type) {
    if (!db.gradePolicies[state.courseId]) return;
    delete db.gradePolicies[state.courseId].dropLowest[type];
    save();
    openModal('gradePolicies');
}

// ====== COURSE VIEWS ======
function renderCourseContainer() {
    let course = db.courses.find(c => String(c.id) === String(state.courseId));
    if (!course) return '<div class="col-main"><p>Course not found.</p><button class="btn-zen" onclick="navigate(\'dashboard\')">Back</button></div>';
    
    let role = getEffectiveRole();
    let actualRole = db.users[state.user].role;
    let rightPanel = ''; let mainContent = '';

    if (state.page === 'item') {
        mainContent = renderItemView();
        let item = db.materials.find(m => String(m.id) === String(state.itemId));
        let typeStr = item && item.type ? item.type.toString().toLowerCase() : '';
        if (item && typeStr.includes('assign')) {
            rightPanel = renderRightPanelAssignment(state.itemId, role);
        }
    } 
    else if (state.courseTab === 'materials') { 
        mainContent = renderMaterialsWrapper(course, role); 
        rightPanel = renderRightPanelUpcoming(); 
    } 
    else if (state.courseTab === 'gradebook') {
        mainContent = renderGradebook(course, role);
        rightPanel = '';
    }
    else if (state.courseTab === 'attendance') {
        mainContent = renderAttendance(course, role);
        rightPanel = '';
    }
    else if (state.courseTab === 'rubrics') {
        mainContent = renderRubricsTab(course, role);
        rightPanel = '';
    }
    else if (state.courseTab === 'discussions') {
        mainContent = renderDiscussionsTab(course, role);
        rightPanel = '';
    }
    else if (state.courseTab === 'mastery') {
        mainContent = renderMasteryTab(course, role);
        rightPanel = '';
    }

    let school = db.schools[0];
    let headerStyle = course.image ? 'background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(\'' + course.image + '\'); background-size: cover; background-position: center;' : 'background: linear-gradient(135deg, ' + school.primaryColor + ' 0%, ' + school.secondaryColor + ' 100%);';
    let teacherOptions = (actualRole === 'admin' || actualRole === 'teacher') ? '<div style="margin-bottom:15px; text-align:center;" class="action-links-wrapper"><button class="btn-zen" onclick="toggleDropdown(\'courseOptDrop\', event)">Course Options</button><div id="courseOptDrop" class="dropdown-panel hidden" style="top:30px; left:0; width:180px;"><div style="cursor:pointer; padding:12px 15px; border-bottom:1px solid var(--border);" onclick="copyCourse(\'' + course.id + '\'); toggleDropdown(\'courseOptDrop\');">📋 Copy Course</div><div style="cursor:pointer; padding:12px 15px; border-bottom:1px solid var(--border);" onclick="openModal(\'editCourse\', \'' + course.id + '\'); toggleDropdown(\'courseOptDrop\');">✏️ Edit Info</div><div style="cursor:pointer; padding:12px 15px; border-bottom:1px solid var(--border);" onclick="showJoinCode(\'' + course.id + '\'); toggleDropdown(\'courseOptDrop\');">🔗 Copy Join Code</div><div style="cursor:pointer; padding:12px 15px; color:#ef4444;" onclick="deleteCourse(\'' + course.id + '\'); toggleDropdown(\'courseOptDrop\');">🗑️ Delete Course</div></div></div>' : '';
    let viewToggle = (actualRole === 'admin' || actualRole === 'teacher') ? '<div style="margin-top:15px; padding-top:15px; border-top:1px solid var(--border);"><button style="width:100%; padding:8px; border:none; border-radius:3px; cursor:pointer; font-weight:bold; background:' + (state.viewAsStudent ? '#e74c3c' : 'var(--primary)') + '; color:#fff;" onclick="toggleStudentView()">' + (state.viewAsStudent ? 'Exit Student View' : 'View As Student') + '</button></div>' : '';

    let leftCol = '<div class="col-left"><div class="course-header"><h1>' + course.name + '</h1><div class="section">' + course.section + '</div></div>' + teacherOptions + '<ul class="left-nav-menu">' +
        '<li class="' + (state.courseTab === 'materials' ? 'active' : '') + '" onclick="setCourseTab(\'materials\')">📚 Materials</li>' +
        '<li class="' + (state.courseTab === 'gradebook' ? 'active' : '') + '" onclick="setCourseTab(\'gradebook\')">📊 Gradebook</li>' +
        '<li class="' + (state.courseTab === 'attendance' ? 'active' : '') + '" onclick="setCourseTab(\'attendance\')">📋 Attendance</li>' +
        '<li class="' + (state.courseTab === 'rubrics' ? 'active' : '') + '" onclick="setCourseTab(\'rubrics\')">📋 Rubrics</li>' +
        '<li class="' + (state.courseTab === 'discussions' ? 'active' : '') + '" onclick="setCourseTab(\'discussions\')">💬 Discussions</li>' +
        '<li class="' + (state.courseTab === 'mastery' ? 'active' : '') + '" onclick="setCourseTab(\'mastery\')">🎯 Mastery</li>' +
        '</ul>' + viewToggle + '</div>';
    
    return leftCol + mainContent + rightPanel;
}

function renderRightPanelUpcoming() {
    let upcoming = db.materials.filter(m => String(m.courseId) === String(state.courseId) && m.due && m.published && m.type !== 'Grade Column');
    let upcomingHtml = upcoming.length ? upcoming.map(m => {
        let isFolder = m.type ? m.type.toString().toLowerCase().includes('folder') : false;
        return `<div class="upcoming-item" style="cursor:pointer;" onclick="navigate('${isFolder ? 'folder' : 'item'}', '${m.id}')">📅 ${m.title}</div>`;
    }).join('') : '<p style="font-size:12px; color:#777;">No upcoming assignments.</p>';
    return `<div class="col-right"><div class="widget-box"><div class="right-heading">Upcoming</div>${upcomingHtml}</div></div>`;
}

// ====== RUBRICS TAB ======
function renderRubricsTab(course, role) {
    let isTeacher = role === 'admin' || role === 'teacher';
    let rubricsHtml = db.rubrics.length === 0 ? 
        '<p style="text-align:center; color:var(--text-muted); padding:40px;">No rubrics created yet.</p>' :
        db.rubrics.map(r => `
            <div style="padding:20px; background:var(--bg-hover); border-radius:var(--radius-sm); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0 0 4px 0;">📋 ${r.name}</h4>
                        <p style="margin:0; color:var(--text-muted); font-size:13px;">${r.criteria.length} criteria</p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-zen" onclick="viewRubric('${r.id}')">View</button>
                        ${isTeacher ? `<button class="btn-zen" onclick="deleteRubric('${r.id}')" style="color:var(--danger);">Delete</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    
    return `
        <div class="post-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h3 style="margin:0;">📋 Rubrics</h3>
                ${isTeacher ? '<button class="btn-zen primary" onclick="createRubric()">+ Create Rubric</button>' : ''}
            </div>
            <p style="color:var(--text-secondary); margin-bottom:20px;">Rubrics provide transparent, consistent grading criteria for assignments.</p>
            ${rubricsHtml}
        </div>
    `;
}

function deleteRubric(rubricId) {
    if (!confirm('Delete this rubric?')) return;
    db.rubrics = db.rubrics.filter(r => r.id !== rubricId);
    save();
    render();
    showToast('Rubric deleted');
}

// ====== DISCUSSIONS TAB ======
function renderDiscussionsTab(course, role) {
    let isTeacher = role === 'admin' || role === 'teacher';
    let courseDiscussions = db.discussions.filter(d => String(d.courseId) === String(course.id));
    let discussionsHtml = courseDiscussions.length === 0 ?
        '<p style="text-align:center; color:var(--text-muted); padding:40px;">No discussions yet. Start a conversation!</p>' :
        courseDiscussions.map(d => `
            <div style="padding:20px; background:var(--bg-hover); border-radius:var(--radius-sm); margin-bottom:12px; cursor:pointer;" onclick="viewDiscussion('${d.id}')">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:48px; height:48px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:20px;">
                        ${(db.users[d.createdBy]?.name || d.createdBy || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style="flex:1;">
                        <h4 style="margin:0 0 4px 0;">💬 ${d.title}</h4>
                        <p style="margin:0; color:var(--text-muted); font-size:13px;">${d.posts.length} replies • Started by ${db.users[d.createdBy]?.name || d.createdBy}</p>
                    </div>
                    <span style="font-size:20px;">→</span>
                </div>
            </div>
        `).join('');
    
    return `
        <div class="post-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h3 style="margin:0;">💬 Discussions</h3>
                <button class="btn-zen primary" onclick="createDiscussion()">+ New Discussion</button>
            </div>
            <p style="color:var(--text-secondary); margin-bottom:20px;">Engage with your class through threaded conversations.</p>
            ${discussionsHtml}
        </div>
    `;
}

// ====== MASTERY TAB ======
function renderMasteryTab(course, role) {
    let isTeacher = role === 'admin' || role === 'teacher';
    let standardsHtml = db.standards.map(std => {
        let assessments = db.materials.filter(m => m.standards && m.standards.includes(std.id) && String(m.courseId) === String(course.id));
        let masteryLevel = calculateStandardMastery(std.id, course.id);
        let colors = { 'Mastered': '#10b981', 'Proficient': '#3b82f6', 'Developing': '#f59e0b', 'Beginning': '#ef4444', 'Not Assessed': '#94a3b8', 'Not Attempted': '#94a3b8' };
        return `
            <div style="padding:20px; background:var(--bg-hover); border-radius:var(--radius-sm); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <h4 style="margin:0;">${std.name}</h4>
                            <code style="background:var(--bg-card); padding:4px 8px; border-radius:4px; font-size:12px;">${std.code}</code>
                        </div>
                        <p style="margin:8px 0 0 0; color:var(--text-muted); font-size:13px;">Linked to ${assessments.length} assessments</p>
                    </div>
                    <div style="text-align:right;">
                        <span style="display:inline-block; padding:6px 16px; border-radius:20px; background:${colors[masteryLevel] || '#ccc'}20; color:${colors[masteryLevel] || '#666'}; font-weight:700;">
                            ${masteryLevel}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="post-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h3 style="margin:0;">🎯 Mastery & Standards</h3>
                ${isTeacher ? '<button class="btn-zen primary" onclick="openModal(\'addStandard\')">+ Add Standard</button>' : ''}
            </div>
            <p style="color:var(--text-secondary); margin-bottom:20px;">Track progress against learning standards and objectives.</p>
            ${standardsHtml}
        </div>
    `;
}

// ====== ADD STANDARD MODAL ======
function addStandardModal() {
    let html = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3>Add Learning Standard</h3>
                <div style="margin-bottom:15px;">
                    <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Standard Name</label>
                    <input type="text" id="stdName" placeholder="e.g., Reading Comprehension" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
                </div>
                <div style="margin-bottom:15px;">
                    <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Standard Code</label>
                    <input type="text" id="stdCode" placeholder="e.g., RC.1" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
                </div>
                <div class="modal-buttons">
                    <button class="btn-zen" onclick="closeModal()">Cancel</button>
                    <button class="btn-zen primary" onclick="saveNewStandard()">Add Standard</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function saveNewStandard() {
    let name = document.getElementById('stdName').value.trim();
    let code = document.getElementById('stdCode').value.trim();
    
    if (!name || !code) {
        showToast('Please fill in all fields');
        return;
    }
    
    let id = 'std_' + Date.now();
    db.standards.push({ id, name, code });
    save();
    closeModal();
    render();
    showToast('Standard added!');
}

function renderRightPanelAssignment(itemId, role) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if (!item) return '<div class="col-right"></div>';
    let subPanel = '';

    if (role === 'student') {
        let mySub = db.submissions.find(s => String(s.assignId) === String(item.id) && String(s.user) === String(state.user));
        let grade = db.grades.find(g => String(g.assignId) === String(item.id) && String(g.user) === String(state.user));
        let pastDue = item.due && (new Date() > new Date(item.due));
        let hasTemplate = item.template && item.template.id;
        
            if (mySub && mySub.status !== 'draft') {
            let fileDisplay = mySub.file ? `📎 ${mySub.file}` : `<i>Text Submission</i>`;
            let templateDisplay = mySub.templateFile ? `<div style="margin-top:8px; padding:10px; background:#e8f5e9; border-radius:6px;"><div style="font-weight:600; color:#555; font-size:11px; margin-bottom:4px;">📋 Your Work:</div><a href="${mySub.templateFile.viewUrl}" target="_blank" style="color:#4285f4; font-size:13px;">${mySub.templateFile.name}</a><div style="font-size:10px; color:#888; margin-top:4px;"><a href="${mySub.templateFile.viewUrl}" target="_blank" style="color:#6366f1;">Open →</a></div></div>` : '';
            let driveFilesDisplay = mySub.driveFiles && mySub.driveFiles.length > 0 ? `<div style="margin-top:8px;"><div style="font-weight:600; color:#555; font-size:11px; margin-bottom:4px;">📁 Google Drive Files:</div>${mySub.driveFiles.map(f => `<div style="font-size:12px; margin-left:8px;"><a href="${f.url}" target="_blank" style="color:#4285f4;">${f.name}</a></div>`).join('')}</div>` : '';
            let gradedDisplay = grade ? `<div style="font-weight:bold; color:#1a5b8f; margin-top:5px;">Grade: ${grade.score}/${item.points || 100}</div>` : '';
            let commentDisplay = grade && grade.comment ? `<div style="margin-top:8px; padding:8px; background:#fef9e7; border-radius:4px; font-size:12px; color:#555;"><strong>Teacher Feedback:</strong><br>${grade.comment}</div>` : '';
            let regradeBtn = grade ? `<button class="btn-zen" style="width:100%; margin-top:8px; background:#fef3c7; color:#92400e; border:none;" onclick="requestRegrade('${item.id}')">🔄 Request Regrade</button>` : '';
            let lockWarning = pastDue && item.lockAfterDue ? '<div style="font-size:11px; color:#e74c3c; margin-top:5px;">🔒 This assignment is locked (past due)</div>' : '';
            subPanel = `<div class="post-box" style="padding-bottom:15px;"><h4 style="margin-top:0; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Submissions</h4><div style="margin-bottom:15px;"><div style="font-weight:bold; color:#555; font-size:12px; margin-bottom:5px;">Assignment Submitted</div><span style="font-size:12px; color:#1a5b8f;">${fileDisplay}</span>${templateDisplay}${driveFilesDisplay}${gradedDisplay}${commentDisplay}${lockWarning}</div><button class="btn-zen" style="width:100%;" onclick="openModal('submitAssig', '${item.id}')">${pastDue && item.lockAfterDue ? 'View Submission' : 'Resubmit Assignment'}</button>${regradeBtn}</div>`;
        } else if (hasTemplate && !mySub) {
            subPanel = `<div class="post-box"><h4 style="margin-top:0; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Submissions</h4>
                <div style="padding:15px; background:#fff8e1; border-radius:6px; text-align:center; margin-bottom:10px;">
                    <div style="font-size:14px; margin-bottom:8px;">📋 ${item.template.name}</div>
                    <a href="${item.template.url}" target="_blank" style="display:inline-block; background:#4285f4; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">📄 Open & Make a Copy</a>
                    <div style="font-size:10px; color:#888; margin-top:8px;">1. Open template 2. File → Make a copy 3. Submit link</div>
                </div>
                <button class="btn-zen primary" style="width:100%;" onclick="useTemplate('${item.id}')">Submit My Copy Link</button>
            </div>`;
        } else if (mySub && mySub.templateFile) {
            subPanel = `<div class="post-box"><h4 style="margin-top:0; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Submissions</h4>
                <div style="padding:15px; background:#e8f5e9; border-radius:6px; margin-bottom:10px;">
                    <div style="font-weight:600; color:#555; font-size:12px; margin-bottom:5px;">📋 Submitted Work</div>
                    <a href="${mySub.templateFile.viewUrl}" target="_blank" style="color:#4285f4; font-size:14px; font-weight:600;">${mySub.templateFile.name}</a>
                    <div style="font-size:11px; color:#888; margin-top:5px;">Submitted on ${mySub.date}</div>
                    <a href="${mySub.templateFile.viewUrl}" target="_blank" style="display:inline-block; margin-top:10px; background:#4285f4; color:white; padding:8px 16px; border-radius:4px; text-decoration:none; font-size:12px;">📄 View in Google Docs</a>
                </div>
                <button class="btn-zen primary" style="width:100%;" onclick="useTemplate('${item.id}')">Update Submission</button>
            </div>`;
        } else {
            subPanel = `<div class="post-box"><h4 style="margin-top:0; border-bottom:1px solid #eaeaea; padding-bottom:8px;">Submissions</h4><button class="btn-zen primary" style="width:100%; margin-top:5px;" onclick="openModal('submitAssig', '${item.id}')">Submit Assignment</button></div>`;
        }
    } else {
        let subs = db.submissions.filter(s => String(s.assignId) === String(item.id) && s.status !== 'draft');
        let gradeableCount = subs.filter(s => !db.grades.find(g => String(g.assignId) === String(item.id) && String(g.user) === String(s.user))).length;
        subPanel = `<div class="post-box"><h4 style="margin-top:0; border-bottom:1px solid #ccc; padding-bottom:5px;">Submissions (${subs.length})</h4>${subs.map(s => {
            let grade = db.grades.find(g => String(g.assignId) === String(item.id) && String(g.user) === String(s.user));
            let studentName = db.users[s.user] ? db.users[s.user].name : "Student";
            return `<p style="font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                <span><a style="color:#1a5b8f; cursor:pointer;" onclick="openModal('gradeSub', {assignId: '${item.id}', user: '${s.user}'})">${studentName}</a></span>
                <span>${grade ? `<span style="color:green;">${grade.score}/${item.points}</span>` : `<span style="color:#e67e22;">Needs Grading</span>`}</span>
            </p>`;
        }).join('') || '<p style="font-size:12px;">No submissions yet.</p>'}
        ${gradeableCount > 0 ? `<div style="margin-top:10px; padding-top:10px; border-top:1px solid #eee; font-size:11px; color:#e67e22;">${gradeableCount} submission(s) need grading</div>` : ''}
        <div style="margin-top:10px;">
            <button class="btn-zen" style="width:100%;" onclick="toggleAssignmentLock('${item.id}')">${item.lockAfterDue ? '🔓 Unlock After Due' : '🔒 Lock After Due'}</button>
        </div>
        </div>`;
    }
    return `<div class="col-right">${subPanel}</div>`;
}

function toggleAssignmentLock(itemId) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if(item) {
        item.lockAfterDue = !item.lockAfterDue;
        save(); render();
    }
}

// ====== GRADEBOOK ENGINE ======
function exportGrades(courseId) {
    const course = db.courses.find(c => String(c.id) === String(courseId));
    const assignments = db.materials.filter(m => String(m.courseId) === String(courseId) && (m.type.includes('Assign') || m.type.includes('Assess') || m.type === 'Grade Column'));
    const students = db.enrollments.filter(e => String(e.courseId) === String(courseId)).map(e => db.users[e.user]).filter(u => u && u.role === 'student');
    
    let csv = 'Student,' + assignments.map(a => `"${a.title}"`).join(',') + ',Average\n';
    
    students.forEach(student => {
        let row = [`"${student.name}"`];
        let total = 0, count = 0;
        
        assignments.forEach(a => {
            const grade = db.grades.find(g => String(g.assignId) === String(a.id) && String(g.user) === String(student.name || student));
            if (grade) {
                row.push(grade.score.toString());
                total += grade.score;
                count++;
            } else {
                row.push('');
            }
        });
        
        row.push(count > 0 ? (total / count).toFixed(1) : '');
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.name.replace(/[^a-z0-9]/gi, '_')}_grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addActivity('export', `Exported grades for ${course.name}`);
}

function renderGradebook(course, role) {
    let assignments = db.materials.filter(m => String(m.courseId) === String(course.id) && (m.type.includes('Assign') || m.type.includes('Assess') || m.type === 'Grade Column'));
    if (role === 'student') {
        if (assignments.length === 0) return `<div class="col-main"><div class="post-box"><h3>My Grades</h3><p style="color:var(--text-secondary);">No gradable assignments exist yet.</p></div></div>`;
        let earned = 0; let possible = 0;
        let rows = assignments.map(a => {
            let g = db.grades.find(x => String(x.assignId) === String(a.id) && String(x.user) === String(state.user));
            let pts = a.points || 100;
            let display = '<span style="color:var(--text-muted);">—</span>';
            if (g) {
                if(g.status === 'missing') { display = `<span class="badge badge-danger">0 (Missing)</span>`; possible += pts; }
                else if(g.status === 'excused') { display = `<span class="badge badge-success">Excused</span>`; }
                else if(g.status === 'incomplete') { display = `<span class="badge badge-warning">Incomplete</span>`; }
                else { display = `<strong>${g.score}</strong> / ${pts}`; earned += g.score; possible += pts; }
            }
            return `<tr><td style="padding:14px 16px;">${a.type !== 'Grade Column' ? `<a style="color:var(--primary); font-weight:600;" onclick="navigate('item', '${a.id}')">${a.title}</a>` : `<span style="color:var(--text-secondary);">${a.title}</span>`}</td><td style="padding:14px 16px; text-align:right; font-weight:700;">${display}</td></tr>`;
        }).join('');
        let pct = possible > 0 ? Math.round((earned/possible)*100) : 0;
        let gradeClass = pct >= 90 ? 'badge-success' : (pct >= 70 ? 'badge-warning' : 'badge-danger');
        return `<div class="col-main">
            <div class="post-box" style="padding:0; overflow:hidden;">
                <div style="padding:24px; background:white; border-bottom:2px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <div><strong style="font-size:20px; font-family:'Nunito', sans-serif; color:var(--text-main);">Course Grade</strong></div>
                    <div style="text-align:center;">
                        <div style="font-size:36px; font-weight:800; color:${pct >= 90 ? '#10b981' : (pct >= 70 ? '#f59e0b' : '#ef4444')};">${pct}%</div>
                        <div style="font-size:12px; color:var(--text-muted);">${earned}/${possible} points</div>
                    </div>
                </div>
                <div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:13px; color:var(--text-muted);">Need a grade re-evaluated?</span>
                    <button class="btn-zen" onclick="openModal('myRegradeRequests')" style="padding:6px 14px; font-size:12px;">🔄 My Regrade Requests</button>
                </div>
                <table class="gradebook-table">${rows}</table>
            </div>
        </div>`;
    }
    
    let enrolledUsernames = db.enrollments.filter(e => String(e.courseId) === String(course.id)).map(e => e.user);
    let students = enrolledUsernames.map(u => ({ username: u, data: db.users[u] })).filter(u => u.data.role === 'student');

    if (assignments.length === 0) return `<div class="col-main"><div class="post-box"><h3 style="margin-top:0;">Gradebook</h3><p style="color:var(--text-secondary);">No gradable assignments in this course yet.</p><button class="btn-zen primary" onclick="openModal('addGradeColumn')">+ Add Grade Column</button></div></div>`;
    if (students.length === 0) return `<div class="col-main"><div class="post-box"><h3 style="margin-top:0;">Gradebook</h3><p style="color:var(--text-secondary);">No students enrolled in this course.</p></div></div>`;

    return `
        <div class="col-main">
            <div class="post-box" style="padding:0; overflow-x:auto;">
                <div style="padding:20px; background:white; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <div><strong style="font-size:18px; color:var(--text-main); font-family:'Nunito', sans-serif;">Gradebook</strong><span style="font-size:13px; color:var(--text-muted); margin-left:15px;">${students.length} student${students.length !== 1 ? 's' : ''}</span></div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn-zen" onclick="openModal('gradeCategories', '${course.id}')" style="padding:6px 12px; font-size:12px;">📂</button>
                        <button class="btn-zen" onclick="openModal('gradePolicies')" style="padding:6px 12px; font-size:12px;" title="Grade Policies">⚖️</button>
                        <button class="btn-zen" onclick="openModal('regradeRequests')" style="padding:6px 12px; font-size:12px;" title="Regrade Requests">🔄</button>
                        <button class="btn-zen" onclick="applyGradeCurve('${course.id}')" style="padding:6px 12px; font-size:12px;" title="Apply Grade Curve">📐</button>
                        <button class="btn-zen" onclick="document.body.insertAdjacentHTML('beforeend', showArchivedCourses())" style="padding:6px 12px; font-size:12px;" title="Archived Courses">📦</button>
                        <button class="btn-zen" onclick="document.body.insertAdjacentHTML('beforeend', showBulkImport())" style="padding:6px 12px; font-size:12px;" title="Bulk Import">📥</button>
                        <button class="btn-zen" onclick="exportGrades('${course.id}')" style="padding:6px 12px; font-size:12px;" title="Export CSV">💾</button>
                        <button class="btn-zen" onclick="exportCourseData('${course.id}')" style="padding:6px 12px; font-size:12px;" title="Export JSON">📁</button>
                        <button class="btn-zen" onclick="document.body.insertAdjacentHTML('beforeend', renderSeatingChart())" style="padding:6px 12px; font-size:12px;" title="Seating Chart">🪑</button>
                        <button class="btn-zen" onclick="document.body.insertAdjacentHTML('beforeend', showCourseGoalsUI())" style="padding:6px 12px; font-size:12px;" title="Course Goals">🎯</button>
                        <button class="btn-zen primary" onclick="openModal('addGradeColumn')" style="padding:6px 12px; font-size:12px;">+ Column</button>
                    </div>
                </div>
                <table class="gradebook-table" style="min-width:600px;">
                    <thead>
                        <tr>
                            <th style="position:sticky; left:0; z-index:3; min-width:180px;">Student</th>
                            <th style="min-width:80px;">Avg</th>
                            ${assignments.map(a => `<th style="min-width:110px;">${a.type !== 'Grade Column' ? `<a style="color:var(--primary);" onclick="navigate('item', '${a.id}')">${a.title}</a>` : a.title}<br><span style="font-weight:normal; font-size:11px; color:var(--text-muted);">${a.points || 100} pts</span></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => {
                            let earned = 0; let possible = 0;
                            assignments.forEach(a => {
                                let g = db.grades.find(x => String(x.assignId) === String(a.id) && String(x.user) === String(s.username));
                                if(g) {
                                    if(g.status === 'missing') { possible += (a.points || 100); }
                                    else if(g.status !== 'excused' && g.status !== 'incomplete') { earned += g.score; possible += (a.points || 100); }
                                }
                            });
                            let pct = possible > 0 ? Math.round((earned/possible)*100) : 0;
                            let pctColor = pct >= 90 ? 'var(--success)' : (pct >= 70 ? 'var(--warning)' : 'var(--danger)');
                            
                            return `<tr>
                                <td style="position:sticky; left:0; font-weight:600; background:white;">
                                    ${s.data.picture ? `<img src="${s.data.picture}" style="width:28px; height:28px; border-radius:50%; margin-right:10px; vertical-align:middle; object-fit:cover;">` : `<span style="width:28px; height:28px; border-radius:50%; background:var(--primary); color:white; display:inline-flex; align-items:center; justify-content:center; margin-right:10px; font-weight:700; font-size:12px;">${s.data.name.charAt(0)}</span>`}
                                    ${s.data.name}
                                </td>
                                <td style="font-weight:800; color:${pctColor}; font-size:16px;">${pct}%</td>
                                ${assignments.map(a => {
                                    let grade = db.grades.find(g => String(g.assignId) === String(a.id) && String(g.user) === String(s.username));
                                    let sub = db.submissions.find(sub => String(sub.assignId) === String(a.id) && String(sub.user) === String(s.username));
                                    let val = ''; let cellStyle = '';
                                    if(grade) {
                                        if(grade.status === 'missing') { val = 'M'; cellStyle = 'color:var(--danger); font-weight:700;'; }
                                        else if(grade.status === 'excused') { val = 'E'; cellStyle = 'color:var(--success); font-weight:700;'; }
                                        else if(grade.status === 'incomplete') { val = 'I'; cellStyle = 'color:var(--warning); font-weight:700;'; }
                                        else val = grade.score;
                                    }
                                    return `<td style="vertical-align:middle;">
                                        <div style="display:flex; flex-direction:column; align-items:center;">
                                            <input type="text" value="${val}" style="width:50px; text-align:center; border:2px solid var(--border); padding:6px; border-radius:8px; ${cellStyle}" onchange="inlineSaveGrade('${a.id}', '${s.username}', this.value)" placeholder="—">
                                            ${sub && (!grade || grade.status === 'missing') && sub.status !== 'draft' ? `<span style="font-size:10px; color:var(--text-muted); margin-top:3px;">Submitted</span>` : ''}
                                        </div>
                                    </td>`;
                                }).join('')}
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// ====== ATTENDANCE ENGINE ======
function renderAttendance(course, role) {
    if (role === 'student') return `<div class="col-main"><div class="post-box">Attendance records logic active.</div></div>`;
    let enrolledUsernames = db.enrollments.filter(e => String(e.courseId) === String(course.id)).map(e => e.user);
    let students = enrolledUsernames.map(u => ({ username: u, data: db.users[u] })).filter(u => u.data.role === 'student');
    return `<div class="col-main"><div class="post-box" style="padding:0;"><div style="padding:15px; background:#f4f6f8; border-bottom:1px solid #ccc; display:flex; justify-content:space-between; align-items:center;"><span style="font-weight:bold; color:#1a5b8f;">Daily Attendance</span><input type="date" id="attDateInput" value="${state.attendanceDate}" style="padding:5px; border:1px solid #ccc;" onchange="updateAttendanceDate(this.value)"></div>${students.length === 0 ? `<p style="padding:15px; color:#777;">No students enrolled.</p>` : `<table style="width:100%; border-collapse:collapse; font-size:13px;"><tr style="background:#fafafa; border-bottom:1px solid #ccc;"><th style="padding:10px; text-align:left;">Student Name</th><th style="padding:10px; text-align:center;">✔ Present</th><th style="padding:10px; text-align:center;">❌ Absent</th></tr>${students.map(s => { let record = db.attendance.find(a => String(a.courseId) === String(course.id) && String(a.user) === String(s.username) && a.date === state.attendanceDate); let stat = record ? record.status : ''; return `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px; font-weight:bold;">${s.data.name}</td><td style="padding:10px; text-align:center;"><input type="radio" name="att_${s.username}" ${stat==='present'?'checked':''} onchange="markAttendance('${s.username}', 'present')"></td><td style="padding:10px; text-align:center;"><input type="radio" name="att_${s.username}" ${stat==='absent'?'checked':''} onchange="markAttendance('${s.username}', 'absent')"></td></tr>`; }).join('')}</table>`}</div></div>`;
}

// ====== MATERIALS LIST ENGINE ======
function renderMaterialsWrapper(course, role) {
    let breadcrumbs = `<a style="color:var(--primary); cursor:pointer; text-decoration:none; font-weight:600;" onclick="navigate('course', '${course.id}')">${course.name}</a>`;
    if (state.folderId) {
        let path = []; let curr = db.materials.find(m => String(m.id) === String(state.folderId));
        while (curr) { path.unshift(curr); curr = db.materials.find(m => curr.parent !== null && String(m.id) === String(curr.parent)); }
        path.forEach(f => { breadcrumbs += ` <span style="margin:0 6px; color:var(--text-muted);">›</span> <a style="color:var(--primary); cursor:pointer; font-weight:600;" onclick="navigate('folder', '${f.id}')">${f.title}</a>`; });
    }
    let safeParentIdStr = state.folderId ? `'${state.folderId}'` : 'null';
    let actionBar = role === 'admin' || role === 'teacher' ? `<button class="btn-zen primary" onclick="openModal('chooseMaterial', {parentId: ${safeParentIdStr}, index: 9999})" style="padding:12px 24px; font-size:15px;">✨ Add Materials</button>` : '';
    let listHtml = renderMaterialsRecursive(course.id, state.folderId, role);
    return `<div class="col-main">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div style="font-size:13px; color:var(--text-secondary);">${breadcrumbs}</div>
            ${actionBar}
        </div>
        <div class="materials-wrapper">${listHtml}</div>
    </div>`;
}

function renderMaterialsRecursive(courseId, parentId, role) {
    let safeParentId = parentId !== null && parentId !== undefined ? String(parentId) : null;
    let items = db.materials.filter(m => String(m.courseId) === String(courseId) && (m.parent !== null ? String(m.parent) : null) === safeParentId && m.type !== 'Grade Column');
    let html = '';

    if (items.length === 0) return '<p style="padding:20px; text-align:center; color:var(--text-muted); font-size:14px;">This folder is empty</p>';

    items.forEach((m, idx) => {
        if (role === 'student' && !m.published) return; 

        let isFolder = m.type ? m.type.toString().toLowerCase().includes('folder') : false;
        let isExpanded = state.expandedFolders.includes(String(m.id));
        let iconImg = getIcon(m.type);
        let missingBadge = (role === 'student' && isMissing(m, state.user)) ? '<span class="badge badge-danger" style="margin-left:8px;">MISSING</span>' : '';
        let extraCreditBadge = m.extraCredit ? '<span style="margin-left:8px; font-size:11px; color:#7c3aed; font-weight:600;">⭐ EC</span>' : '';
        let typeBadge = m.assignmentType ? `<span style="margin-left:8px; font-size:10px; color:var(--text-muted); text-transform:capitalize;">${m.assignmentType}</span>` : '';
        let unpubBadge = !m.published ? '<span style="margin-left:8px; font-size:11px; color:var(--warning); font-weight:600;">(Unpublished)</span>' : '';
        let unpubStyle = !m.published ? 'opacity: 0.7;' : '';
        let safeNavId = String(m.id).replace(/'/g, "\\'");
        let safeParent = parentId !== null ? "'" + parentId + "'" : 'null';

        let actionMenu = role === 'admin' || role === 'teacher' ? '<div class="action-links-wrapper" onclick="event.stopPropagation();"><div class="action-gear-icon" onclick="toggleDropdown(\'gearDrop_\' + m.id, event)">⚙️</div><div id="gearDrop_\' + m.id + \'" class="dropdown-panel hidden" style="right:0; top:30px; width:160px;"><div style="padding:12px 15px; cursor:pointer; border-bottom:1px solid var(--border);" onclick="openModal(\'editMaterial\', \'' + safeNavId + '\'); toggleDropdown(\'gearDrop_\' + m.id);">✏️ Edit</div><div style="padding:12px 15px; cursor:pointer; border-bottom:1px solid var(--border);" onclick="duplicateMaterial(\'' + safeNavId + '\'); toggleDropdown(\'gearDrop_\' + m.id);">📋 Duplicate</div><div style="padding:12px 15px; cursor:pointer; border-bottom:1px solid var(--border);" onclick="togglePublish(\'' + safeNavId + '\'); toggleDropdown(\'gearDrop_\' + m.id);">' + (m.published ? '🚫 Unpublish' : '✅ Publish') + '</div><div style="padding:12px 15px; cursor:pointer; color:var(--danger);" onclick="deleteMaterial(\'' + safeNavId + '\'); toggleDropdown(\'gearDrop_\' + m.id);">🗑️ Delete</div></div></div>' : '';

        if (role === 'admin' || role === 'teacher') {
            html += '<div class="insert-line" onclick="openModal(\'chooseMaterial\', {parentId: ' + safeParent + ', index: ' + idx + '})"><div class="insert-line-inner"><div class="insert-line-bar"></div><div class="insert-plus">+</div><div class="insert-line-bar"></div></div></div>';
        }

        if (isFolder) {
            html += '<div class="folder" style="' + unpubStyle + '"><div class="folder-header"><span class="caret ' + (isExpanded ? 'open' : '') + '" onclick="event.stopPropagation(); toggleFolderInline(\'' + m.id + '\')">▶</span><span style="font-size:22px;">' + iconImg + '</span><span style="flex-grow:1; font-size:15px; cursor:pointer;" onclick="navigate(\'folder\', \'' + safeNavId + '\')">' + m.title + missingBadge + extraCreditBadge + typeBadge + unpubBadge + '</span>' + actionMenu + '</div><div class="folder-content ' + (isExpanded ? 'open' : '') + '">' + renderMaterialsRecursive(courseId, m.id, role) + '</div></div>';
        } else {
            html += '<div class="assignment" style="' + unpubStyle + '" onclick="navigate(\'item\', \'' + safeNavId + '\')"><span style="font-size:22px; margin-right:14px;">' + iconImg + '</span><span style="flex-grow:1; font-size:14px; font-weight:500;">' + m.title + missingBadge + extraCreditBadge + typeBadge + unpubBadge + '</span>' + actionMenu + '</div>';
        }
    });

    if (role === 'admin' || role === 'teacher') {
        let safeParent = parentId !== null ? "'" + parentId + "'" : 'null';
        html += '<div class="insert-line" onclick="openModal(\'chooseMaterial\', {parentId: ' + safeParent + ', index: ' + items.length + '})"><div class="insert-line-inner"><div class="insert-line-bar"></div><div class="insert-plus">+</div><div class="insert-line-bar"></div></div></div>';
    }

    return html;
}

// ====== ITEM VIEWS ======
function renderItemView() {
    let item = db.materials.find(m => String(m.id) === String(state.itemId));
    if (!item) return `<div class="col-main"><div class="post-box"><p>Item not found.</p></div></div>`;
    
    let course = db.courses.find(c => String(c.id) === String(item.courseId)) || { id: "1", name: "Course" };
    let breadcrumbs = `<a style="color:var(--accent-color); cursor:pointer;" onclick="navigate('course', '${course.id}')">${course.name}</a>`;
    if (item.parent) {
        let path = []; let curr = db.materials.find(m => String(m.id) === String(item.parent));
        while (curr) { path.unshift(curr); curr = db.materials.find(m => curr.parent !== null && String(m.id) === String(curr.parent)); }
        path.forEach(f => { breadcrumbs += ` <span style="margin:0 5px; color:var(--text-muted);">›</span> <a style="color:var(--accent-color); cursor:pointer;" onclick="navigate('folder', '${f.id}')">${f.title}</a>`; });
    }
    breadcrumbs += ` <span style="margin:0 5px; color:var(--text-muted);">›</span> <span style="color:var(--text-secondary);">${item.title}</span>`;

    let descriptionHTML = item.desc ? '<div style="white-space: pre-wrap; margin-bottom:20px; font-size:15px; line-height:1.6; color:#444;">' + item.desc + '</div>' : '';
    let role = getEffectiveRole();
    let typeStr = item.type ? item.type.toString().toLowerCase() : '';
    let unpubBadge = !item.published ? '<span style="font-size:14px; color:var(--warning); font-weight:600; margin-left:10px;">(Unpublished)</span>' : '';

    if (typeStr.includes('assess')) {
        return renderAssessmentItem(item, role, breadcrumbs, descriptionHTML);
    }

    let viewerHTML = '';
    if (typeStr.includes('pdf') || typeStr.includes('file')) viewerHTML = '<div id="doc-viewer-container" style="border:1px solid #e0e0e0; border-radius:8px; margin-bottom:20px; overflow:hidden;"></div>';
    let dueDate = item.due ? new Date(item.due) : null;
    let isPastDue = dueDate && new Date() > dueDate;
    return '<div class="col-main"><div style="font-size:13px; margin-bottom:15px; color:#888;">' + breadcrumbs + '</div><div class="post-box"><h2 style="margin-top:0; color:#333; display:flex; align-items:center; gap:10px;">' + getIcon(item.type) + ' ' + item.title + unpubBadge + '</h2>' + (item.due ? '<div style="display:flex; gap:20px; margin-bottom:15px; padding:12px; background:' + (isPastDue ? '#fff5f5' : '#f0f7ff') + '; border-radius:6px; font-size:14px;"><span><strong>Due:</strong> ' + item.due + '</span><span><strong>Points:</strong> ' + (item.points || 100) + '</span>' + (isPastDue ? '<span class="badge badge-danger">Past Due</span>' : '') + '</div>' : '') + descriptionHTML + viewerHTML + '</div></div>';
}

// THE NEW ASSESSMENT BUILDER/TAKER ENGINE
function renderAssessmentItem(item, role, breadcrumbs, descriptionHTML) {
    let isStudent = role === 'student';
    let tab = state.assessTab || 'questions';
    let tabNav = '';

    if (!isStudent) {
        tabNav = `
            <div style="display:flex; border-bottom:1px solid #ccc; margin-bottom:15px; font-size:13px; font-weight:bold;">
                <div style="padding:8px 15px; cursor:pointer; ${tab === 'questions' ? 'border-bottom:3px solid #1a5b8f; color:#1a5b8f;' : 'color:#555;'}" onclick="state.assessTab='questions'; render();">Questions</div>
                <div style="padding:8px 15px; cursor:pointer; ${tab === 'settings' ? 'border-bottom:3px solid #1a5b8f; color:#1a5b8f;' : 'color:#555;'}" onclick="state.assessTab='settings'; render();">Settings</div>
                <div style="padding:8px 15px; cursor:pointer; ${tab === 'preview' ? 'border-bottom:3px solid #1a5b8f; color:#1a5b8f;' : 'color:#555;'}" onclick="state.assessTab='preview'; render();">Preview</div>
                <div style="padding:8px 15px; cursor:pointer; ${tab === 'submissions' ? 'border-bottom:3px solid #1a5b8f; color:#1a5b8f;' : 'color:#555;'}" onclick="state.assessTab='submissions'; render();">Submissions</div>
            </div>`;
    }

    let content = '';
    if (isStudent || tab === 'preview') {
        let userSubs = db.submissions.filter(s => String(s.assignId) === String(item.id) && String(s.user) === String(state.user));
        let maxSubs = item.maxSubmissions || 1;
        
        if (isStudent && userSubs.length >= maxSubs) {
            content = `<div style="padding:30px; text-align:center; border:1px solid #ccc; background:#fafafa; border-radius:3px;">
                <h3 style="color:#e74c3c; margin-top:0;">Assessment Completed</h3>
                <p>You have reached the maximum number of submissions (${maxSubs}) for this assessment.</p>
                <p><b>Your Score:</b> Pending Grading</p>
            </div>`;
        } else {
            let questionsHtml = (item.questions || []).map((q, idx) => {
                let optsHtml = '';
                if (q.type === 'radio') {
                    optsHtml = q.options.map(o => `<label style="display:block; margin-bottom:5px; cursor:pointer;"><input type="radio" name="${q.id}" value="${o}"> ${o}</label>`).join('');
                } else if (q.type === 'checkbox') {
                    optsHtml = q.options.map(o => `<label style="display:block; margin-bottom:5px; cursor:pointer;"><input type="checkbox" name="${q.id}" value="${o}"> ${o}</label>`).join('');
                } else if (q.type === 'fileupload') {
                    optsHtml = `<input type="file" id="${q.id}_file" style="margin-top:5px; font-size:12px;">`;
                }
                return `<div style="margin-bottom:20px; padding:15px; background:#f4f6f8; border:1px solid #cddde9; border-radius:3px;">
                    <div style="font-weight:bold; margin-bottom:10px; font-size:14px;">${idx+1}. ${q.text}</div>
                    ${optsHtml}
                </div>`;
            }).join('');
            
            if (!item.questions || item.questions.length === 0) questionsHtml = '<p style="color:#777;">No questions have been added to this assessment yet.</p>';
            
            content = `
                <div style="margin-bottom:15px; padding:10px; background:#eaf1f6; border:1px solid #cddde9; display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:#1a5b8f;">${tab === 'preview' ? '👀 TEACHER PREVIEW MODE' : `Attempt ${userSubs.length + 1} of ${maxSubs}`}</strong>
                </div>
                ${questionsHtml}
                ${item.questions && item.questions.length > 0 ? `<button class="btn-zen primary" style="font-size:16px; padding:10px 20px;" onclick="${isStudent ? `submitAssessment('${item.id}')` : `alert('Preview mode: You cannot submit test data to the database.')`}">Submit Assessment</button>` : ''}
            `;
        }
    } else if (tab === 'questions') {
        let qList = (item.questions || []).map((q, idx) => `
            <div style="padding:15px; border:1px solid #eee; margin-bottom:10px; border-radius:3px; background:#fff;">
                <div style="display:flex; justify-content:space-between;">
                    <div style="font-weight:bold; margin-bottom:5px;">${idx+1}. ${q.text} <span style="font-weight:normal; color:#777; font-size:11px;">(${q.type})</span></div>
                    <button style="color:#e74c3c; background:none; border:none; cursor:pointer; font-size:14px;" title="Delete Question" onclick="deleteQuestion('${item.id}', '${q.id}')">🗑️</button>
                </div>
                ${q.options ? `<div style="font-size:12px; color:#555; padding-left:15px;">• ${q.options.join('<br>• ')}</div>` : ''}
            </div>
        `).join('');
        content = `
            <div style="margin-bottom:15px; display:flex; justify-content:flex-end;">
                <button class="btn-zen primary" onclick="openModal('addQuestion', '${item.id}')">➕ Add Question</button>
            </div>
            ${qList || '<div style="text-align:center; padding:30px; color:#777; border:1px dashed #ccc;">Click "Add Question" to build your assessment.</div>'}
        `;
    } else if (tab === 'settings') {
        content = `
            <div style="max-width:400px;">
                <label style="font-weight:bold; font-size:13px; display:block; margin-bottom:5px;">Submissions Allowed Per Student:</label>
                <input type="number" id="assMaxSub" value="${item.maxSubmissions || 1}" min="1" style="width:100%; padding:8px; margin-bottom:15px; border:1px solid #ccc; box-sizing:border-box;">
                <button class="btn-zen primary" onclick="saveAssSettings('${item.id}')">Save Settings</button>
            </div>
        `;
    } else if (tab === 'submissions') {
        let subs = db.submissions.filter(s => String(s.assignId) === String(item.id) && s.isAssessment);
        let grouped = {};
        subs.forEach(s => {
            if (!grouped[s.user]) grouped[s.user] = [];
            grouped[s.user].push(s);
        });
        
        let subList = Object.keys(grouped).map(uId => {
            let uName = db.users[uId] ? db.users[uId].name : 'Unknown';
            let attempts = grouped[uId];
            return `<div style="padding:10px; border-bottom:1px solid #eee;">
                <strong>${uName}</strong> - ${attempts.length} Attempt(s) completed.
                <div style="font-size:11px; color:#777; margin-top:3px;">Last submitted: ${attempts[attempts.length-1].date}</div>
            </div>`;
        }).join('');
        
        content = `
            <div style="border:1px solid #ccc; border-radius:3px;">
                <div style="background:#f4f6f8; padding:10px; font-weight:bold; border-bottom:1px solid #ccc;">Student Submissions</div>
                ${subList || '<div style="padding:15px; color:#777;">No submissions yet.</div>'}
            </div>`;
    }

    // Assessments take full width (no right panel)
    return `
        <div class="col-main" style="width:100%;">
            <div style="font-size:12px; margin-bottom:15px; font-weight:bold;">${breadcrumbs}</div>
            <div class="post-box">
                <h2 style="margin-top:0; color:#1a5b8f; display:flex; align-items:center;">
                    <span style="margin-right:10px;">${getIcon(item.type)}</span> ${item.title}
                </h2>
                ${item.due ? `<div style="font-size:12px; color:#555; margin-bottom:15px; font-weight:bold;">Due: ${item.due} | Points: ${item.points || 100}</div>` : ''}
                ${descriptionHTML}
                <div style="margin-top:20px; border-top:2px solid #1a5b8f; padding-top:15px;">
                    ${tabNav}
                    ${content}
                </div>
            </div>
        </div>
    `;
}

// ====== MODALS & ACTIONS ======
function renderModal() {
    if (!state.modal) return '';
    let m = state.modal;
    let inner = '';

    if (m.id === 'createCourse') {
        let generatedCode = 'COURSE' + Math.random().toString(36).substring(2, 8).toUpperCase();
        inner = `<h3>Create Course</h3><input id="cName" placeholder="Course Name" style="width:100%; padding:8px; margin-bottom:10px;"><input id="cSection" placeholder="Section Name" style="width:100%; padding:8px; margin-bottom:10px;"><input id="cImage" placeholder="Course Image URL (optional)" style="width:100%; padding:8px; margin-bottom:10px;"><div style="font-size:12px; color:#555; margin-bottom:5px; font-weight:bold;">Join Code:</div><div style="display:flex; gap:10px; margin-bottom:10px;"><input id="cJoinCode" value="${generatedCode}" style="width:70%; padding:8px; border:1px solid #ccc; font-family:monospace; letter-spacing:1px;" readonly><button class="btn-zen" onclick="document.getElementById('cJoinCode').value = 'COURSE' + Math.random().toString(36).substring(2, 8).toUpperCase()" style="padding:8px 12px;">🔄</button></div><div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="createCourse()">Create</button></div>`;
    } else if (m.id === 'addEvent') {
        inner = `<h3>📅 Add Calendar Event</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Event Title</label>
                <input type="text" id="eventTitle" placeholder="e.g., School Holiday" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Date</label>
                <input type="date" id="eventDate" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Type</label>
                <select id="eventType" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
                    <option value="event">Event</option>
                    <option value="reminder">Reminder</option>
                    <option value="assignment">Assignment Due</option>
                </select>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="saveCalendarEvent()">Add Event</button></div>`;
    } else if (m.id === 'createGroup') {
        inner = `<h3>👥 Create Group</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Group Name *</label>
                <input type="text" id="groupName" placeholder="e.g., Math Study Club" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Description</label>
                <textarea id="groupDesc" rows="2" placeholder="What's this group about?" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);"></textarea>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Icon</label>
                <input type="text" id="groupIcon" value="👥" placeholder="Emoji icon" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="processCreateGroup()">Create</button></div>`;
    } else if (m.id === 'addResource') {
        inner = `<h3>📁 Add Resource</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Title *</label>
                <input type="text" id="resourceTitle" placeholder="Resource name" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">URL *</label>
                <input type="text" id="resourceUrl" placeholder="https://..." style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="processAddResource()">Add Resource</button></div>`;
    } else if (m.id === 'newMessage') {
        let users = Object.keys(db.users).filter(u => u !== state.user);
        let userOptions = users.map(u => `<option value="${u}">${db.users[u].name} (${u})</option>`).join('');
        inner = `<h3>💬 New Message</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">To</label>
                <select id="msgRecipient" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">${userOptions}</select>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Message</label>
                <textarea id="msgText" rows="4" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);"></textarea>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="createConversation()">Send</button></div>`;
    } else if (m.id === 'joinCourse') {
        inner = `<h3>Join a Course</h3><div style="margin-bottom:15px;"><input id="jCourseCode" placeholder="Enter Course Join Code" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; font-family:monospace; letter-spacing:1px; text-transform:uppercase;"></div><div id="joinCourseError" style="color:#e74c3c; font-size:12px; margin-bottom:10px; display:none;"></div><div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="joinCourse()">Join Course</button></div>`;
    } else if (m.id === 'adminAddUser') {
        inner = `<h3>Add New User</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Username</label>
                <input type="text" id="newUserName" placeholder="Enter username" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Password</label>
                <input type="password" id="newUserPass" placeholder="Enter password" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Display Name</label>
                <input type="text" id="newUserDisplayName" placeholder="Enter display name" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Role</label>
                <select id="newUserRole" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="adminAddUser()">Add User</button></div>`;
    } else if (m.id === 'editUser') {
        let userToEdit = db.users[m.data];
        inner = `<h3>Edit User: ${m.data}</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Display Name</label>
                <input type="text" id="editUserName" value="${userToEdit.name}" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Password (leave blank to keep current)</label>
                <input type="password" id="editUserPass" placeholder="New password" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Role</label>
                <select id="editUserRole" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
                    <option value="student" ${userToEdit.role === 'student' ? 'selected' : ''}>Student</option>
                    <option value="student" ${userToEdit.role === 'student' ? 'selected' : ''}>Student</option>
                    <option value="teacher" ${userToEdit.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                    <option value="parent" ${userToEdit.role === 'parent' ? 'selected' : ''}>Parent</option>
                    <option value="admin" ${userToEdit.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="adminSaveUser('${m.data}')">Save Changes</button></div>`;
    } else if (m.id === 'gradeCategories') {
        let categories = db.gradeCategories.filter(c => String(c.courseId) === String(m.data));
        let totalWeight = categories.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
        let catRows = categories.length === 0 ?
            '<p style="color:var(--text-muted); text-align:center; padding:20px;">No categories defined. Add one below!</p>' :
            categories.map(cat => `
                <tr>
                    <td style="padding:12px; font-weight:600;">${cat.name}</td>
                    <td style="padding:12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="flex:1; background:#e2e8f0; border-radius:4px; height:8px; overflow:hidden;">
                                <div style="width:${cat.weight}%; height:100%; background:linear-gradient(90deg, var(--primary), var(--accent));"></div>
                            </div>
                            <span style="font-weight:700; min-width:40px;">${cat.weight}%</span>
                        </div>
                    </td>
                    <td style="padding:12px;">
                        <button class="btn-zen" onclick="editCategory('${cat.id}')" style="padding:4px 10px; margin-right:4px;">✏️</button>
                        <button class="btn-zen" onclick="deleteCategory('${cat.id}', '${m.data}')" style="padding:4px 10px; color:var(--danger);">🗑️</button>
                    </td>
                </tr>
            `).join('');
        let weightWarning = totalWeight !== 100 && categories.length > 0 ? 
            `<div style="padding:10px 15px; background:#fef3c7; border-radius:var(--radius-sm); color:#92400e; font-size:13px; margin-top:12px;">⚠️ Total weight is ${totalWeight}% (should be 100%)</div>` : '';
        let weightSuccess = totalWeight === 100 && categories.length > 0 ?
            `<div style="padding:10px 15px; background:#d1fae5; border-radius:var(--radius-sm); color:#065f46; font-size:13px; margin-top:12px;">✅ Weights add up to 100%</div>` : '';
        inner = `<h3>📂 Grade Categories</h3>
            <p style="color:var(--text-secondary); margin-bottom:20px;">Set up weighted grade categories for this course.</p>
            <table class="gradebook-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Weight</th>
                        <th style="width:120px;">Actions</th>
                    </tr>
                </thead>
                <tbody>${catRows}</tbody>
            </table>
            ${weightWarning}
            ${weightSuccess}
            <div style="margin-top:20px; padding:16px; background:var(--bg-hover); border-radius:var(--radius-sm);">
                <h4 style="margin:0 0 12px 0; font-size:14px;">Add New Category</h4>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="newCatName" placeholder="Category name" style="flex:2; padding:10px;">
                    <input type="number" id="newCatWeight" placeholder="Weight %" min="0" max="100" value="10" style="flex:1; padding:10px;">
                    <button class="btn-zen primary" onclick="addGradeCategoryFromModal('${m.data}')">Add</button>
                </div>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>`;
    } else if (m.id === 'addGradeColumn') {
        inner = `<h3>Add Grade Column</h3><input id="gcTitle" placeholder="Column Title" style="width:100%; padding:8px; margin-bottom:10px;"><input id="gcPts" type="number" value="100" style="width:100%; padding:8px; margin-bottom:10px;"><div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="saveGradeColumn()">Create</button></div>`;
    } else if (m.id === 'addCategory') {
        let categories = db.gradeCategories.filter(c => String(c.courseId) === String(m.data));
        let catOptions = categories.length > 0 ? `<div style="margin-bottom:15px;">
            <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Assign to Category</label>
            <select id="catSelect" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
                <option value="">No Category</option>
                ${categories.map(c => `<option value="${c.name}">${c.name} (${c.weight}%)</option>`).join('')}
            </select>
        </div>` : '';
        inner = `<h3>Add Grade Category</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Category Name</label>
                <input type="text" id="catName" placeholder="e.g., Homework, Tests, Projects" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Weight (%)</label>
                <input type="number" id="catWeight" value="10" min="0" max="100" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            ${catOptions}
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="addGradeCategory('${m.data}')">Add Category</button></div>`;
    } else if (m.id === 'gradePolicies') {
        initGradePolicies();
        inner = `<div style="max-height:80vh; overflow-y:auto;">${renderGradePolicies()}</div>`;
    } else if (m.id === 'regradeRequests') {
        inner = viewRegradeRequests();
    } else if (m.id === 'myRegradeRequests') {
        inner = `<h3>🔄 My Regrade Requests</h3>
            <div style="max-height:60vh; overflow-y:auto;">
                ${studentViewRegradeRequests()}
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>`;
    } else if (m.id === 'addQuestion') {
        let item = db.materials.find(x => String(x.id) === String(m.data));
        inner = `<h3>Add Question</h3>
            <select id="qType" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc;" onchange="document.getElementById('qOptsWrapper').style.display = this.value === 'fileupload' ? 'none' : 'block';">
                <option value="radio">Multiple Choice (Radio)</option>
                <option value="checkbox">Multiple Select (Checkbox)</option>
                <option value="fileupload">File Upload</option>
            </select>
            <textarea id="qText" placeholder="Question Text" rows="3" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; box-sizing:border-box;"></textarea>
            <div id="qOptsWrapper">
                <div style="font-size:12px; color:#555; margin-bottom:5px; font-weight:bold;">Answer Options (One per line):</div>
                <textarea id="qOpts" rows="4" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; box-sizing:border-box;" placeholder="A&#10;B&#10;C&#10;D"></textarea>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="saveQuestion('${item.id}')">Add Question</button></div>`;
    } else if (m.id === 'addStandard') {
        inner = `<h3>Add Learning Standard</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Standard Name</label>
                <input type="text" id="stdName" placeholder="e.g., Reading Comprehension" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Standard Code</label>
                <input type="text" id="stdCode" placeholder="e.g., RC.1" style="width:100%; padding:12px; border:2px solid var(--border); border-radius:var(--radius-sm);">
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="saveNewStandard()">Add Standard</button></div>`;
    } else if (m.id === 'submitAssig') {
        let item = db.materials.find(x => String(x.id) === String(m.data));
        let tab = state.submitTab || 'upload';
        let tabNav = `<div style="display:flex; border-bottom:1px solid #ccc; margin-bottom:15px; font-size:13px; font-weight:bold;"><div style="padding:8px 15px; cursor:pointer; ${tab === 'upload' ? 'border-bottom:3px solid #1a5b8f; color:#1a5b8f;' : 'color:#555;'}" onclick="state.submitTab='upload'; render();">Upload</div><div style="padding:8px 15px; cursor:pointer; ${tab === 'create' ? 'border-bottom:3px solid #1a5b8f; color:#1a5b8f;' : 'color:#555;'}" onclick="state.submitTab='create'; render();">Create</div></div>`;
        let tabContent = tab === 'upload' ? `<div style="margin-bottom:15px;">
            <input type="file" id="subFileInput" style="width:100%;">
            <div style="margin-top:10px; padding:10px; background:#f8f9fa; border-radius:6px; text-align:center;">
                <button onclick="openDrivePicker()" style="background:#4285f4; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:8px;">
                    <img src="https://www.gstatic.com/firebasejsui/google-logo.svg" style="height:18px;" alt="G"> Attach from Google Drive
                </button>
                <div id="driveFilesList" style="margin-top:10px; text-align:left;"></div>
            </div>
            <textarea id="subText" placeholder="Add a comment (optional)..." rows="2" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; margin-top:10px;"></textarea>
        </div>` : `<textarea id="subText" placeholder="Enter your response here..." rows="6" style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc;"></textarea><input type="hidden" id="subFileInput">`;
        inner = `<h3>Submit Assignment</h3><div style="font-weight:bold; margin-bottom:15px; color:#1a5b8f;">${item.title}</div>${tabNav}${tabContent}<div class="modal-buttons" style="margin-top:15px;"><button class="btn-zen" onclick="closeModal(); clearDriveFiles();">Cancel</button> <button class="btn-zen primary" onclick="saveSubmission('${item.id}')">Submit</button></div>`;
    } else if (m.id === 'chooseMaterial') {
        let allTypes = [
            { cat: 'Folders', items: ["Blue Folder", "Red Folder", "Orange Folder", "Yellow Folder", "Pink Folder", "Purple Folder", "Black Folder", "White Folder"] },
            { cat: 'Assignments & Assessments', items: ["Assignment", "Assessment"] },
            { cat: 'Content', items: ["Discussion", "Page", "PDF", "Link"] },
            { cat: 'Files & Media', items: ["File", "Media Album", "External Tools", "Web Content", "Video File", "Sound File", "Zip File"] }
        ];
        let safeParentIdStr = m.data.parentId !== null ? `'${m.data.parentId}'` : 'null';
        let typeHtml = allTypes.map(cat => `
            <div style="font-weight:bold; padding:10px 12px; background:#f8f9fa; font-size:12px; border-bottom:1px solid #eee; color:#555;">${cat.cat}</div>
            ${cat.items.map(t => `<div style="padding:10px 14px; cursor:pointer; font-size:13px; display:flex; align-items:center; border-bottom:1px solid #f5f5f5;" onclick="openModal('addGeneric', {type: '${t}', parentId: ${safeParentIdStr}, index: ${m.data.index}})" onmouseover="this.style.backgroundColor='#eaf4fb'" onmouseout="this.style.backgroundColor='transparent'"><span style="width:28px; text-align:center; margin-right:10px; font-size:18px;">${getIcon(t)}</span><span>Add ${t}</span></div>`).join('')}
        `).join('');
        inner = `<h3 style="color:var(--text-primary);">Add Materials</h3><div style="max-height:400px; overflow-y:auto; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary);">${typeHtml}</div><div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button></div>`;
    } else if (m.id === 'addGeneric') {
        let type = m.data.type; let tStr = type.toLowerCase(); let safeParentIdStr = m.data.parentId !== null ? `'${m.data.parentId}'` : 'null';
        let extraInputs = (tStr.includes('file') || tStr.includes('pdf')) ? `<div style="border:1px dashed #ccc; padding:20px; text-align:center; background:#fafafa; margin-bottom:10px;"><div style="font-weight:bold; font-size:12px; margin-bottom:5px;">Select File to Upload</div><input type="file" id="aFile" style="font-size:12px;"></div>` : `<textarea id="aDesc" rows="3" placeholder="Description" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; box-sizing:border-box;"></textarea>`;
        let templateSection = (tStr.includes('assign') || tStr.includes('assess')) ? `
            <div style="margin-top:10px; padding:10px; background:#fff8e1; border-radius:6px;">
                <div style="font-weight:600; font-size:12px; margin-bottom:8px; color:#f57c00;">📋 Google Docs Template (Optional)</div>
                <button onclick="openTemplatePicker()" style="background:#4285f4; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:12px;">Choose Template from Drive</button>
                <div id="templateSelection"></div>
            </div>
        ` : '';
        let assignOptions = tStr.includes('assign') || tStr.includes('assess') ? `
            <input id="aDue" type="date" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; box-sizing:border-box;">
            <input id="aPts" type="number" placeholder="Points" value="100" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; box-sizing:border-box;">
            <div style="margin-bottom:10px; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="aExtraCredit" style="width:18px; height:18px;">
                <label for="aExtraCredit" style="font-size:13px; color:#7c3aed; font-weight:600;">⭐ Extra Credit</label>
            </div>
            <div style="margin-bottom:10px;">
                <label style="font-size:12px; color:#555; margin-bottom:5px; display:block;">Assignment Type:</label>
                <select id="aType" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="test">Test</option>
                    <option value="project">Project</option>
                    <option value="participation">Participation</option>
                    <option value="other">Other</option>
                </select>
            </div>
        ` : '';
        inner = `<h3 style="display:flex; align-items:center; margin-top:0;"><span style="margin-right:10px;">${getIcon(type)}</span> Add ${type}</h3><input id="aTitle" placeholder="Title" value="New ${type}" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc; box-sizing:border-box;">${extraInputs}${templateSection}${assignOptions}<div class="modal-buttons"><button class="btn-zen" onclick="openModal('chooseMaterial', {parentId: ${safeParentIdStr}, index: ${m.data.index}}); currentTemplateFile = null;">Back</button> <button class="btn-zen primary" onclick="createGenericMaterial('${type}', ${safeParentIdStr}, ${m.data.index})">Create</button></div>`;
    } else if (m.id === 'userSettings') {
        let user = db.users[state.user];
        let currentPic = user.picture || '';
        inner = `<h3>User Settings</h3>
            <div style="text-align:center; margin-bottom:20px;">
                <div style="margin-bottom:15px;">
                    <label style="display:block; font-size:12px; margin-bottom:8px; color:var(--text-secondary); font-weight:600;">Profile Picture</label>
                    <div id="profilePicContainer">
                        <div class="image-upload-container" style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                            <div id="profilePic-preview" onclick="document.getElementById('profilePic-input').click()" style="width:100px; height:100px; border-radius:50%; background:${currentPic ? `url('${currentPic}')` : '#e5e7eb'}; background-size:cover; background-position:center; cursor:pointer; border:2px dashed #d1d5db; display:flex; align-items:center; justify-content:center; overflow:hidden; transition:all 0.2s;" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='#d1d5db'">
                                ${!currentPic ? `<span style="font-size:36px; color:#9ca3af;">📷</span>` : ''}
                            </div>
                            <input type="file" id="profilePic-input" accept="image/*" style="display:none;" onchange="handleImageSelect(this, 'profilePic', 'updateProfilePicUrl')">
                            <button type="button" onclick="document.getElementById('profilePic-input').click()" class="btn-zen" style="font-size:12px; padding:6px 16px;">Upload Image</button>
                            <div style="font-size:11px; color:#6b7280;">JPG, PNG, GIF, WebP up to 5MB</div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:5px;">Username:</label>
                <input type="text" value="${state.user}" disabled style="width:100%; padding:8px; background:#f0f0f0; border:1px solid #ccc; box-sizing:border-box;">
                <div style="font-size:11px; color:#777; margin-top:3px;">Username cannot be changed</div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:5px;">Display Name:</label>
                <input type="text" id="sDisplayName" value="${user.name}" disabled style="width:100%; padding:8px; background:#f0f0f0; border:1px solid #ccc; box-sizing:border-box;">
                <div style="font-size:11px; color:#777; margin-top:3px;">Contact an administrator to change your name</div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:5px;">Role:</label>
                <input type="text" value="${user.role}" disabled style="width:100%; padding:8px; background:#f0f0f0; border:1px solid #ccc; box-sizing:border-box; text-transform:capitalize;">
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="saveUserSettings()">Save Settings</button></div>`;
    } else if (m.id === 'gradeSub') {
        let item = db.materials.find(x => String(x.id) === String(m.data.assignId));
        let studentUser = m.data.user;
        let student = db.users[studentUser];
        let sub = db.submissions.find(s => String(s.assignId) === String(m.data.assignId) && String(s.user) === String(studentUser));
        let grade = db.grades.find(g => String(g.assignId) === String(m.data.assignId) && String(g.user) === String(studentUser));
        let templateDisplay = sub && sub.templateFile ? `<div style="margin-bottom:15px; padding:15px; background:#e8f5e9; border-radius:6px;"><div style="font-weight:600; font-size:12px; margin-bottom:5px; color:#2e7d32;">📋 Student's Work</div><a href="${sub.templateFile.viewUrl}" target="_blank" style="color:#4285f4; font-size:14px; font-weight:600;">${sub.templateFile.name}</a><br><a href="${sub.templateFile.viewUrl}" target="_blank" class="btn-zen" style="display:inline-block; margin-top:10px; padding:8px 16px; font-size:12px; background:#4285f4; color:white; border:none; border-radius:4px; text-decoration:none;">📄 Open in Google Docs</a></div>` : '';
        let driveFilesDisplay = sub && sub.driveFiles && sub.driveFiles.length > 0 ? `<div style="margin-bottom:15px;"><div style="font-weight:600; font-size:12px; margin-bottom:5px;">📁 Attached Files:</div>${sub.driveFiles.map(f => `<div style="padding:8px; background:#f0f7ff; border-radius:4px; margin-bottom:5px;"><a href="${f.url}" target="_blank" style="color:#4285f4;">${f.name}</a></div>`).join('')}</div>` : '';
        inner = `<h3>Grade Submission</h3>
            <div style="margin-bottom:15px; padding:10px; background:#f4f6f8; border:1px solid #e0e0e0; border-radius:3px;">
                <div style="font-weight:bold; margin-bottom:5px;">Student: ${student ? student.name : studentUser}</div>
                <div style="font-size:12px; color:#666;">${sub ? `Submitted: ${sub.date}` : 'No submission'}</div>
            </div>
            ${templateDisplay}
            ${sub ? `<div style="margin-bottom:15px;"><strong>Submission:</strong><div style="padding:10px; background:#fafafa; border:1px solid #eee; border-radius:3px; margin-top:5px; font-size:13px;">${sub.file ? `📎 ${sub.file}` : (sub.text || 'No text content')}</div></div>${driveFilesDisplay}` : ''}
            ${item.extraCredit ? `<div style="margin-bottom:15px; padding:10px; background:#fef3c7; border-radius:6px; font-size:12px; color:#92400e;">⭐ This is an Extra Credit assignment - scores can exceed the normal point value.</div>` : ''}
            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:5px;">Grade (out of ${item.points || 100}${item.extraCredit ? ' + bonus' : ''}):</label>
                <input type="number" id="gScore" value="${grade ? grade.score : ''}" min="0" style="width:100%; padding:8px; border:1px solid #ccc; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; font-size:12px; display:block; margin-bottom:5px;">Comment (optional):</label>
                <textarea id="gComment" rows="2" placeholder="Add feedback for the student..." style="width:100%; padding:8px; border:1px solid #ccc; box-sizing:border-box; border-radius:4px;">${grade?.comment || ''}</textarea>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen" onclick="teacherUnsubmit('${m.data.assignId}', '${studentUser}')" style="margin-right:5px;">↩️ Unsubmit</button> <button class="btn-zen primary" onclick="saveGrade('${m.data.assignId}', '${studentUser}')">Save Grade</button></div>`;
    } else if (m.id === 'editMaterial') {
        let item = db.materials.find(x => String(x.id) === String(m.data));
        let tStr = item.type ? item.type.toLowerCase() : '';
        let isAssignment = tStr.includes('assign') || tStr.includes('assess');
        inner = `<h3 style="color:var(--text-primary);">Edit ${item.type}</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Title</label>
                <input type="text" id="eTitle" value="${item.title}" style="width:100%; padding:10px; border:1px solid var(--border-color); box-sizing:border-box; border-radius:4px;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Description</label>
                <textarea id="eDesc" rows="3" style="width:100%; padding:10px; border:1px solid var(--border-color); box-sizing:border-box; border-radius:4px;">${item.desc || ''}</textarea>
            </div>
            ${isAssignment ? `
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Due Date</label>
                <input type="date" id="eDue" value="${item.due || ''}" style="width:100%; padding:10px; border:1px solid var(--border-color); box-sizing:border-box; border-radius:4px;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Points</label>
                <input type="number" id="ePts" value="${item.points || 100}" style="width:100%; padding:10px; border:1px solid var(--border-color); box-sizing:border-box; border-radius:4px;">
            </div>
            <div style="margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="eExtraCredit" ${item.extraCredit ? 'checked' : ''} style="width:18px; height:18px;">
                <label for="eExtraCredit" style="font-size:13px; color:#7c3aed; font-weight:600;">⭐ Extra Credit</label>
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Assignment Type</label>
                <select id="eAssignType" style="width:100%; padding:10px; border:1px solid var(--border-color); box-sizing:border-box; border-radius:4px;">
                    <option value="homework" ${item.assignmentType === 'homework' ? 'selected' : ''}>Homework</option>
                    <option value="quiz" ${item.assignmentType === 'quiz' ? 'selected' : ''}>Quiz</option>
                    <option value="test" ${item.assignmentType === 'test' ? 'selected' : ''}>Test</option>
                    <option value="project" ${item.assignmentType === 'project' ? 'selected' : ''}>Project</option>
                    <option value="participation" ${item.assignmentType === 'participation' ? 'selected' : ''}>Participation</option>
                    <option value="other" ${(!item.assignmentType || item.assignmentType === 'other') ? 'selected' : ''}>Other</option>
                </select>
            </div>` : ''}
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="saveEditMaterial('${item.id}')">Save Changes</button></div>`;
    } else if (m.id === 'editCourse') {
        let course = db.courses.find(x => String(x.id) === String(m.data));
        inner = `<h3 style="color:var(--text-primary);">Edit Course</h3>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Course Name</label>
                <input type="text" id="ecName" value="${course.name}" style="width:100%; padding:10px; border:1px solid var(--border-color); box-sizing:border-box; border-radius:4px;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Section</label>
                <input type="text" id="ecSection" value="${course.section || ''}" style="width:100%; padding:10px; border:1px solid var(--border-color); box-sizing:border-box; border-radius:4px;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:12px; margin-bottom:5px; color:var(--text-secondary);">Course Image (optional)</label>
                <div class="image-upload-container" style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <div id="courseImage-preview" onclick="document.getElementById('courseImage-input').click()" style="width:100%; height:120px; border-radius:8px; background:${course.image ? `url('${course.image}')` : '#e5e7eb'}; background-size:cover; background-position:center; cursor:pointer; border:2px dashed #d1d5db; display:flex; align-items:center; justify-content:center; overflow:hidden; transition:all 0.2s;" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='#d1d5db'">
                        ${!course.image ? `<span style="font-size:24px; color:#9ca3af;">🏞️ Add Image</span>` : ''}
                    </div>
                    <input type="file" id="courseImage-input" accept="image/*" style="display:none;" onchange="handleImageSelect(this, 'courseImage', 'updateCourseImageUrl')">
                    <button type="button" onclick="document.getElementById('courseImage-input').click()" class="btn-zen" style="font-size:12px; padding:6px 16px;">Upload Image</button>
                    <div style="font-size:11px; color:#6b7280;">Recommended: 1200x400px, JPG, PNG, WebP up to 5MB</div>
                </div>
            </div>
            <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Cancel</button> <button class="btn-zen primary" onclick="saveEditCourse('${course.id}')">Save Changes</button></div>`;
    } else if (m.id === 'createDeck') {
        inner = openCreateDeckModal();
    } else if (m.id === 'createGoal') {
        inner = openCreateGoalModal();
    } else if (m.id === 'addFriend') {
        inner = openAddFriendModal();
    } else if (m.id === 'addCard') {
        const deckId = m.data;
        inner = `<h3>Add Flashcard</h3>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Front (Question)</label>
                <textarea id="cardFront" rows="3" placeholder="Enter the question or term..." style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 10px; resize: vertical;"></textarea>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Back (Answer)</label>
                <textarea id="cardBack" rows="3" placeholder="Enter the answer or definition..." style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 10px; resize: vertical;"></textarea>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Tags (optional)</label>
                <input type="text" id="cardTags" placeholder="e.g., chapter1, important (comma separated)" style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 10px;">
            </div>
            <div class="modal-buttons">
                <button class="btn-zen" onclick="closeModal()">Cancel</button>
                <button class="btn-zen primary" onclick="submitAddCard('${deckId}')">Add Card</button>
            </div>`;
    }

    return `<div class="modal-overlay"><div class="modal-content" style="width:500px;">${inner}</div></div>`;
}

// ==== Core Functions ====
function inlineSaveGrade(assignId, studentUser, val) {
    db.grades = db.grades.filter(g => !(String(g.assignId) === String(assignId) && String(g.user) === String(studentUser)));
    val = val.trim().toUpperCase();
    if (val === 'M') { db.grades.push({ assignId: String(assignId), user: String(studentUser), score: 0, status: 'missing' }); } 
    else if (val === 'E') { db.grades.push({ assignId: String(assignId), user: String(studentUser), score: null, status: 'excused' }); } 
    else if (val === 'I') { db.grades.push({ assignId: String(assignId), user: String(studentUser), score: null, status: 'incomplete' }); } 
    else if (val !== '' && !isNaN(val)) { db.grades.push({ assignId: String(assignId), user: String(studentUser), score: Number(val), status: 'graded' }); }
    save(); render(); 
}

function saveGradeColumn() {
    let title = document.getElementById('gcTitle').value; let pts = document.getElementById('gcPts').value;
    if(!title) return;
    db.materials.push({ id: Date.now().toString(), courseId: String(state.courseId), type: 'Grade Column', title: title, parent: null, published: true, points: Number(pts) || 100 });
    save(); closeModal(); render();
}

// Assessment Builder/Taker Logic
function saveQuestion(itemId) {
    let item = db.materials.find(x => String(x.id) === String(itemId));
    if (!item.questions) item.questions = [];
    let qType = document.getElementById('qType').value;
    let qText = document.getElementById('qText').value;
    let qOpts = document.getElementById('qOpts').value.split('\n').map(s=>s.trim()).filter(s=>s);
    item.questions.push({ id: 'q_'+Date.now(), type: qType, text: qText, options: qOpts });
    save(); closeModal(); render();
}
function deleteQuestion(assId, qId) {
    let item = db.materials.find(m => String(m.id) === String(assId));
    if(item && item.questions) { item.questions = item.questions.filter(q => q.id !== qId); save(); render(); }
}

function submitAddCard(deckId) {
    const front = document.getElementById('cardFront').value.trim();
    const back = document.getElementById('cardBack').value.trim();
    const tagsStr = document.getElementById('cardTags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
    
    if (!front || !back) {
        showToast('Please enter both front and back of the card');
        return;
    }
    
    addFlashcard(deckId, front, back, tags);
    closeModal();
    showToast('Flashcard added!');
    render();
}
function saveAssSettings(id) {
    let item = db.materials.find(m => String(m.id) === String(id));
    item.maxSubmissions = Number(document.getElementById('assMaxSub').value) || 1;
    save(); render();
}
function submitAssessment(id) {
    let item = db.materials.find(m => String(m.id) === String(id));
    let maxSubs = item.maxSubmissions || 1;
    let userSubs = db.submissions.filter(s => String(s.assignId) === String(id) && String(s.user) === String(state.user));
    if (userSubs.length >= maxSubs) return alert("Maximum submissions reached.");
    
    db.submissions.push({ assignId: String(id), user: String(state.user), date: new Date().toLocaleDateString(), status: 'submitted', isAssessment: true });
    save(); render();
}

// Submissions
function createGenericMaterial(type, parentId, insertIndex) {
    let title = document.getElementById('aTitle').value; if(!title) return;
    let safeParentId = (parentId === null || parentId === undefined || parentId === 'null') ? null : String(parentId);
    let desc = document.getElementById('aDesc') ? document.getElementById('aDesc').value : '';
    let fileInput = document.getElementById('aFile');
    let fileName = (fileInput && fileInput.files.length > 0) ? fileInput.files[0].name : null;
    let finalDesc = fileName ? `Attached File: ${fileName}` : desc;
    let template = currentTemplateFile ? { id: currentTemplateFile.id, name: currentTemplateFile.name, url: currentTemplateFile.url } : null;
    let isAssignmentType = type.toLowerCase().includes('assign') || type.toLowerCase().includes('assess');

    let obj = { 
        id: Date.now().toString(), 
        courseId: String(state.courseId), 
        type: type, 
        title: title, 
        desc: finalDesc, 
        parent: safeParentId, 
        published: true, 
        due: isAssignmentType && document.getElementById('aDue') ? document.getElementById('aDue').value : undefined, 
        points: isAssignmentType && document.getElementById('aPts') ? Number(document.getElementById('aPts').value) : undefined, 
        extraCredit: isAssignmentType && document.getElementById('aExtraCredit') ? document.getElementById('aExtraCredit').checked : false,
        assignmentType: isAssignmentType && document.getElementById('aType') ? document.getElementById('aType').value : null,
        lockAfterDue: false,
        maxSubmissions: type.toLowerCase() === 'assessment' ? 1 : undefined, 
        questions: type.toLowerCase() === 'assessment' ? [] : undefined,
        template: template
    };
    
    currentTemplateFile = null;
    
    if (insertIndex === 9999) db.materials.push(obj); 
    else {
        let itemsInFolder = db.materials.filter(m => String(m.courseId) === String(state.courseId) && (m.parent !== null ? String(m.parent) : null) === safeParentId);
        if (insertIndex < itemsInFolder.length) {
            let targetItem = itemsInFolder[insertIndex];
            let absIndex = db.materials.findIndex(m => String(m.id) === String(targetItem.id));
            db.materials.splice(absIndex, 0, obj);
        } else db.materials.push(obj);
    }
    save(); closeModal(); render();
}

function saveSubmission(assignId) {
    let text = document.getElementById('subText') ? document.getElementById('subText').value : ''; 
    let fileInput = document.getElementById('subFileInput');
    let fileName = (fileInput && fileInput.files && fileInput.files.length > 0) ? fileInput.files[0].name : null;
    let driveFiles = getDriveFilesForSubmission();
    if(!text && !fileName && driveFiles.length === 0 && state.submitTab !== 'resources') return alert("Please enter text, select a file, or attach from Google Drive.");
    db.submissions = db.submissions.filter(s => !(String(s.assignId) === String(assignId) && String(s.user) === String(state.user)));
    db.submissions.push({ 
        assignId: String(assignId), 
        user: String(state.user), 
        file: fileName, 
        text: text, 
        date: new Date().toLocaleDateString(), 
        status: 'submitted',
        driveFiles: driveFiles.length > 0 ? driveFiles : null
    });
    clearDriveFiles();
    save(); closeModal(); render();
}

function saveEditMaterial(itemId) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if(!item) return;
    let title = document.getElementById('eTitle').value;
    let desc = document.getElementById('eDesc').value;
    if(!title) return alert("Title is required");
    item.title = title;
    item.desc = desc;
    if(document.getElementById('eDue')) item.due = document.getElementById('eDue').value;
    if(document.getElementById('ePts')) item.points = Number(document.getElementById('ePts').value);
    if(document.getElementById('eExtraCredit')) item.extraCredit = document.getElementById('eExtraCredit').checked;
    if(document.getElementById('eAssignType')) item.assignmentType = document.getElementById('eAssignType').value;
    save(); closeModal(); render();
}

function deleteCourse(courseId) {
    if(!confirm("Are you sure you want to delete this course?\n\nThis will also delete all assignments, submissions, and grades in this course. This cannot be undone.")) return;
    
    db.courses = db.courses.filter(c => String(c.id) !== String(courseId));
    db.materials = db.materials.filter(m => String(m.courseId) !== String(courseId));
    db.submissions = db.submissions.filter(s => {
        let mat = db.materials.find(m => String(m.id) === String(s.assignId));
        return mat !== undefined;
    });
    db.enrollments = db.enrollments.filter(e => String(e.courseId) !== String(courseId));
    db.grades = db.grades.filter(g => {
        let mat = db.materials.find(m => String(m.id) === String(g.assignId));
        return mat !== undefined;
    });
    
    save();
    showToast('Course deleted');
    navigate('dashboard');
}

window.createCourse = function() {
    let name = document.getElementById('cName').value;
    let section = document.getElementById('cSection').value;
    let joinCode = document.getElementById('cJoinCode').value;
    
    if (!name) {
        alert("Course name is required");
        return;
    }
    
    let newCourse = {
        id: Date.now().toString(),
        name: name,
        section: section || 'Section 1',
        teacher: state.user,
        joinCode: joinCode || 'COURSE' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        image: null
    };
    
    db.courses.push(newCourse);
    
    db.enrollments.push({
        user: state.user,
        courseId: newCourse.id
    });
    
    save();
    closeModal();
    showToast('Course created!');
    navigate('course', newCourse.id);
};

function saveEditCourse(courseId) {
    let course = db.courses.find(c => String(c.id) === String(courseId));
    if(!course) return;
    let name = document.getElementById('ecName').value;
    let section = document.getElementById('ecSection').value;
    if(!name) return alert("Course name is required");
    course.name = name;
    course.section = section;
    course.image = tempUploadedImage || null;
    tempUploadedImage = null;
    save(); closeModal(); render();
}

function saveUserSettings() {
    let user = db.users[state.user];
    if(!user) return;
    user.picture = tempUploadedImage || user.picture || '';
    tempUploadedImage = null;
    save(); closeModal(); render();
}

function togglePublish(itemId) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if(item) {
        item.published = !item.published;
        save(); render();
    }
}

function duplicateMaterial(itemId) {
    let original = db.materials.find(m => String(m.id) === String(itemId));
    if (!original) {
        showToast('Material not found');
        return;
    }
    
    let newId = 'mat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    let newMaterial = {
        ...original,
        id: newId,
        title: original.title + ' (Copy)',
        published: false
    };
    
    db.materials.push(newMaterial);
    save();
    render();
    showToast('Material duplicated!');
}

function deleteMaterial(itemId) {
    if(!confirm("Are you sure you want to delete this item?")) return;
    db.materials = db.materials.filter(m => String(m.id) !== String(itemId));
    save(); render();
}

function updateAttendanceDate(date) {
    state.attendanceDate = date;
    render();
}

function markAttendance(user, status) {
    let existing = db.attendance.findIndex(a => String(a.courseId) === String(state.courseId) && String(a.user) === String(user) && a.date === state.attendanceDate);
    if(existing >= 0) {
        db.attendance[existing].status = status;
    } else {
        db.attendance.push({ courseId: String(state.courseId), user: String(user), date: state.attendanceDate, status: status });
    }
    save();
}

// ====== FEATURE 1: COURSE FAVORITES =====
function initFavorites() {
    if (!db.favorites) db.favorites = [];
}

function toggleFavorite(courseId) {
    initFavorites();
    let idx = db.favorites.indexOf(courseId);
    if (idx >= 0) {
        db.favorites.splice(idx, 1);
        showToast('Removed from favorites');
    } else {
        db.favorites.push(courseId);
        showToast('Added to favorites');
    }
    save(); render();
}

function isFavorite(courseId) {
    initFavorites();
    return db.favorites.includes(courseId);
}

// ====== FEATURE 2: ASSIGNMENT TAGS =====
function initTags() {
    if (!db.tags) db.tags = [];
}

function addTagToItem(itemId, tag) {
    initTags();
    let itemTags = db.tags.filter(t => t.itemId === itemId);
    if (!itemTags.find(t => t.tag === tag)) {
        db.tags.push({ itemId: itemId, tag: tag });
        save();
    }
}

function getTagsForItem(itemId) {
    initTags();
    return db.tags.filter(t => t.itemId === itemId).map(t => t.tag);
}

function renderTagFilter() {
    initTags();
    let allTags = [...new Set(db.tags.map(t => t.tag))];
    if (allTags.length === 0) return '';
    return `<div style="margin-bottom:15px; padding:10px; background:var(--bg-hover); border-radius:8px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Filter by Tags:</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${allTags.map(tag => `<span onclick="filterByTag('${tag}')" style="padding:4px 10px; background:var(--primary); color:white; border-radius:12px; font-size:11px; cursor:pointer;">${tag}</span>`).join('')}
            <span onclick="clearTagFilter()" style="padding:4px 10px; background:var(--text-muted); color:white; border-radius:12px; font-size:11px; cursor:pointer;">Clear</span>
        </div>
    </div>`;
}

function filterByTag(tag) {
    state.tagFilter = tag;
    render();
}

function clearTagFilter() {
    state.tagFilter = null;
    render();
}

// ====== FEATURE 3: BULK ACTIONS =====
function bulkPublish(itemIds) {
    itemIds.forEach(id => {
        let item = db.materials.find(m => String(m.id) === String(id));
        if (item) item.published = true;
    });
    save(); render();
    showToast(`${itemIds.length} items published!`);
}

function bulkDelete(itemIds) {
    if (!confirm(`Delete ${itemIds.length} items?`)) return;
    db.materials = db.materials.filter(m => !itemIds.includes(m.id));
    save(); render();
    showToast(`${itemIds.length} items deleted!`);
}

function toggleBulkSelectMode() {
    state.bulkSelectMode = !state.bulkSelectMode;
    state.selectedItems = [];
    render();
}

function toggleItemSelect(itemId) {
    if (!state.selectedItems) state.selectedItems = [];
    let idx = state.selectedItems.indexOf(itemId);
    if (idx >= 0) {
        state.selectedItems.splice(idx, 1);
    } else {
        state.selectedItems.push(itemId);
    }
}

// ====== FEATURE 4: COURSE ARCHIVE =====
function initArchive() {
    if (!db.archivedCourses) db.archivedCourses = [];
}

function archiveCourse(courseId) {
    if (!confirm('Archive this course? It will be hidden from the main dashboard.')) return;
    initArchive();
    db.archivedCourses.push({ courseId: courseId, archivedAt: new Date().toISOString() });
    save();
    showToast('Course archived');
    navigate('dashboard');
}

function unarchiveCourse(courseId) {
    initArchive();
    db.archivedCourses = db.archivedCourses.filter(a => a.courseId !== courseId);
    save();
    showToast('Course restored');
    render();
}

function showArchivedCourses() {
    initArchive();
    let archived = db.archivedCourses.map(a => {
        let course = db.courses.find(c => String(c.id) === String(a.courseId));
        return course ? `<div style="padding:12px; background:var(--bg-hover); border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:600;">${course.name}</div>
                <div style="font-size:11px; color:var(--text-muted);">Archived ${new Date(a.archivedAt).toLocaleDateString()}</div>
            </div>
            <button class="btn-zen" onclick="unarchiveCourse('${course.id}')" style="padding:6px 12px;">Restore</button>
        </div>` : '';
    }).join('');
    return `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" style="max-width:500px;" onclick="event.stopPropagation()">
        <h3>📦 Archived Courses</h3>
        ${archived || '<p style="color:var(--text-muted);">No archived courses.</p>'}
        <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>
    </div></div>`;
}

// ====== FEATURE 5: ASSIGNMENT TIMER =====
function setAssignmentTimer(itemId, minutes) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if (!item) return;
    item.timerMinutes = minutes;
    save(); render();
    showToast(`Timer set: ${minutes} minutes`);
}

function startAssignmentTimer(itemId) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if (!item || !item.timerMinutes) return;
    state.timerStart = Date.now();
    state.timerMinutes = item.timerMinutes;
    state.timerItemId = itemId;
    render();
    showToast(`Timer started! ${item.timerMinutes} minutes remaining`);
}

function renderTimerWidget() {
    if (!state.timerStart || !state.timerMinutes) return '';
    let elapsed = Math.floor((Date.now() - state.timerStart) / 1000 / 60);
    let remaining = state.timerMinutes - elapsed;
    let color = remaining <= 5 ? 'var(--danger)' : remaining <= 15 ? 'var(--warning)' : 'var(--success)';
    return `<div style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:${color}; color:white; padding:12px 24px; border-radius:30px; font-weight:700; font-size:18px; box-shadow:0 4px 20px rgba(0,0,0,0.3); z-index:9999;">
        ⏱️ ${remaining > 0 ? remaining + ' min remaining' : 'Time is up!'}
        <button onclick="state.timerStart=null; render();" style="margin-left:15px; background:none; border:none; color:white; font-size:16px; cursor:pointer;">✕</button>
    </div>`;
}

// ====== FEATURE 6: STUDENT SELF-GRADE =====
function enableSelfGrade(itemId) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if (!item) return;
    item.selfGrade = !item.selfGrade;
    save(); render();
    showToast('Self-assessment ' + (item.selfGrade ? 'enabled' : 'disabled'));
}

function submitSelfGrade(itemId) {
    let score = prompt('Rate yourself (out of 100):');
    if (!score || isNaN(score)) return;
    db.submissions = db.submissions.filter(s => !(String(s.assignId) === String(itemId) && String(s.user) === String(state.user)));
    db.submissions.push({
        assignId: String(itemId),
        user: String(state.user),
        date: new Date().toLocaleDateString(),
        status: 'self-graded',
        selfScore: Number(score)
    });
    save(); render();
    showToast('Self-grade submitted!');
}

// ====== FEATURE 7: GRADE CURVE =====
function applyGradeCurve(courseId) {
    let curve = prompt('Apply grade curve (% to add to all grades):', '0');
    if (!curve || isNaN(curve)) return;
    let curveAmount = Number(curve);
    
    db.grades.forEach(g => {
        let item = db.materials.find(m => String(m.id) === String(g.assignId));
        if (item && String(item.courseId) === String(courseId) && g.score !== null) {
            let newScore = g.score + (item.points * curveAmount / 100);
            if (newScore <= item.points) g.score = Math.round(newScore * 100) / 100;
        }
    });
    
    save(); render();
    showToast(`Grade curve of ${curveAmount}% applied!`);
}

// ====== FEATURE 8: GRADE EXEMPTION =====
function exemptStudent(assignId, studentUser) {
    if (!confirm('Exempt this student from this assignment?')) return;
    db.grades = db.grades.filter(g => !(String(g.assignId) === String(assignId) && String(g.user) === String(studentUser)));
    db.grades.push({ assignId: String(assignId), user: String(studentUser), score: null, status: 'exempt' });
    save(); render();
    showToast('Student exempted');
}

// ====== FEATURE 9: MESSAGE TEMPLATES =====
function initMessageTemplates() {
    if (!db.messageTemplates) db.messageTemplates = [];
}

function saveMessageTemplate(name, content) {
    initMessageTemplates();
    db.messageTemplates.push({ id: 'tmpl_' + Date.now(), name: name, content: content });
    save();
}

function useMessageTemplate(templateId) {
    let template = db.messageTemplates.find(t => t.id === templateId);
    return template ? template.content : '';
}

function renderMessageTemplates() {
    initMessageTemplates();
    if (db.messageTemplates.length === 0) return '<p style="color:var(--text-muted);">No saved templates.</p>';
    return db.messageTemplates.map(t => `<div style="padding:8px; background:var(--bg-hover); border-radius:4px; margin-bottom:6px; cursor:pointer;" onclick="document.getElementById('msgContent').value = useMessageTemplate('${t.id}'); this.parentElement.remove();">
        <div style="font-weight:600; font-size:12px;">${t.name}</div>
        <div style="font-size:11px; color:var(--text-muted);">${t.content.substring(0, 50)}...</div>
    </div>`).join('');
}

// ====== FEATURE 10: ANNOUNCEMENT SCHEDULER =====
function scheduleAnnouncement() {
    let message = prompt('Announcement message:');
    if (!message) return;
    let dateStr = prompt('Schedule for date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!dateStr) return;
    
    db.updates.unshift({
        id: 'ann_' + Date.now(),
        user: state.user,
        type: 'announcement',
        message: message,
        courseId: state.courseId,
        timestamp: new Date(dateStr).toISOString(),
        scheduled: true
    });
    
    save();
    showToast('Announcement scheduled for ' + dateStr);
    render();
}

// ====== FEATURE 11: SEATING CHART =====
function initSeatingChart() {
    if (!db.seatingCharts) db.seatingCharts = {};
}

function renderSeatingChart() {
    initSeatingChart();
    let chart = db.seatingCharts[state.courseId] || { rows: 5, cols: 6, seats: {} };
    
    let html = `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" style="width:700px;" onclick="event.stopPropagation()">
        <h3>🪑 Seating Chart</h3>
        <div style="margin-bottom:15px; display:flex; gap:10px;">
            <input type="number" id="scRows" value="${chart.rows}" min="1" max="10" style="width:60px; padding:8px;">
            <span style="line-height:36px;">rows x</span>
            <input type="number" id="scCols" value="${chart.cols}" min="1" max="10" style="width:60px; padding:8px;">
            <span style="line-height:36px;">cols</span>
            <button onclick="updateSeatingChart()" class="btn-zen primary" style="padding:8px 16px;">Update</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(${chart.cols}, 1fr); gap:8px;">
            ${Array(chart.rows * chart.cols).fill(0).map((_, i) => {
                let row = Math.floor(i / chart.cols) + 1;
                let col = (i % chart.cols) + 1;
                let seat = chart.seats[`${row}_${col}`];
                return `<div style="padding:15px; background:${seat ? '#e8f5e9' : '#f0f0f0'}; border-radius:8px; text-align:center; cursor:pointer;" onclick="assignSeat(${row}, ${col})">
                    <div style="font-size:10px; color:var(--text-muted);">${row}-${col}</div>
                    <div style="font-size:12px; font-weight:600;">${seat ? db.users[seat]?.name || 'Student' : 'Empty'}</div>
                </div>`;
            }).join('')}
        </div>
        <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>
    </div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function updateSeatingChart() {
    initSeatingChart();
    let rows = Number(document.getElementById('scRows').value);
    let cols = Number(document.getElementById('scCols').value);
    db.seatingCharts[state.courseId] = { rows: rows, cols: cols, seats: db.seatingCharts[state.courseId]?.seats || {} };
    save();
    renderSeatingChart();
}

function assignSeat(row, col) {
    let student = prompt('Enter student username to assign to this seat (or leave empty to clear):');
    if (student === null) return;
    initSeatingChart();
    if (!db.seatingCharts[state.courseId]) db.seatingCharts[state.courseId] = { rows: 5, cols: 6, seats: {} };
    if (student && db.users[student]) {
        db.seatingCharts[state.courseId].seats[`${row}_${col}`] = student;
        showToast('Seat assigned');
    } else {
        delete db.seatingCharts[state.courseId].seats[`${row}_${col}`];
        showToast('Seat cleared');
    }
    save();
    renderSeatingChart();
}

// ====== FEATURE 12: OFFICE HOURS =====
function initOfficeHours() {
    if (!db.officeHours) db.officeHours = {};
}

function renderOfficeHours() {
    initOfficeHours();
    let hours = db.officeHours[state.user] || [];
    let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    let html = `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()">
        <h3>🕐 Office Hours</h3>
        <div style="max-height:400px; overflow-y:auto;">
            ${days.map(day => {
                let dayHours = hours.find(h => h.day === day);
                return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; padding:10px; background:var(--bg-hover); border-radius:8px;">
                    <span style="width:100px; font-weight:600;">${day}</span>
                    <input type="time" id="oh_start_${day}" value="${dayHours?.start || ''}" style="padding:6px;">
                    <span>to</span>
                    <input type="time" id="oh_end_${day}" value="${dayHours?.end || ''}" style="padding:6px;">
                    <label style="display:flex; align-items:center; gap:4px; font-size:12px;">
                        <input type="checkbox" ${dayHours?.available ? 'checked' : ''} onchange="toggleOfficeHourDay('${day}', this.checked)">
                        Available
                    </label>
                </div>`;
            }).join('')}
        </div>
        <div class="modal-buttons"><button class="btn-zen primary" onclick="saveOfficeHours()">Save</button><button class="btn-zen" onclick="closeModal()">Close</button></div>
    </div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function toggleOfficeHourDay(day, available) {
    initOfficeHours();
    if (!db.officeHours[state.user]) db.officeHours[state.user] = [];
    let hours = db.officeHours[state.user];
    let idx = hours.findIndex(h => h.day === day);
    if (idx >= 0) {
        hours[idx].available = available;
    } else {
        hours.push({ day: day, available: available, start: '', end: '' });
    }
    save();
}

function saveOfficeHours() {
    initOfficeHours();
    let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    db.officeHours[state.user] = days.map(day => ({
        day: day,
        available: document.querySelector(`[onchange*="${day}"]`)?.checked || false,
        start: document.getElementById('oh_start_' + day)?.value || '',
        end: document.getElementById('oh_end_' + day)?.value || ''
    }));
    save();
    showToast('Office hours saved!');
    closeModal();
}

// ====== FEATURE 13: STUDENT NOTES (ENHANCED) =====
function addStudentNote() {
    let student = prompt('Student username:');
    if (!student || !db.users[student]) return alert('Invalid student');
    let note = prompt('Note content:');
    if (!note) return;
    
    if (!db.studentNotes) db.studentNotes = [];
    db.studentNotes.push({
        id: 'note_' + Date.now(),
        teacher: state.user,
        student: student,
        note: note,
        date: new Date().toISOString()
    });
    
    save();
    showToast('Note added');
}

function renderStudentNoteHistory(student) {
    if (!db.studentNotes) return '<p>No notes.</p>';
    let notes = db.studentNotes.filter(n => n.student === student);
    return notes.map(n => `<div style="padding:10px; border-bottom:1px solid var(--border);">
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">${new Date(n.date).toLocaleDateString()} - ${db.users[n.teacher]?.name || 'Teacher'}</div>
        <div style="font-size:13px;">${n.note}</div>
    </div>`).join('');
}

// ====== FEATURE 14: PARENT CONFERENCE SCHEDULER =====
function initConferences() {
    if (!db.conferences) db.conferences = [];
}

function scheduleConference() {
    let student = prompt('Student username:');
    if (!student) return;
    let date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    let time = prompt('Time (HH:MM):', '15:00');
    let parent = prompt('Parent name:');
    
    initConferences();
    db.conferences.push({
        id: 'conf_' + Date.now(),
        teacher: state.user,
        student: student,
        parent: parent || '',
        date: date,
        time: time,
        status: 'scheduled'
    });
    
    save();
    showToast('Conference scheduled!');
}

function renderConferences() {
    initConferences();
    let confs = db.conferences.filter(c => c.teacher === state.user || c.student === state.user);
    if (confs.length === 0) return '<p style="color:var(--text-muted);">No conferences scheduled.</p>';
    return confs.map(c => `<div style="padding:12px; background:var(--bg-hover); border-radius:8px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between;">
            <div>
                <div style="font-weight:600;">${db.users[c.student]?.name || c.student}</div>
                <div style="font-size:12px; color:var(--text-muted);">${c.date} at ${c.time}</div>
                ${c.parent ? `<div style="font-size:12px;">Parent: ${c.parent}</div>` : ''}
            </div>
            <span class="badge badge-info">${c.status}</span>
        </div>
    </div>`).join('');
}

// ====== FEATURE 15: COURSE PASSCODE =====
function setCoursePasscode(courseId) {
    let passcode = prompt('Set a passcode for this course (leave empty to remove):');
    let course = db.courses.find(c => String(c.id) === String(courseId));
    if (!course) return;
    course.passcode = passcode || null;
    save();
    showToast(passcode ? 'Passcode set!' : 'Passcode removed');
}

function verifyCoursePasscode(courseId) {
    let course = db.courses.find(c => String(c.id) === String(courseId));
    if (!course || !course.passcode) return true;
    let entered = prompt('Enter course passcode:');
    return entered === course.passcode;
}

// ====== FEATURE 16: GRADE BREAKDOWN VIEW =====
function renderGradeBreakdown(studentId) {
    let assignments = db.materials.filter(m => String(m.courseId) === String(state.courseId) && (m.type.includes('Assign') || m.type.includes('Assess')));
    let breakdown = {};
    
    assignments.forEach(a => {
        let type = a.assignmentType || 'other';
        if (!breakdown[type]) breakdown[type] = { earned: 0, possible: 0, count: 0 };
        let grade = db.grades.find(g => String(g.assignId) === String(a.id) && g.user === studentId);
        if (grade && grade.score !== null && grade.status !== 'exempt' && grade.status !== 'excused') {
            breakdown[type].earned += grade.score;
            breakdown[type].possible += (a.points || 100);
            breakdown[type].count++;
        }
    });
    
    let html = Object.keys(breakdown).map(type => {
        let data = breakdown[type];
        let pct = data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0;
        return `<div style="padding:12px; border-bottom:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="text-transform:capitalize; font-weight:600;">${type}</span>
                <span>${data.earned}/${data.possible} (${pct}%)</span>
            </div>
            <div style="height:8px; background:var(--bg-hover); border-radius:4px; overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:${pct >= 70 ? 'var(--success)' : 'var(--danger)'};"></div>
            </div>
        </div>`;
    }).join('');
    
    return `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()">
        <h3>📊 Grade Breakdown</h3>
        <div style="max-height:400px; overflow-y:auto;">
            ${html || '<p>No graded assignments yet.</p>'}
        </div>
        <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>
    </div></div>`;
}

// ====== FEATURE 17: RECENT ACTIVITY FEED =====
function renderRecentActivity() {
    if (!db.activityLog) return '';
    let activities = db.activityLog.slice(0, 20);
    return activities.map(a => `<div style="padding:8px 0; border-bottom:1px solid var(--border);">
        <div style="font-size:12px; color:var(--text-muted);">${formatTimeAgo(a.timestamp)}</div>
        <div style="font-size:13px;">${a.userName} - ${a.action}</div>
    </div>`).join('') || '<p style="color:var(--text-muted);">No recent activity.</p>';
}

// ====== FEATURE 18: COURSE MATERIALS SEARCH =====
function searchCourseMaterials(query) {
    if (!query || query.length < 2) return [];
    query = query.toLowerCase();
    return db.materials.filter(m => 
        String(m.courseId) === String(state.courseId) &&
        (m.title.toLowerCase().includes(query) || (m.desc && m.desc.toLowerCase().includes(query)))
    );
}

function renderCourseSearch() {
    return `<div style="position:relative;">
        <input type="text" id="courseSearchInput" placeholder="Search materials..." onkeyup="handleCourseSearch(this.value)" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px;">
        <div id="courseSearchResults" style="position:absolute; top:100%; left:0; right:0; background:white; border:1px solid var(--border); border-radius:8px; margin-top:4px; max-height:300px; overflow-y:auto; display:none; z-index:100;"></div>
    </div>`;
}

function handleCourseSearch(query) {
    let results = document.getElementById('courseSearchResults');
    if (!query || query.length < 2) {
        results.style.display = 'none';
        return;
    }
    let items = searchCourseMaterials(query);
    results.innerHTML = items.map(item => `<div style="padding:10px; cursor:pointer; border-bottom:1px solid var(--border);" onclick="navigate('item', '${item.id}'); document.getElementById('courseSearchResults').style.display='none';">
        <div style="font-weight:600;">${item.title}</div>
        <div style="font-size:11px; color:var(--text-muted);">${item.type}</div>
    </div>`).join('') || '<div style="padding:10px; color:var(--text-muted);">No results</div>';
    results.style.display = 'block';
}

// ====== FEATURE 19: ASSIGNMENT ATTACHMENTS =====
function addAttachment(itemId) {
    let url = prompt('Enter file/URL to attach:');
    if (!url) return;
    
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if (!item) return;
    if (!item.attachments) item.attachments = [];
    item.attachments.push({ url: url, name: url.split('/').pop() });
    save(); render();
    showToast('Attachment added');
}

function getAttachments(itemId) {
    let item = db.materials.find(m => String(m.id) === String(itemId));
    if (!item || !item.attachments) return '';
    return item.attachments.map(a => `<div style="padding:8px; background:var(--bg-hover); border-radius:4px; margin-top:8px;">
        <a href="${a.url}" target="_blank" style="color:var(--primary);">📎 ${a.name}</a>
    </div>`).join('');
}

// ====== FEATURE 20: COURSE GOALS =====
function initGoals() {
    if (!db.goals) db.goals = {};
}

function addCourseGoal() {
    let goal = prompt('Enter a course goal:');
    if (!goal) return;
    initGoals();
    if (!db.goals[state.courseId]) db.goals[state.courseId] = [];
    db.goals[state.courseId].push({
        id: 'goal_' + Date.now(),
        text: goal,
        completed: false,
        createdBy: state.user,
        createdAt: new Date().toISOString()
    });
    save(); render();
    showToast('Goal added');
}

function toggleGoal(goalId) {
    initGoals();
    if (!db.goals[state.courseId]) return;
    let goal = db.goals[state.courseId].find(g => g.id === goalId);
    if (goal) {
        goal.completed = !goal.completed;
        save(); render();
    }
}

function renderGoals() {
    initGoals();
    let goals = db.goals[state.courseId] || [];
    if (goals.length === 0) return '';
    return `<div class="post-box" style="margin-top:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h4 style="margin:0;">🎯 Course Goals</h4>
            ${db.users[state.user].role !== 'student' ? `<button class="btn-zen" onclick="addCourseGoal()" style="padding:6px 12px; font-size:12px;">+ Add</button>` : ''}
        </div>
        ${goals.map(g => `<div style="padding:10px; background:${g.completed ? '#e8f5e9' : 'var(--bg-hover)'}; border-radius:6px; margin-bottom:8px; display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="toggleGoal('${g.id}')">
            <span style="font-size:18px;">${g.completed ? '✅' : '⬜'}</span>
            <span style="${g.completed ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${g.text}</span>
        </div>`).join('')}
    </div>`;
}

// ====== FEATURE 21: STUDENT HISTORY =====
function renderStudentHistory(studentId) {
    let grades = db.grades.filter(g => g.user === studentId);
    let submissions = db.submissions.filter(s => s.user === studentId);
    
    let history = [...grades.map(g => ({ type: 'grade', date: g.timestamp || new Date().toISOString(), data: g })),
                    ...submissions.map(s => ({ type: 'submission', date: s.date, data: s }))]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);
    
    let html = history.map(h => {
        let item = db.materials.find(m => String(m.id) === String(h.data.assignId));
        if (h.type === 'grade') {
            return `<div style="padding:10px; border-bottom:1px solid var(--border);">
                <div style="font-size:11px; color:var(--text-muted);">${new Date(h.date).toLocaleDateString()}</div>
                <div style="font-weight:600;">${item?.title || 'Assignment'}</div>
                <div style="color:var(--primary);">Grade: ${h.data.score !== null ? h.data.score + '/' + (item?.points || 100) : h.data.status}</div>
            </div>`;
        } else {
            return `<div style="padding:10px; border-bottom:1px solid var(--border);">
                <div style="font-size:11px; color:var(--text-muted);">${h.date}</div>
                <div style="font-weight:600;">${item?.title || 'Assignment'}</div>
                <div style="color:var(--success);">Submitted</div>
            </div>`;
        }
    }).join('');
    
    return `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" style="max-height:80vh; overflow-y:auto;" onclick="event.stopPropagation()">
        <h3>📜 ${db.users[studentId]?.name || 'Student'} History</h3>
        ${html || '<p>No history available.</p>'}
        <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>
    </div></div>`;
}

// ====== FEATURE 22: PROGRESS TRACKING ENHANCED =====
function renderEnhancedProgress(studentId) {
    let materials = db.materials.filter(m => String(m.courseId) === String(state.courseId) && (m.type.includes('Assign') || m.type.includes('Assess')));
    let total = materials.length;
    let completed = materials.filter(m => db.submissions.some(s => String(s.assignId) === String(m.id) && s.user === studentId)).length;
    let graded = materials.filter(m => db.grades.some(g => String(g.assignId) === String(m.id) && g.user === studentId && g.score !== null)).length;
    
    let onTime = materials.filter(m => {
        let sub = db.submissions.find(s => String(s.assignId) === String(m.id) && s.user === studentId);
        return sub && m.due && new Date(sub.date) <= new Date(m.due);
    }).length;
    
    let avgScore = 0;
    let gradedCount = 0;
    materials.forEach(m => {
        let g = db.grades.find(gr => String(gr.assignId) === String(m.id) && gr.user === studentId && gr.score !== null);
        if (g) {
            avgScore += (g.score / (m.points || 100)) * 100;
            gradedCount++;
        }
    });
    avgScore = gradedCount > 0 ? Math.round(avgScore / gradedCount) : 0;
    
    return `<div style="padding:15px; background:white; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <h4 style="margin:0 0 15px 0;">📊 Progress Summary</h4>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
            <div style="padding:12px; background:#e8f5e9; border-radius:8px; text-align:center;">
                <div style="font-size:24px; font-weight:700; color:#2e7d32;">${completed}/${total}</div>
                <div style="font-size:11px; color:#555;">Completed</div>
            </div>
            <div style="padding:12px; background:#e3f2fd; border-radius:8px; text-align:center;">
                <div style="font-size:24px; font-weight:700; color:#1565c0;">${graded}</div>
                <div style="font-size:11px; color:#555;">Graded</div>
            </div>
            <div style="padding:12px; background:#fff3e0; border-radius:8px; text-align:center;">
                <div style="font-size:24px; font-weight:700; color:#e65100;">${onTime}</div>
                <div style="font-size:11px; color:#555;">On Time</div>
            </div>
            <div style="padding:12px; background:#f3e5f5; border-radius:8px; text-align:center;">
                <div style="font-size:24px; font-weight:700; color:#7b1fa2;">${avgScore}%</div>
                <div style="font-size:11px; color:#555;">Avg Score</div>
            </div>
        </div>
    </div>`;
}

// ====== FEATURE 23: GRADE WEIGHTED CALCULATION =====
function calculateWeightedGrade(studentId) {
    let materials = db.materials.filter(m => String(m.courseId) === String(state.courseId) && (m.type.includes('Assign') || m.type.includes('Assess')));
    let policies = db.gradePolicies?.[state.courseId] || { weights: {}, dropLowest: {}, weightByType: false };
    
    let categories = {};
    materials.forEach(m => {
        let type = m.assignmentType || 'other';
        if (!categories[type]) categories[type] = [];
        categories[type].push(m);
    });
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.keys(categories).forEach(type => {
        let items = categories[type];
        let dropCount = policies.dropLowest?.[type] || 0;
        
        let grades = items.map(m => {
            let g = db.grades.find(gr => String(gr.assignId) === String(m.id) && gr.user === studentId && gr.score !== null && gr.status !== 'exempt' && gr.status !== 'excused');
            return g ? { score: g.score / (m.points || 100), item: m } : null;
        }).filter(g => g !== null).sort((a, b) => a.score - b.score);
        
        for (let i = 0; i < dropCount && grades.length > 0; i++) {
            grades.shift();
        }
        
        if (grades.length > 0) {
            let avg = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
            let weight = policies.weights?.[type] || (100 / Object.keys(categories).length);
            weightedSum += avg * weight;
            totalWeight += weight;
        }
    });
    
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
}

// ====== FEATURE 24: ATTENDANCE NOTES =====
function addAttendanceNote(user, date, note) {
    if (!db.attendanceNotes) db.attendanceNotes = [];
    let idx = db.attendanceNotes.findIndex(n => n.user === user && n.date === date);
    if (idx >= 0) {
        db.attendanceNotes[idx].note = note;
    } else {
        db.attendanceNotes.push({ user, date, note, addedBy: state.user });
    }
    save();
}

function getAttendanceNote(user, date) {
    if (!db.attendanceNotes) return '';
    let note = db.attendanceNotes.find(n => n.user === user && n.date === date);
    return note?.note || '';
}

// ====== FEATURE 25: COURSE COMPLETION CERTIFICATE =====
function generateCertificate(studentId) {
    let course = db.courses.find(c => String(c.id) === String(state.courseId));
    let student = db.users[studentId];
    if (!course || !student) return;
    
    let pct = calculateWeightedGrade(studentId);
    let completion = pct >= 70 ? 'COMPLETED' : 'IN PROGRESS';
    
    let certHtml = `<div style="width:800px; padding:60px; background:white; border:20px double #1a5b8f; text-align:center; font-family:serif;">
        <div style="font-size:48px; margin-bottom:20px;">🎓</div>
        <div style="font-size:24px; color:#1a5b8f; margin-bottom:30px;">CERTIFICATE OF ${completion}</div>
        <div style="font-size:18px; margin-bottom:20px;">This certifies that</div>
        <div style="font-size:36px; font-weight:bold; color:#333; margin-bottom:20px; border-bottom:2px solid #333; display:inline-block; padding:0 40px;">${student.name}</div>
        <div style="font-size:18px; margin:20px 0;">has successfully completed</div>
        <div style="font-size:28px; font-weight:bold; color:#1a5b8f; margin-bottom:30px;">${course.name}</div>
        <div style="font-size:16px; color:#666;">with a grade of ${pct}%</div>
        <div style="margin-top:40px; font-size:14px; color:#888;">Date: ${new Date().toLocaleDateString()}</div>
        <div style="margin-top:20px; font-size:12px; color:#aaa;">Zentelle LMS</div>
    </div>`;
    
    let win = window.open('', '_blank');
    win.document.write(`<html><head><title>Certificate - ${student.name}</title></head><body>${certHtml}</body></html>`);
    win.document.close();
}

// ====== FEATURE 26: BULK IMPORT STUDENTS =====
function showBulkImport() {
    return `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" style="width:600px;" onclick="event.stopPropagation()">
        <h3>📥 Bulk Import Students</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Enter one student per line: FirstName,LastName,Username,Password</p>
        <textarea id="bulkImportData" rows="10" style="width:100%; padding:10px; font-family:monospace; font-size:12px;" placeholder="John,Doe,johndoe,password123
Jane,Smith,janesmith,password456"></textarea>
        <div class="modal-buttons"><button class="btn-zen" onclick="processBulkImport()">Import</button><button class="btn-zen" onclick="closeModal()">Cancel</button></div>
    </div></div>`;
}

function processBulkImport() {
    let data = document.getElementById('bulkImportData').value;
    let lines = data.split('\n').filter(l => l.trim());
    let imported = 0;
    
    lines.forEach(line => {
        let parts = line.split(',').map(p => p.trim());
        if (parts.length >= 4) {
            let [first, last, username, password] = parts;
            if (!db.users[username]) {
                db.users[username] = {
                    pass: password,
                    role: 'student',
                    name: `${first} ${last}`,
                    firstName: first,
                    lastName: last,
                    schoolId: db.users[state.user]?.schoolId || 'default',
                    createdAt: new Date().toISOString()
                };
                db.enrollments.push({ user: username, courseId: state.courseId });
                imported++;
            }
        }
    });
    
    save();
    closeModal();
    render();
    showToast(`${imported} students imported!`);
}

// ====== FEATURE 27: QUICK POLL RESULTS =====
function renderPollResults(pollId) {
    let poll = db.quickPolls?.find(p => p.id === pollId);
    if (!poll) return '<p>Poll not found.</p>';
    
    let responses = db.pollResponses?.filter(r => r.pollId === pollId) || [];
    let total = responses.length;
    
    let options = poll.options.map(opt => {
        let count = responses.filter(r => r.response === opt).length;
        let pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${opt}</span>
                <span style="font-weight:600;">${count} (${pct}%)</span>
            </div>
            <div style="height:20px; background:var(--bg-hover); border-radius:10px; overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:var(--primary);"></div>
            </div>
        </div>`;
    }).join('');
    
    return `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()">
        <h3>📊 Poll Results: ${poll.question}</h3>
        <div style="margin-bottom:15px;">${total} response${total !== 1 ? 's' : ''}</div>
        ${options}
        <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>
    </div></div>`;
}

// ====== FEATURE 28: EXPORT COURSE DATA =====
function exportCourseData(courseId) {
    let course = db.courses.find(c => String(c.id) === String(courseId));
    let materials = db.materials.filter(m => String(m.courseId) === String(courseId));
    let grades = [];
    materials.forEach(m => {
        db.grades.filter(g => String(g.assignId) === String(m.id)).forEach(g => grades.push(g));
    });
    
    let data = JSON.stringify({ course, materials, grades }, null, 2);
    let blob = new Blob([data], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `${course?.name || 'course'}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Course data exported!');
}

// ====== FEATURE 29: STUDENT RANKING =====
function renderStudentRanking(courseId) {
    let enrollments = db.enrollments.filter(e => String(e.courseId) === String(courseId));
    let rankings = enrollments.map(e => {
        let student = db.users[e.user];
        if (!student || student.role !== 'student') return null;
        return { user: e.user, name: student.name, grade: calculateWeightedGrade(e.user) };
    }).filter(r => r !== null).sort((a, b) => b.grade - a.grade);
    
    return rankings.map((r, i) => `<div style="display:flex; align-items:center; gap:12px; padding:10px; background:${i < 3 ? '#fef3c7' : 'var(--bg-hover)'}; border-radius:8px; margin-bottom:6px;">
        <span style="font-size:20px; font-weight:700; width:30px; color:${i === 0 ? '#ffd700' : (i === 1 ? '#c0c0c0' : (i === 2 ? '#cd7f32' : '#666'))};">#${i + 1}</span>
        <span style="flex:1; font-weight:600;">${r.name}</span>
        <span style="font-weight:700; color:var(--primary);">${r.grade}%</span>
    </div>`).join('') || '<p>No students to rank.</p>';
}

// ====== FEATURE 30: DARK/LIGHT MODE PER COURSE =====
function toggleCourseTheme(courseId) {
    let course = db.courses.find(c => String(c.id) === String(courseId));
    if (!course) return;
    course.darkMode = !course.darkMode;
    save();
    if (state.courseId === courseId) {
        document.body.setAttribute('data-theme', course.darkMode ? 'dark' : 'light');
    }
    showToast(`Course theme: ${course.darkMode ? 'Dark' : 'Light'}`);
}

// ====== HELPER FUNCTIONS =====
function formatTimeAgo(dateStr) {
    let date = new Date(dateStr);
    let now = new Date();
    let diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
    return Math.floor(diff / 86400) + ' days ago';
}

function showCourseGoalsUI() {
    initGoals();
    let goals = db.goals[state.courseId] || [];
    let isTeacher = db.users[state.user].role === 'admin' || db.users[state.user].role === 'teacher';
    
    let html = `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" style="max-width:500px;" onclick="event.stopPropagation()">
        <h3>🎯 Course Goals</h3>
        ${isTeacher ? `<button class="btn-zen primary" onclick="addCourseGoal(); closeModal();" style="margin-bottom:15px;">+ Add Goal</button>` : ''}
        <div style="max-height:400px; overflow-y:auto;">
            ${goals.length === 0 ? '<p style="color:var(--text-muted);">No goals set yet.</p>' : goals.map(g => `
                <div style="padding:12px; background:${g.completed ? '#e8f5e9' : 'var(--bg-hover)'}; border-radius:8px; margin-bottom:8px; cursor:pointer;" onclick="toggleGoal('${g.id}'); showCourseGoalsUI();">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:20px;">${g.completed ? '✅' : '⬜'}</span>
                        <span style="${g.completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${g.text}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="modal-buttons"><button class="btn-zen" onclick="closeModal()">Close</button></div>
    </div></div>`;
    return html;
}

function renderCourseGoalsInline() {
    initGoals();
    let goals = db.goals[state.courseId] || [];
    if (goals.length === 0) return '';
    let completed = goals.filter(g => g.completed).length;
    return `<div style="padding:12px; background:linear-gradient(135deg, #fef3c7, #fde68a); border-radius:12px; margin-bottom:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:700; font-size:14px;">🎯 Course Goals</div>
                <div style="font-size:12px; color:#666;">${completed}/${goals.length} completed</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:24px; font-weight:700; color:#92400e;">${Math.round((completed/goals.length)*100)}%</div>
            </div>
        </div>
        <div style="height:8px; background:rgba(0,0,0,0.1); border-radius:4px; margin-top:8px; overflow:hidden;">
            <div style="height:100%; width:${(completed/goals.length)*100}%; background:#92400e; border-radius:4px;"></div>
        </div>
    </div>`;
}

function renderStudentProgressWidget(studentId) {
    let materials = db.materials.filter(m => String(m.courseId) === String(state.courseId) && (m.type.includes('Assign') || m.type.includes('Assess')));
    let total = materials.length;
    let completed = materials.filter(m => db.submissions.some(s => String(s.assignId) === String(m.id) && s.user === studentId)).length;
    let pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return `<div style="padding:8px; background:var(--bg-hover); border-radius:6px; margin-top:8px;">
        <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Progress: ${completed}/${total}</div>
        <div style="height:6px; background:#ddd; border-radius:3px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:var(--primary);"></div>
        </div>
    </div>`;
}

// Initialize all features
initFavorites();
initTags();
initArchive();
initMessageTemplates();
initOfficeHours();
initStudentNotes();
initConferences();
initGoals();

if(document.getElementById('root')) render();
// ====== DISTRICT & SCHOOL ADMIN FEATURES (31-50) ======
function initDistrict() { if(!db.districts) db.districts={}; if(!db.districtSchools) db.districtSchools=[]; }
function addDistrictSchool() { let n=prompt('School name:'); if(!n)return; initDistrict(); db.districtSchools.push({id:'sch_'+Date.now(),name:n,address:prompt('Address:')||'',phone:prompt('Phone:')||'',principal:prompt('Principal:')||'',grades:prompt('Grades (K-12):')||'K-12',students:0,teachers:0}); save(); showToast('School added!'); }
function renderDistrictDashboard() { initDistrict(); return '<div class="col-main"><h2>🏛 District Dashboard</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;"><div class="stats-card"><h3>'+(db.districtSchools||[]).length+'</h3><p>Schools</p></div></div><button class="btn-zen primary" onclick="addDistrictSchool()">+ Add School</button></div>'; }
function initGradeLevels() { if(!db.gradeLevels) db.gradeLevels={}; }
function toggleGradeLevel(g) { initGradeLevels(); db.gradeLevels[g]=!db.gradeLevels[g]; save(); }
function initHomerooms() { if(!db.homerooms) db.homerooms={}; }
function assignHomeroom() { let t=prompt('Teacher:'); if(!t)return; let g=prompt('Grade:'); initHomerooms(); db.homerooms[t]={grade:g,period:prompt('Period:')||'AM',students:[]}; save(); showToast('Homeroom assigned'); }
function renderHomeroomView() { let h=db.homerooms?.[state.user]; if(!h)return'<p>No homeroom.</p>'; let students=db.enrollments.filter(e=>db.users[e.user]?.gradeLevel===h.grade); return '<div class="post-box"><h3>🏠 Homeroom - Grade '+h.grade+'</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">'+students.map(s=>'<div style="padding:12px;background:var(--bg-hover);border-radius:8px;">'+(db.users[s.user]?.name||s.user)+'</div>').join('')+'</div></div>'; }
function initCounselor() { if(!db.counselorNotes) db.counselorNotes=[]; }
function addCounselorNote() { let s=prompt('Student:'); if(!s)return; initCounselor(); db.counselorNotes.push({id:'cn_'+Date.now(),student:s,note:prompt('Note:'),type:prompt('Type (academic/social/emotional):')||'academic',counselor:state.user,date:new Date().toISOString()}); save(); showToast('Note added'); }
function renderCounselorDashboard() { initCounselor(); let n=db.counselorNotes; return '<div class="col-main"><h2>🎓 Counselor</h2><button class="btn-zen primary" onclick="addCounselorNote()">+ Add Note</button><div class="post-box">'+n.slice(0,20).map(x=>'<div style="padding:12px;border-bottom:1px solid var(--border);"><strong>'+(db.users[x.student]?.name||x.student)+'</strong><br><span style="font-size:12px;color:var(--text-muted);">'+x.note+'</span></div>').join('')+'</div></div>'; }
function initHealthRecords() { if(!db.healthRecords) db.healthRecords={}; if(!db.allergies) db.allergies={}; }
function addAllergy() { let s=prompt('Student:'); if(!s)return; initHealthRecords(); if(!db.allergies[s]) db.allergies[s]=[]; db.allergies[s].push({allergy:prompt('Allergy:'),reaction:prompt('Reaction:'),epiPen:confirm('EpiPen?')}); save(); showToast('Allergy added'); }
function renderHealthAlerts() { initHealthRecords(); let alerts=Object.entries(db.allergies||{}).map(([s,a])=>a.map(x=>'⚠️ '+(db.users[s]?.name||s)+': '+x.allergy+(x.epiPen?' 🔴EpiPen':''))).flat().join('<br>'); return alerts||'No alerts'; }
function initLibrary() { if(!db.libraryBooks) db.libraryBooks=[]; if(!db.libraryLoans) db.libraryLoans=[]; }
function addLibraryBook() { let t=prompt('Title:'); if(!t)return; initLibrary(); db.libraryBooks.push({id:'book_'+Date.now(),title:t,author:prompt('Author:')||'',isbn:prompt('ISBN:')||'',copies:parseInt(prompt('Copies:')||'1'),available:parseInt(prompt('Copies:')||'1')}); save(); showToast('Book added'); }
function checkoutBook() { let s=prompt('Student:'),bid=prompt('Book ID:'); initLibrary(); let book=db.libraryBooks.find(b=>b.id===bid); if(!book||book.available<=0)return alert('Not available'); db.libraryLoans.push({id:'loan_'+Date.now(),bookId:bid,student:s,dueDate:prompt('Due (YYYY-MM-DD):')||'',returned:false}); book.available--; save(); showToast('Checked out'); }
function returnBook() { let lid=prompt('Loan ID:'); initLibrary(); let loan=db.libraryLoans.find(l=>l.id===lid); if(!loan)return; loan.returned=true; let book=db.libraryBooks.find(b=>b.id===loan.bookId); if(book)book.available++; save(); showToast('Returned'); }
function renderLibrary() { initLibrary(); let overdue=db.libraryLoans.filter(l=>!l.returned&&new Date(l.dueDate)<new Date()).length; return '<div class="col-main"><h2>📚 Library</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;"><div class="stats-card"><h3>'+db.libraryBooks.length+'</h3><p>Books</p></div><div class="stats-card"><h3>'+(db.libraryLoans||[]).filter(l=>!l.returned).length+'</h3><p>Checked Out</p></div><div class="stats-card"><h3 style="color:'+(overdue>0?'var(--danger)':'var(--success)')+';">'+overdue+'</h3><p>Overdue</p></div></div><button class="btn-zen primary" onclick="addLibraryBook()">+ Add Book</button></div>'; }
function initAthletics() { if(!db.sports) db.sports=[]; if(!db.gameSchedule) db.gameSchedule=[]; }
function addSport() { let n=prompt('Sport name:'); if(!n)return; initAthletics(); db.sports.push({id:'sport_'+Date.now(),name:n,season:prompt('Season:')||'fall'}); save(); showToast('Sport added'); }
function scheduleGame() { let s=prompt('Sport:'),opp=prompt('Opponent:'),d=prompt('Date:'); initAthletics(); db.gameSchedule.push({id:'game_'+Date.now(),sport:s,opponent:opp,date:d,time:prompt('Time:')||'',location:prompt('Location:')||'Home'}); save(); showToast('Game scheduled'); }
function renderAthletics() { initAthletics(); let w=(db.gameSchedule||[]).filter(g=>g.result==='W').length,l=(db.gameSchedule||[]).filter(g=>g.result==='L').length; return '<div class="col-main"><h2>🏆 Athletics</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;"><div class="stats-card"><h3>'+db.sports.length+'</h3><p>Sports</p></div><div class="stats-card"><h3>'+w+'</h3><p>Wins</p></div><div class="stats-card"><h3>'+l+'</h3><p>Losses</p></div></div><button class="btn-zen primary" onclick="addSport()">+ Add Sport</button><button class="btn-zen" onclick="scheduleGame()">📅 Schedule</button></div>'; }
function initCafeteria() { if(!db.lunchMenus) db.lunchMenus=[]; if(!db.mealBalances) db.mealBalances={}; }
function addMealBalance() { let s=prompt('Student:'),a=prompt('Amount:'); initCafeteria(); db.mealBalances[s]=(db.mealBalances[s]||0)+parseFloat(a); save(); showToast('Balance added'); }
function renderCafeteria() { initCafeteria(); let today=new Date().toISOString().split('T')[0]; let menu=db.lunchMenus.find(m=>m.date===today); return '<div class="col-main"><h2>🍽 Cafeteria</h2><p>Today Menu: '+(menu?.items||'No menu set')+'</p><button class="btn-zen" onclick="addMealBalance()">💰 Add Balance</button></div>'; }
function initTransportation() { if(!db.busRoutes) db.busRoutes=[]; if(!db.busAssignments) db.busAssignments={}; }
function addBusRoute() { let r=prompt('Route #:'),s=prompt('Stops:'),d=prompt('Driver:'); initTransportation(); db.busRoutes.push({id:'bus_'+Date.now(),routeNum:r,stops:s.split(','),driver:d,students:[]}); save(); showToast('Route added'); }
function renderBusRoutes() { initTransportation(); return '<div class="col-main"><h2>🚌 Transportation</h2><button class="btn-zen primary" onclick="addBusRoute()">+ Add Route</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px;">'+(db.busRoutes||[]).map(r=>'<div class="post-box"><h4>🚌 Route '+r.routeNum+'</h4><p>Driver: '+r.driver+'</p><p style="font-size:12px;">'+r.stops.join(' → ')+'</p></div>').join('')+'</div></div>'; }
function initHallPass() { if(!db.hallPasses) db.hallPasses=[]; }
function issueHallPass() { let s=prompt('Student:'),d=prompt('Destination:'); initHallPass(); db.hallPasses.push({id:'pass_'+Date.now(),student:s,destination:d,teacher:state.user,issuedAt:new Date().toISOString(),returned:false}); save(); showToast('Pass issued'); }
function renderHallPass() { initHallPass(); let active=(db.hallPasses||[]).filter(p=>!p.returned); return '<div class="col-main"><h2>🎫 Hall Pass</h2><button class="btn-zen primary" onclick="issueHallPass()">📤 Issue Pass</button><div class="post-box"><h3>Active ('+active.length+')</h3>'+active.map(p=>'<div style="padding:12px;background:#fef3c7;border-radius:8px;margin-bottom:8px;"><strong>'+(db.users[p.student]?.name||p.student)+'</strong> → '+p.destination+'<br><span style="font-size:11px;">ID: '+p.id+'</span></div>').join('')+'</div></div>'; }
function initVisitors() { if(!db.visitors) db.visitors=[]; }
function logVisitor() { let n=prompt('Name:'),p=prompt('Purpose:'),badge='VIS-'+Math.random().toString(36).substr(2,6).toUpperCase(); initVisitors(); db.visitors.push({id:badge,name:n,purpose:p,checkedIn:new Date().toISOString(),checkedOut:null,checkedInBy:state.user}); save(); showToast('Badge: '+badge); }
function renderVisitors() { initVisitors(); let today=new Date().toISOString().split('T')[0],active=(db.visitors||[]).filter(v=>v.checkedIn.startsWith(today)&&!v.checkedOut); return '<div class="col-main"><h2>👤 Visitors</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"><div class="stats-card"><h3>'+(db.visitors||[]).filter(v=>v.checkedIn.startsWith(today)).length+'</h3><p>Today</p></div><div class="stats-card"><h3>'+active.length+'</h3><p>Active</p></div></div><button class="btn-zen primary" onclick="logVisitor()">📝 Check In</button></div>'; }
function initPTA() { if(!db.ptaEvents) db.ptaEvents=[]; if(!db.volunteerHours) db.volunteerHours={}; }
function addPTAEvent() { let n=prompt('Event:'),d=prompt('Date:'),t=prompt('Time:'); initPTA(); db.ptaEvents.push({id:'pta_'+Date.now(),name:n,date:d,time:t,volunteers:[]}); save(); showToast('Event added'); }
function renderPTA() { initPTA(); let hrs=Object.values(db.volunteerHours||{}).flat().reduce((a,h)=>a+h.hours,0); return '<div class="col-main"><h2>🤝 PTA</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"><div class="stats-card"><h3>'+(db.ptaEvents||[]).length+'</h3><p>Events</p></div><div class="stats-card"><h3>'+hrs+'</h3><p>Volunteer Hours</p></div></div><button class="btn-zen primary" onclick="addPTAEvent()">+ Add Event</button></div>'; }
function initFundraising() { if(!db.fundraisers) db.fundraisers=[]; if(!db.donations) db.donations=[]; }
function createFundraiser() { let n=prompt('Name:'),g=prompt('Goal:'),d=prompt('End date:'); initFundraising(); db.fundraisers.push({id:'fund_'+Date.now(),name:n,goal:parseFloat(g),endDate:d,raised:0}); save(); showToast('Created'); }
function renderFundraising() { initFundraising(); return '<div class="col-main"><h2>💰 Fundraising</h2><button class="btn-zen primary" onclick="createFundraiser()">+ Create</button></div>'; }
function initLessonPlans() { if(!db.lessonPlans) db.lessonPlans=[]; }
function createLessonPlan() { let t=prompt('Title:'),obj=prompt('Objectives:'),proc=prompt('Procedure:'); initLessonPlans(); db.lessonPlans.push({id:'lesson_'+Date.now(),title:t,objectives:obj,procedure:proc,createdBy:state.user,date:new Date().toISOString()}); save(); showToast('Plan created'); }
function renderLessonPlans() { initLessonPlans(); let plans=(db.lessonPlans||[]).filter(p=>p.createdBy===state.user); return '<div class="col-main"><h2>📝 Lesson Plans</h2><button class="btn-zen primary" onclick="createLessonPlan()">+ Create</button><div class="post-box">'+(plans.map(p=>'<div style="padding:12px;border-bottom:1px solid var(--border);"><strong>'+p.title+'</strong><br><span style="font-size:12px;color:var(--text-muted);">'+p.objectives+'</span></div>').join('')||'<p>No plans yet.</p>')+'</div></div>'; }
function initSubstitutes() { if(!db.substitutes) db.substitutes=[]; if(!db.subAssignments) db.subAssignments=[]; }
function registerSub() { let n=prompt('Name:'),e=prompt('Email:'); initSubstitutes(); db.substitutes.push({id:'sub_'+Date.now(),name:n,email:e,available:true}); save(); showToast('Registered'); }
function renderSubs() { initSubstitutes(); let avail=(db.substitutes||[]).filter(s=>s.available).length; return '<div class="col-main"><h2>👩‍🏫 Substitutes</h2><div class="stats-card"><h3>'+avail+'</h3><p>Available</p></div><button class="btn-zen primary" onclick="registerSub()">+ Register</button></div>'; }
function initPD() { if(!db.pdCourses) db.pdCourses=[]; if(!db.pdCertificates) db.pdCertificates=[]; }
function createPD() { let t=prompt('Title:'),h=prompt('Hours:'); initPD(); db.pdCourses.push({id:'pd_'+Date.now(),title:t,hours:parseFloat(h)}); save(); showToast('PD created'); }
function renderPD() { initPD(); let certs=(db.pdCertificates||[]).filter(c=>c.user===state.user); let hrs=certs.reduce((a,c)=>a+c.hours,0); return '<div class="col-main"><h2>📚 PD</h2><div class="stats-card"><h3>'+hrs+'</h3><p>Hours Completed</p></div><button class="btn-zen primary" onclick="createPD()">+ Add Course</button></div>'; }
function initReportCards() { if(!db.reportCards) db.reportCards=[]; if(!db.reportPeriods) db.reportPeriods=[]; }
function createReportPeriod() { let n=prompt('Name (e.g., Q1):'),s=prompt('Start:'),e=prompt('End:'); initReportCards(); db.reportPeriods.push({id:'period_'+Date.now(),name:n,startDate:s,endDate:e}); save(); showToast('Period created'); }
function renderReportCards() { initReportCards(); return '<div class="col-main"><h2>📄 Report Cards</h2><button class="btn-zen primary" onclick="createReportPeriod()">+ Create Period</button></div>'; }
function initBehavior() { if(!db.behaviorRecords) db.behaviorRecords=[]; if(!db.behaviorConsequences) db.behaviorConsequences=[]; }
function recordBehavior() { let s=prompt('Student:'),t=prompt('Type (positive/negative):'),b=prompt('Behavior:'); initBehavior(); db.behaviorRecords.push({id:'beh_'+Date.now(),student:s,type:t,behavior:b,date:new Date().toISOString(),recordedBy:state.user}); save(); showToast('Recorded'); }
function renderBehavior() { initBehavior(); let pos=(db.behaviorRecords||[]).filter(r=>r.type==='positive').length,neg=(db.behaviorRecords||[]).filter(r=>r.type==='negative').length; return '<div class="col-main"><h2>📋 Behavior</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div class="stats-card" style="background:#d1fae5;"><h3 style="color:#065f46;">'+pos+'</h3><p>Positive</p></div><div class="stats-card" style="background:#fee2e2;"><h3 style="color:#991b1b;">'+neg+'</h3><p>Negative</p></div></div><button class="btn-zen primary" onclick="recordBehavior()">+ Record</button></div>'; }
function initRTI() { if(!db.rtiInterventions) db.rtiInterventions=[]; }
function createRTI() { let s=prompt('Student:'),tier=prompt('Tier (1/2/3):'),int=prompt('Intervention:'); initRTI(); db.rtiInterventions.push({id:'rti_'+Date.now(),student:s,tier:parseInt(tier),intervention:int,status:'active'}); save(); showToast('Created'); }
function renderRTI() { initRTI(); let t1=(db.rtiInterventions||[]).filter(r=>r.tier===1).length,t2=(db.rtiInterventions||[]).filter(r=>r.tier===2).length,t3=(db.rtiInterventions||[]).filter(r=>r.tier===3).length; return '<div class="col-main"><h2>🎯 RTI</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"><div class="stats-card"><h3>'+t1+'</h3><p>Tier 1</p></div><div class="stats-card"><h3>'+t2+'</h3><p>Tier 2</p></div><div class="stats-card"><h3>'+t3+'</h3><p>Tier 3</p></div></div><button class="btn-zen primary" onclick="createRTI()">+ Create</button></div>'; }
function initIEP() { if(!db.iepStudents) db.iepStudents=[]; if(!db.iepGoals) db.iepGoals=[]; }
function addIEPStudent() { let s=prompt('Student:'),d=prompt('Disability:'),r=prompt('Review date:'); initIEP(); db.iepStudents.push({id:'iep_'+Date.now(),student:s,disability:d,nextReview:r,goals:[]}); save(); showToast('Added'); }
function renderIEP() { initIEP(); return '<div class="col-main"><h2>♿ IEP</h2><button class="btn-zen primary" onclick="addIEPStudent()">+ Add Student</button></div>'; }
function init504() { if(!db.plans504) db.plans504=[]; }
function add504Plan() { let s=prompt('Student:'),a=prompt('Accommodations:'),c=prompt('Coordinator:'); init504(); db.plans504.push({id:'504_'+Date.now(),student:s,accommodations:a.split(','),coordinator:c,status:'active'}); save(); showToast('Created'); }
function render504() { init504(); return '<div class="col-main"><h2>📋 504 Plans</h2><button class="btn-zen primary" onclick="add504Plan()">+ Add Plan</button></div>'; }
function initClubs() { if(!db.clubs) db.clubs=[]; }
function createClub() { let n=prompt('Club name:'),d=prompt('Description:'),s=prompt('Sponsor:'); initClubs(); db.clubs.push({id:'club_'+Date.now(),name:n,description:d,sponsor:s,members:[]}); save(); showToast('Club created'); }
function renderClubs() { initClubs(); return '<div class="col-main"><h2>🎭 Clubs</h2><button class="btn-zen primary" onclick="createClub()">+ Create Club</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:16px;">'+(db.clubs||[]).map(c=>'<div class="post-box"><h4>'+c.name+'</h4><p style="font-size:12px;color:var(--text-muted);">'+c.description+'</p><p style="font-size:12px;">Sponsor: '+c.sponsor+'</p></div>').join('')+'</div></div>'; }
function initLockers() { if(!db.lockers) db.lockers=[]; }
function addLockers() { let s=prompt('Start #:'),n=prompt('Count:'); initLockers(); for(let i=0;i<parseInt(n);i++)db.lockers.push({id:'locker_'+(parseInt(s)+i),number:parseInt(s)+i,status:'available'}); save(); showToast(n+' lockers added'); }
function renderLockers() { initLockers(); let avail=(db.lockers||[]).filter(l=>l.status==='available').length; return '<div class="col-main"><h2>🔐 Lockers</h2><div class="stats-card"><h3>'+avail+'</h3><p>Available</p></div><button class="btn-zen primary" onclick="addLockers()">+ Add Lockers</button></div>'; }
function initInventory() { if(!db.inventory) db.inventory=[]; if(!db.inventoryCheckout) db.inventoryCheckout=[]; }
function addInventoryItem() { let n=prompt('Item:'),c=prompt('Category:'),q=prompt('Qty:'); initInventory(); db.inventory.push({id:'inv_'+Date.now(),name:n,category:c,quantity:parseInt(q),available:parseInt(q)}); save(); showToast('Added'); }
function renderInventory() { initInventory(); return '<div class="col-main"><h2>📦 Inventory</h2><button class="btn-zen primary" onclick="addInventoryItem()">+ Add Item</button></div>'; }
function initFacility() { if(!db.facilities) db.facilities=[]; if(!db.bookings) db.bookings=[]; }
function addFacility() { let n=prompt('Name:'),t=prompt('Type:'),cap=prompt('Capacity:'); initFacility(); db.facilities.push({id:'fac_'+Date.now(),name:n,type:t,capacity:parseInt(cap)}); save(); showToast('Added'); }
function renderFacilities() { initFacility(); return '<div class="col-main"><h2>🏢 Facilities</h2><button class="btn-zen primary" onclick="addFacility()">+ Add Facility</button></div>'; }
function initPayments() { if(!db.fees) db.fees=[]; if(!db.payments) db.payments=[]; }
function addFee() { let s=prompt('Student:'),d=prompt('Description:'),a=prompt('Amount:'); initPayments(); db.fees.push({id:'fee_'+Date.now(),student:s,description:d,amount:parseFloat(a),status:'pending'}); save(); showToast('Fee added'); }
function renderPayments() { initPayments(); let pending=(db.fees||[]).filter(f=>f.status==='pending'); let due=pending.reduce((a,f)=>a+f.amount,0); return '<div class="col-main"><h2>💵 Fees</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;"><div class="stats-card"><h3>'+pending.length+'</h3><p>Pending</p></div><div class="stats-card"><h3>$'+due+'</h3><p>Total Due</p></div></div><button class="btn-zen primary" onclick="addFee()">+ Add Fee</button></div>'; }
function initEmergency() { if(!db.emergencyContacts) db.emergencyContacts={}; if(!db.emergencyAlerts) db.emergencyAlerts=[]; }
function addEmergencyContact() { let s=prompt('Student:'),n=prompt('Name:'),p=prompt('Phone:'),r=prompt('Relationship:'); initEmergency(); if(!db.emergencyContacts[s])db.emergencyContacts[s]=[]; db.emergencyContacts[s].push({name:n,phone:p,relationship:r}); save(); showToast('Contact added'); }
function sendEmergencyAlert() { let t=prompt('Type (lockdown/fire/weather):'),m=prompt('Message:'); initEmergency(); db.emergencyAlerts.push({id:'alert_'+Date.now(),type:t,message:m,sentAt:new Date().toISOString(),sentBy:state.user,status:'active'}); save(); showToast('🚨 ALERT SENT!'); }
function renderEmergency() { initEmergency(); let active=(db.emergencyAlerts||[]).filter(a=>a.status==='active'); return '<div class="col-main"><h2>🚨 Emergency</h2>'+(active.length?'<div class="post-box" style="background:#fee2e2;border:2px solid #ef4444;"><h3>ACTIVE ALERTS</h3>'+active.map(a=>'<p><strong>'+a.type.toUpperCase()+':</strong> '+a.message+'</p>').join('')+'</div>':'')+'<button class="btn-zen" style="background:#fee2e2;color:#991b1b;padding:16px;" onclick="sendEmergencyAlert()">🚨 Send Alert</button></div>'; }

// ====== STUDENT FEATURES (51-80) =====
function initCredits() { if(!db.credits) db.credits={}; if(!db.gradReqs) db.gradReqs={english:4,math:4,science:3,socialStudies:3,pe:2,arts:1,electives:4}; }
function trackCredits() { let c={english:0,math:0,science:0,socialStudies:0,pe:0,arts:0,electives:0}; (db.enrollments||[]).filter(e=>e.user===state.user).forEach(e=>{c.electives+=1;}); initCredits(); db.credits[state.user]=c; save(); let total=Object.values(c).reduce((a,b)=>a+b,0),req=Object.values(db.gradReqs).reduce((a,b)=>a+b,0); showToast('Credits: '+total+'/'+req); }
function renderGraduationProgress() { initCredits(); let my=db.credits[state.user]||{english:0,math:0,science:0,socialStudies:0,pe:0,arts:0,electives:0},req=db.gradReqs; return '<div class="col-main"><h2>🎓 Graduation</h2><div style="display:grid;gap:12px;">'+Object.entries(req).map(([s,r])=>{let e=my[s]||0,pct=Math.min(100,(e/r)*100);return'<div style="padding:16px;background:white;border-radius:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="text-transform:capitalize;">'+s.replace(/([A-Z])/g,' $1')+'</span><span>'+e+'/'+r+'</span></div><div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;"><div style="height:100%;width:'+pct+'%;background:'+(pct>=100?'var(--success)':'var(--primary)')+';"></div></div></div>';}).join('')+'</div></div>'; }
function initCollege() { if(!db.collegeInterests) db.collegeInterests={}; if(!db.satActScores) db.satActScores={}; }
function addCollege() { let c=prompt('College:'),d=prompt('Deadline:'); initCollege(); if(!db.collegeInterests[state.user])db.collegeInterests[state.user]=[]; db.collegeInterests[state.user].push({college:c,deadline:d,status:'researching'}); save(); showToast('Added'); }
function addTestScore() { let t=prompt('Test (SAT/ACT):'),s=prompt('Score:'); initCollege(); if(!db.satActScores[state.user])db.satActScores[state.user]=[]; db.satActScores[state.user].push({type:t,score:parseInt(s),date:new Date().toISOString()}); save(); showToast('Score added'); }
function renderCollegePlanning() { initCollege(); let colleges=(db.collegeInterests||{})[state.user]||[],tests=(db.satActScores||{})[state.user]||[]; return '<div class="col-main"><h2>🎯 College Planning</h2><button class="btn-zen primary" onclick="addCollege()">+ Add College</button><button class="btn-zen" onclick="addTestScore()">+ Add Score</button><div class="post-box"><h3>Colleges</h3>'+(colleges.map(c=>'<div style="padding:8px;border-bottom:1px solid var(--border);"><strong>'+c.college+'</strong> - '+c.status+'<br><span style="font-size:11px;">Deadline: '+c.deadline+'</span></div>').join('')||'<p>No colleges.</p>')+'</div></div>'; }
function initPortfolio() { if(!db.portfolioItems) db.portfolioItems=[]; }
function addPortfolioItem() { let t=prompt('Title:'),d=prompt('Description:'); initPortfolio(); db.portfolioItems.push({id:'port_'+Date.now(),user:state.user,title:t,description:d,date:new Date().toISOString()}); save(); showToast('Added'); }
function renderPortfolio() { initPortfolio(); let items=(db.portfolioItems||[]).filter(p=>p.user===state.user); return '<div class="col-main"><h2>📁 Portfolio</h2><button class="btn-zen primary" onclick="addPortfolioItem()">+ Add Item</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:16px;">'+items.map(i=>'<div class="post-box"><h4>'+i.title+'</h4><p style="font-size:12px;">'+i.description+'</p><span style="font-size:11px;color:var(--text-muted);">'+i.date+'</span></div>').join('')+'</div></div>'; }
function initReadingLevels() { if(!db.readingLevels) db.readingLevels={}; }
function updateReadingLevel() { let s=prompt('Student:'),l=prompt('Lexile:'); initReadingLevels(); if(!db.readingLevels[s])db.readingLevels[s]=[]; db.readingLevels[s].push({lexile:parseInt(l),date:new Date().toISOString()}); save(); showToast('Updated'); }
function renderReadingLevels() { initReadingLevels(); return '<div class="col-main"><h2>📖 Reading Levels</h2><button class="btn-zen primary" onclick="updateReadingLevel()">+ Update</button></div>'; }
function initMathFluency() { if(!db.mathFluency) db.mathFluency={}; }
function recordFluency() { let s=prompt('Student:'),o=prompt('Op (+,-,*,/):'),p=prompt('Problems:'),c=prompt('Correct:'); initMathFluency(); if(!db.mathFluency[s])db.mathFluency[s]=[]; db.mathFluency[s].push({operation:o,problems:parseInt(p),correct:parseInt(c),accuracy:Math.round((c/p)*100),date:new Date().toISOString()}); save(); showToast('Recorded'); }
function renderMathFluency() { initMathFluency(); return '<div class="col-main"><h2>🔢 Math Fluency</h2><button class="btn-zen primary" onclick="recordFluency()">+ Record</button></div>'; }
function initDigitalCitizen() { if(!db.digitalCitizen) db.digitalCitizen={}; }
function recordDigitalLearning() { let t=prompt('Topic:'),s=prompt('Score %:'); initDigitalCitizen(); if(!db.digitalCitizen[state.user])db.digitalCitizen[state.user]=[]; db.digitalCitizen[state.user].push({topic:t,score:parseFloat(s),date:new Date().toISOString()}); save(); showToast('Recorded'); }
function renderDigitalCitizen() { initDigitalCitizen(); return '<div class="col-main"><h2>💻 Digital Citizenship</h2><button class="btn-zen primary" onclick="recordDigitalLearning()">+ Record</button></div>'; }
function initStandards() { if(!db.standards) db.standards=[]; }
function addStandard() { let c=prompt('Code:'),d=prompt('Description:'); initStandards(); db.standards.push({id:'std_'+Date.now(),code:c,description:d,subject:prompt('Subject:')||'',gradeLevel:prompt('Grade:')||''}); save(); showToast('Added'); }
function renderStandards() { initStandards(); return '<div class="col-main"><h2>📖 Standards</h2><button class="btn-zen primary" onclick="addStandard()">+ Add</button></div>'; }
function initBenchmarks() { if(!db.benchmarks) db.benchmarks=[]; if(!db.benchmarkResults) db.benchmarkResults=[]; }
function createBenchmark() { let n=prompt('Name:'),s=prompt('Subject:'); initBenchmarks(); db.benchmarks.push({id:'bench_'+Date.now(),name:n,subject:s,date:new Date().toISOString()}); save(); showToast('Created'); }
function renderBenchmarks() { initBenchmarks(); return '<div class="col-main"><h2>📊 Benchmarks</h2><button class="btn-zen primary" onclick="createBenchmark()">+ Create</button></div>'; }
function initNurse() { if(!db.nurseVisits) db.nurseVisits=[]; }
function logNurseVisit() { let s=prompt('Student:'),r=prompt('Reason:'),a=prompt('Action:'); initNurse(); db.nurseVisits.push({id:'visit_'+Date.now(),student:s,reason:r,action:a,date:new Date().toISOString(),nurse:state.user}); save(); showToast('Logged'); }
function renderNurse() { initNurse(); let today=(db.nurseVisits||[]).filter(v=>v.date.startsWith(new Date().toISOString().split('T')[0])).length; return '<div class="col-main"><h2>🏥 Nurse Office</h2><div class="stats-card"><h3>'+today+'</h3><p>Today Visits</p></div><button class="btn-zen primary" onclick="logNurseVisit()">+ Log Visit</button></div>'; }
function initImmunizations() { if(!db.immunizations) db.immunizations={}; }
function addImmunization() { let s=prompt('Student:'),v=prompt('Vaccine:'),d=prompt('Date:'); initImmunizations(); if(!db.immunizations[s])db.immunizations[s]=[]; db.immunizations[s].push({vaccine:v,date:d}); save(); showToast('Added'); }
function renderImmunizations() { initImmunizations(); return '<div class="col-main"><h2>💉 Immunizations</h2><button class="btn-zen primary" onclick="addImmunization()">+ Add</button></div>'; }
function initMedications() { if(!db.medications) db.medications={}; }
function addMedication() { let s=prompt('Student:'),n=prompt('Name:'),dos=prompt('Dosage:'); initMedications(); if(!db.medications[s])db.medications[s]=[]; db.medications[s].push({name:n,dosage:dos,active:true}); save(); showToast('Added'); }
function renderMedications() { initMedications(); return '<div class="col-main"><h2>💊 Medications</h2><button class="btn-zen primary" onclick="addMedication()">+ Add</button></div>'; }
function renderStudentSchedule() { let courses=(db.enrollments||[]).filter(e=>e.user===state.user).map(e=>db.courses.find(c=>c.id===e.courseId)).filter(c=>c); return '<div class="col-main"><h2>📅 My Schedule</h2><div class="post-box"><h3>My Courses</h3>'+courses.map(c=>'<div style="padding:12px;border-bottom:1px solid var(--border);"><strong>'+c.name+'</strong><br><span style="font-size:12px;">'+c.section+'</span></div>').join('')+'</div></div>'; }
function calculateGPA() { let courses=(db.enrollments||[]).filter(e=>e.user===state.user); let grades=courses.map(e=>{let p=calculateWeightedGrade(state.user)||0;return p>=93?4.0:p>=90?3.7:p>=87?3.3:p>=83?3.0:p>=80?2.7:p>=77?2.3:p>=73?2.0:p>=70?1.7:p>=67?1.3:p>=63?1.0:p>=60?0.7:0;}); let gpa=grades.length>0?grades.reduce((a,b)=>a+b,0)/grades.length:0; showToast('GPA: '+gpa.toFixed(2)); }
function calculateNeededGrade() { let target=prompt('Target %:'),remaining=parseFloat(prompt('Remaining %:')||'20'); let current=calculateWeightedGrade(state.user)||0; let needed=(parseFloat(target)-(current*(1-remaining/100)))/(remaining/100); showToast(needed>100?'Not achievable':'Need '+Math.round(needed)+'%'); }
function generateCertificate() { let course=db.courses.find(c=>c.id===state.courseId); let pct=calculateWeightedGrade(state.user)||0; let html='<div style="width:800px;padding:60px;background:white;border:20px double #1a5b8f;text-align:center;font-family:serif;"><div style="font-size:48px;">🎓</div><div style="font-size:24px;color:#1a5b8f;">CERTIFICATE OF COMPLETION</div><div style="font-size:18px;margin:30px 0;">This certifies that</div><div style="font-size:36px;font-weight:bold;border-bottom:2px solid #333;display:inline-block;padding:0 40px;">'+db.users[state.user]?.name+'</div><div style="font-size:18px;margin:20px 0;">has successfully completed</div><div style="font-size:28px;font-weight:bold;color:#1a5b8f;">'+(course?.name||'Course')+'</div><div>with a grade of '+pct+'%</div><div style="margin-top:40px;">'+new Date().toLocaleDateString()+'</div></div>'; let win=window.open('','_blank'); win.document.write('<html><body>'+html+'</body></html>'); win.document.close(); }
function initTranslations() { if(!db.translations)db.translations={es:{welcome:'Bienvenido',dashboard:'Panel',courses:'Cursos'},fr:{welcome:'Bienvenue',dashboard:'Tableau',courses:'Cours'},de:{welcome:'Willkommen',dashboard:'Armaturenbrett',courses:'Kurse'}}; }
function translatePage(lang) { initTranslations(); let t=db.translations[lang]; if(!t)return; Object.entries(t).forEach(([k,v])=>{document.body.innerHTML=document.body.innerHTML.replace(new RegExp(k,'gi'),v);}); showToast('Translated'); }
function enableImmersiveReader() { let c=document.querySelector('.col-main')?.textContent; if(!c)return; if('speechSynthesis'in window){let u=new SpeechSynthesisUtterance(c);u.rate=1;speechSynthesis.speak(u);showToast('Reading...');} }
function stopReading() { if('speechSynthesis'in window)speechSynthesis.cancel(); }
function initAPI() { if(!db.apiKeys)db.apiKeys=[]; }
function generateAPIKey() { let n=prompt('Name:'); let k='zentelle_'+Math.random().toString(36).substr(2,16)+Math.random().toString(36).substr(2,16); initAPI(); db.apiKeys.push({id:'key_'+Date.now(),name:n,key:k,createdAt:new Date().toISOString()}); save(); showToast('Key: '+k); }
function initAudit() { if(!db.auditTrail)db.auditTrail=[]; }
function logAudit(action,details) { initAudit(); db.auditTrail.push({action,details,user:state.user,timestamp:new Date().toISOString()}); }
function initNewsletter() { if(!db.newsletters)db.newsletters=[]; }
function createNewsletter() { let t=prompt('Title:'),c=prompt('Content:'); initNewsletter(); db.newsletters.push({id:'news_'+Date.now(),title:t,content:c,createdAt:new Date().toISOString()}); save(); showToast('Created'); }
function initDataRecovery() { if(!db.backups)db.backups=[]; }
function createBackup() { initDataRecovery(); let backup=JSON.stringify(db); db.backups.push({id:'backup_'+Date.now(),data:backup,createdAt:new Date().toISOString()}); if(db.backups.length>10)db.backups=db.backups.slice(-10); save(); showToast('Backup created'); }
function restoreBackup(id) { let backup=db.backups.find(b=>b.id===id); if(!backup)return; if(confirm('This will replace current data. Continue?')){db=JSON.parse(backup.data);save();showToast('Restored');render();} }
function initAnalytics() { if(!db.analytics)db.analytics={}; }
function trackAnalytics(event,data) { initAnalytics(); if(!db.analytics[event])db.analytics[event]=[]; db.analytics[event].push({...data,timestamp:new Date().toISOString()}); }
function renderAnalytics() { initAnalytics(); return '<div class="col-main"><h2>📊 Analytics</h2><div class="stats-card"><h3>'+Object.keys(db.analytics).length+'</h3><p>Events Tracked</p></div></div>'; }
function initAchievements() { if(!db.achievements)db.achievements=[]; if(!db.unlockedBadges)db.unlockedBadges=[]; }
function awardAchievement(user,badge) { if(!db.unlockedBadges[user])db.unlockedBadges[user]=[]; if(!db.unlockedBadges[user].includes(badge)){db.unlockedBadges[user].push(badge);save();showToast('Achievement unlocked!');} }
function initNotifications() { if(!db.notifications)db.notifications={}; }
function sendNotification(user,message) { initNotifications(); if(!db.notifications[user])db.notifications[user]=[]; db.notifications[user].push({id:'notif_'+Date.now(),message,timestamp:new Date().toISOString(),read:false}); save(); }
function renderNotifications() { initNotifications(); let notifs=(db.notifications[state.user]||[]).filter(n=>!n.read); return '<div class="col-main"><h2>🔔 Notifications</h2>'+(notifs.map(n=>'<div class="post-box" style="margin-bottom:8px;">'+n.message+'<br><span style="font-size:11px;color:var(--text-muted);">'+n.timestamp+'</span></div>').join('')||'<p>No notifications.</p>'); }
function markAllRead() { initNotifications(); if(db.notifications[state.user])db.notifications[state.user].forEach(n=>n.read=true); save(); showToast('All read'); }

// Initialize all features
initDistrict(); initGradeLevels(); initHomerooms(); initCounselor(); initHealthRecords(); initLibrary(); initAthletics(); initCafeteria(); initTransportation(); initHallPass(); initVisitors(); initPTA(); initFundraising(); initLessonPlans(); initSubstitutes(); initPD(); initReportCards(); initBehavior(); initRTI(); initIEP(); init504(); initClubs(); initLockers(); initInventory(); initFacility(); initPayments(); initEmergency(); initCredits(); initCollege(); initPortfolio(); initReadingLevels(); initMathFluency(); initDigitalCitizen(); initStandards(); initBenchmarks(); initNurse(); initImmunizations(); initMedications(); initAPI(); initAudit(); initNewsletter(); initDataRecovery(); initAnalytics(); initAchievements(); initNotifications();

if(document.getElementById('root')) render();

// ====== ADDITIONAL K-12 FEATURES (81-120) ======
function renderAdminToolbar() { let role=db.users[state.user]?.role; if(role!=='admin'&&role!=='teacher')return''; return '<div style="background:var(--bg-secondary);padding:8px 16px;display:flex;gap:8px;overflow-x:auto;flex-wrap:wrap;font-size:12px;border-bottom:1px solid var(--border);">'+(role==='admin'?'<button class="btn-zen" onclick="renderDistrictDashboard()">🏛 District</button>':'')+'<button class="btn-zen" onclick="renderCounselorDashboard()">🎓 Counselor</button><button class="btn-zen" onclick="renderLibrary()">📚 Library</button><button class="btn-zen" onclick="renderAthletics()">🏆 Athletics</button><button class="btn-zen" onclick="renderCafeteria()">🍽 Cafeteria</button><button class="btn-zen" onclick="renderBusRoutes()">🚌 Buses</button><button class="btn-zen" onclick="renderHallPass()">🎫 Hall Pass</button><button class="btn-zen" onclick="renderVisitors()">👤 Visitors</button><button class="btn-zen" onclick="renderPTA()">🤝 PTA</button><button class="btn-zen" onclick="renderFundraising()">💰 Funds</button><button class="btn-zen" onclick="renderLessonPlans()">📝 Plans</button><button class="btn-zen" onclick="renderSubs()">👩‍🏫 Subs</button><button class="btn-zen" onclick="renderPD()">📚 PD</button><button class="btn-zen" onclick="renderReportCards()">📄 Reports</button><button class="btn-zen" onclick="renderBehavior()">📋 Behavior</button><button class="btn-zen" onclick="renderRTI()">🎯 RTI</button><button class="btn-zen" onclick="renderIEP()">♿ IEP</button><button class="btn-zen" onclick="render504()">📋 504</button><button class="btn-zen" onclick="renderClubs()">🎭 Clubs</button><button class="btn-zen" onclick="renderLockers()">🔐 Lockers</button><button class="btn-zen" onclick="renderInventory()">📦 Inventory</button><button class="btn-zen" onclick="renderFacilities()">🏢 Facilities</button><button class="btn-zen" onclick="renderPayments()">💵 Fees</button><button class="btn-zen" onclick="renderEmergency()">🚨 Emergency</button><button class="btn-zen" onclick="renderHealthAlerts()">🏥 Health</button><button class="btn-zen" onclick="renderNurse()">🩺 Nurse</button><button class="btn-zen" onclick="renderImmunizations()">💉 Vaccines</button><button class="btn-zen" onclick="renderMedications()">💊 Meds</button><button class="btn-zen" onclick="renderBenchmarks()">📊 Benchmarks</button><button class="btn-zen" onclick="renderStandards()">📖 Standards</button><button class="btn-zen" onclick="renderReadingLevels()">📖 Reading</button><button class="btn-zen" onclick="renderMathFluency()">🔢 Fluency</button><button class="btn-zen" onclick="renderDigitalCitizen()">💻 Digital</button><button class="btn-zen" onclick="renderAnalytics()">📈 Analytics</button><button class="btn-zen" onclick="generateAPIKey()">🔑 API</button><button class="btn-zen" onclick="createBackup()">💾 Backup</button></div>'; }
function renderStudentToolbar() { let role=db.users[state.user]?.role; if(role==='admin'||role==='teacher')return''; return '<div style="background:var(--bg-secondary);padding:8px 16px;display:flex;gap:8px;overflow-x:auto;flex-wrap:wrap;font-size:12px;border-bottom:1px solid var(--border);"><button class="btn-zen" onclick="renderGraduationProgress()">🎓 Graduation</button><button class="btn-zen" onclick="renderCollegePlanning()">🎯 College</button><button class="btn-zen" onclick="renderPortfolio()">📁 Portfolio</button><button class="btn-zen" onclick="renderStudentSchedule()">📅 Schedule</button><button class="btn-zen" onclick="calculateGPA()">📊 GPA</button><button class="btn-zen" onclick="calculateNeededGrade()">🎯 Grade Calc</button><button class="btn-zen" onclick="generateCertificate()">🏆 Certificate</button><button class="btn-zen" onclick="renderReadingLevels()">📖 Reading</button><button class="btn-zen" onclick="renderDigitalCitizen()">💻 Digital</button><button class="btn-zen" onclick="enableImmersiveReader()">📖 Read Aloud</button><button class="btn-zen" onclick="translatePage(\'es\')">🇪🇸 Español</button><button class="btn-zen" onclick="translatePage(\'fr\')">🇫🇷 Français</button></div>'; }
function renderQuickStats() { let stats=[]; if(db.users)stats.push({label:'Users',value:Object.keys(db.users).length}); if(db.courses)stats.push({label:'Courses',value:db.courses.length}); if(db.materials)stats.push({label:'Materials',value:db.materials.length}); if(db.grades)stats.push({label:'Grades',value:db.grades.length}); return '<div style="display:flex;gap:16px;padding:16px;background:var(--bg-hover);border-radius:12px;font-size:12px;">'+stats.map(s=>'<div style="text-align:center;"><div style="font-size:18px;font-weight:700;">'+s.value+'</div><div style="color:var(--text-muted);">'+s.label+'</div></div>').join('')+'</div>'; }
function initAlerts() { if(!db.alerts)db.alerts=[]; }
function addAlert() { let t=prompt('Alert type (info/success/warning/danger):'),m=prompt('Message:'); initAlerts(); db.alerts.push({id:'alert_'+Date.now(),type:t,message:m,createdAt:new Date().toISOString()}); save(); showToast('Alert added'); }
function renderAlerts() { initAlerts(); return '<div>'+(db.alerts||[]).slice(-5).map(a=>'<div style="padding:12px;background:'+(a.type==='danger'?'#fee2e2':a.type==='warning'?'#fef3c7':a.type==='success'?'#d1fae5':'#e0f2fe')+';border-radius:8px;margin-bottom:8px;"><strong>'+a.type.toUpperCase()+':</strong> '+a.message+'</div>').join('')+'</div>'; }
function initAnnouncements() { if(!db.schoolAnnouncements)db.schoolAnnouncements=[]; }
function addAnnouncement() { let t=prompt('Title:'),m=prompt('Message:'); initAnnouncements(); db.schoolAnnouncements.push({id:'ann_'+Date.now(),title:t,message:m,createdAt:new Date().toISOString(),createdBy:state.user}); save(); showToast('Announcement added'); }
function renderSchoolAnnouncements() { initAnnouncements(); let ann=(db.schoolAnnouncements||[]); return '<div class="post-box"><h3 style="margin-top:0;">📢 School Announcements</h3>'+(ann.slice(-5).map(a=>'<div style="padding:12px;border-bottom:1px solid var(--border);"><strong>'+a.title+'</strong><br><span style="font-size:13px;">'+a.message+'</span><br><span style="font-size:11px;color:var(--text-muted);">'+new Date(a.createdAt).toLocaleDateString()+'</span></div>').join('')||'<p>No announcements.</p>')+'</div>'; }
function initPolls() { if(!db.polls)db.polls=[]; if(!db.pollVotes)db.pollVotes=[]; }
function createPoll() { let q=prompt('Question:'),o=prompt('Options (comma separated):'); initPolls(); db.polls.push({id:'poll_'+Date.now(),question:q,options:o.split(',').map(s=>s.trim()),createdAt:new Date().toISOString(),active:true}); save(); showToast('Poll created'); }
function votePoll() { let pollId=prompt('Poll ID:'),opt=prompt('Your vote:'); initPolls(); if(!db.pollVotes[state.user])db.pollVotes[state.user]=[]; if(db.pollVotes[state.user].includes(pollId))return showToast('Already voted'); db.pollVotes[state.user].push(pollId); let poll=db.polls.find(p=>p.id===pollId); if(poll&&!poll.votes)poll.votes={}; if(poll&&poll.votes)poll.votes[opt]=(poll.votes[opt]||0)+1; save(); showToast('Voted'); }
function renderPolls() { initPolls(); let polls=(db.polls||[]).filter(p=>p.active); return '<div class="post-box"><h3>📊 Polls</h3><button class="btn-zen primary" onclick="createPoll()">+ Create</button>'+polls.slice(-5).map(p=>{let voted=(db.pollVotes||{})[state.user]?.includes(p.id);let total=Object.values(p.votes||{}).reduce((a,b)=>a+b,0);return'<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-top:12px;"><strong>'+p.question+'</strong>'+(voted?'<div style="font-size:12px;margin-top:8px;">Results:</div>'+(p.options||[]).map(o=>{let pct=total>0?Math.round((p.votes?.[o]||0)/total*100):0;return'<div style="font-size:12px;">'+o+': '+pct+'%</div>';}).join(''):'<button class="btn-zen" style="margin-top:8px;" onclick="votePoll()">Vote</button>')+'</div>';}).join('')+'</div>'; }
function initSurveys() { if(!db.surveys)db.surveys=[]; }
function createSurvey() { let t=prompt('Title:'),q=prompt('Questions (comma separated):'); initSurveys(); db.surveys.push({id:'survey_'+Date.now(),title:t,questions:q.split(',').map(s=>s.trim()),createdAt:new Date().toISOString(),responses:[]}); save(); showToast('Survey created'); }
function renderSurveys() { initSurveys(); return '<div class="post-box"><h3>📋 Surveys</h3><button class="btn-zen primary" onclick="createSurvey()">+ Create</button></div>'; }
function initForms() { if(!db.forms)db.forms=[]; }
function createForm() { let t=prompt('Form title:'),f=prompt('Fields (comma separated):'); initForms(); db.forms.push({id:'form_'+Date.now(),title:t,fields:f.split(',').map(s=>s.trim()),createdAt:new Date().toISOString(),submissions:[]}); save(); showToast('Form created'); }
function renderForms() { initForms(); return '<div class="post-box"><h3>📝 Forms</h3><button class="btn-zen primary" onclick="createForm()">+ Create</button></div>'; }
function initWiki() { if(!db.wikiPages)db.wikiPages=[]; }
function createWikiPage() { let t=prompt('Page title:'),c=prompt('Content:'); initWiki(); db.wikiPages.push({id:'wiki_'+Date.now(),title:t,content:c,createdAt:new Date().toISOString(),createdBy:state.user}); save(); showToast('Page created'); }
function renderWiki() { initWiki(); return '<div class="post-box"><h3>📖 Wiki</h3><button class="btn-zen primary" onclick="createWikiPage()">+ Create Page</button>'+(db.wikiPages||[]).map(p=>'<div style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="alert(\''+p.content.replace(/'/g,"\\'")+'\')"><strong>'+p.title+'</strong></div>').join('')+'</div>'; }
function initKnowledgeBase() { if(!db.kbArticles)db.kbArticles=[]; }
function createKBArticle() { let t=prompt('Title:'),c=prompt('Content:'),cat=prompt('Category:'); initKnowledgeBase(); db.kbArticles.push({id:'kb_'+Date.now(),title:t,content:c,category:cat,tags:[],createdAt:new Date().toISOString()}); save(); showToast('Article created'); }
function renderKnowledgeBase() { initKnowledgeBase(); let cats=[...new Set((db.kbArticles||[]).map(a=>a.category))]; return '<div class="col-main"><h2>📚 Knowledge Base</h2><button class="btn-zen primary" onclick="createKBArticle()">+ Create Article</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:16px;">'+cats.map(c=>'<div class="post-box"><h4>'+c+'</h4>'+(db.kbArticles||[]).filter(a=>a.category===c).map(a=>'<div style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--border);">'+a.title+'</div>').join('')+'</div>').join('')+'</div></div>'; }
function initFAQs() { if(!db.faqs)db.faqs=[]; }
function addFAQ() { let q=prompt('Question:'),a=prompt('Answer:'); initFAQs(); db.faqs.push({id:'faq_'+Date.now(),question:q,answer:a,views:0}); save(); showToast('FAQ added'); }
function renderFAQs() { initFAQs(); return '<div class="post-box"><h3>❓ FAQs</h3><button class="btn-zen primary" onclick="addFAQ()">+ Add FAQ</button>'+(db.faqs||[]).map(f=>'<details style="margin-top:12px;"><summary style="cursor:pointer;font-weight:600;">'+f.question+'</summary><div style="padding:12px;font-size:13px;">'+f.answer+'</div></details>').join('')+'</div>'; }
function initHelpTickets() { if(!db.helpTickets)db.helpTickets=[]; }
function createHelpTicket() { let s=prompt('Subject:'),d=prompt('Description:'); initHelpTickets(); db.helpTickets.push({id:'ticket_'+Date.now(),subject:s,description:d,status:'open',createdBy:state.user,createdAt:new Date().toISOString()}); save(); showToast('Ticket created'); }
function renderHelpTickets() { initHelpTickets(); let my=(db.helpTickets||[]).filter(t=>t.createdBy===state.user); return '<div class="col-main"><h2>🎫 Help Tickets</h2><button class="btn-zen primary" onclick="createHelpTicket()">+ Create Ticket</button><div class="post-box">'+my.map(t=>'<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-top:12px;"><strong>'+t.subject+'</strong><br><span style="font-size:12px;">'+t.description+'</span><br><span class="badge '+(t.status==='open'?'badge-warning':'badge-success')+'" style="margin-top:8px;">'+t.status+'</span></div>').join('')+'</div></div>'; }
function initApprovals() { if(!db.approvals)db.approvals=[]; }
function createApproval() { let t=prompt('Title:'),d=prompt('Description:'); initApprovals(); db.approvals.push({id:'apr_'+Date.now(),title:t,description:d,status:'pending',requestedBy:state.user,requestedAt:new Date().toISOString()}); save(); showToast('Approval request created'); }
function renderApprovals() { initApprovals(); let pending=(db.approvals||[]).filter(a=>a.status==='pending'); return '<div class="col-main"><h2>✅ Approvals</h2><button class="btn-zen primary" onclick="createApproval()">+ Request Approval</button><div class="post-box"><h3>Pending ('+pending.length+')</h3>'+pending.map(a=>'<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-top:12px;"><strong>'+a.title+'</strong><br><span style="font-size:12px;">'+a.description+'</span><br><button class="btn-zen" style="margin-top:8px;" onclick="approveRequest(\''+a.id+'\')">Approve</button></div>').join('')+'</div></div>'; }
function approveRequest(id) { initApprovals(); let req=db.approvals.find(a=>a.id===id); if(req){req.status='approved';save();showToast('Approved');render();} }
function initWorkflows() { if(!db.workflows)db.workflows=[]; }
function createWorkflow() { let n=prompt('Workflow name:'),s=prompt('Steps (comma separated):'); initWorkflows(); db.workflows.push({id:'wf_'+Date.now(),name:n,steps:s.split(',').map(s=>s.trim()),createdAt:new Date().toISOString()}); save(); showToast('Workflow created'); }
function renderWorkflows() { initWorkflows(); return '<div class="col-main"><h2>⚙️ Workflows</h2><button class="btn-zen primary" onclick="createWorkflow()">+ Create</button></div>'; }
function initTemplates() { if(!db.templates)db.templates=[]; }
function createTemplate() { let n=prompt('Template name:'),c=prompt('Content:'); initTemplates(); db.templates.push({id:'tmpl_'+Date.now(),name:n,content:c,createdAt:new Date().toISOString()}); save(); showToast('Template created'); }
function renderTemplates() { initTemplates(); return '<div class="col-main"><h2>📄 Templates</h2><button class="btn-zen primary" onclick="createTemplate()">+ Create</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:16px;">'+(db.templates||[]).map(t=>'<div class="post-box"><h4>'+t.name+'</h4><p style="font-size:12px;">'+t.content.substring(0,100)+'...</p></div>').join('')+'</div></div>'; }
function initChecklists() { if(!db.checklists)db.checklists=[]; }
function createChecklist() { let t=prompt('Title:'),i=prompt('Items (comma separated):'); initChecklists(); db.checklists.push({id:'cl_'+Date.now(),title:t,items:i.split(',').map(s=>({text:s.trim(),checked:false})),createdAt:new Date().toISOString()}); save(); showToast('Checklist created'); }
function renderChecklists() { initChecklists(); return '<div class="col-main"><h2>✅ Checklists</h2><button class="btn-zen primary" onclick="createChecklist()">+ Create</button></div>'; }
function initMilestones() { if(!db.milestones)db.milestones=[]; }
function createMilestone() { let t=prompt('Title:'),d=prompt('Due date:'),m=prompt('Milestone:'); initMilestones(); db.milestones.push({id:'ms_'+Date.now(),title:t,date:d,milestone:m,completed:false,createdAt:new Date().toISOString()}); save(); showToast('Created'); }
function renderMilestones() { initMilestones(); let m=(db.milestones||[]); return '<div class="col-main"><h2>🎯 Milestones</h2><button class="btn-zen primary" onclick="createMilestone()">+ Create</button><div class="post-box">'+(m.filter(ms=>!ms.completed).map(ms=>'<div style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-top:12px;"><strong>'+ms.title+'</strong> - Due: '+ms.date+'<br>'+ms.milestone+'</div>').join('')||'<p>All milestones completed!</p>')+'</div></div>'; }
function initGoals() { if(!db.goals)db.goals={}; if(!db.goals[state.user])db.goals[state.user]=[]; }
function createGoal() { let g=prompt('Goal:'); initGoals(); db.goals[state.user].push({id:'goal_'+Date.now(),text:g,completed:false,date:new Date().toISOString()}); save(); showToast('Goal added'); }
function renderGoals() { initGoals(); let goals=(db.goals?.[state.user]||[]); return '<div class="col-main"><h2>🎯 My Goals</h2><button class="btn-zen primary" onclick="createGoal()">+ Add Goal</button><div class="post-box">'+(goals.filter(g=>!g.completed).map(g=>'<div style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="completeGoal(\''+g.id+'\')">⬜ '+g.text+'</div>').join(''))+(goals.filter(g=>g.completed).map(g=>'<div style="padding:12px;border-bottom:1px solid var(--border);opacity:0.6;">✅ '+g.text+'</div>').join(''))+'</div></div>'; }
function completeGoal(id) { initGoals(); let g=(db.goals?.[state.user]||[]).find(g=>g.id===id); if(g){g.completed=true;save();render();showToast('Goal completed!');} }
function initTasks() { if(!db.tasks)db.tasks={}; if(!db.tasks[state.user])db.tasks[state.user]=[]; }
function addTask() { let t=prompt('Task:'),d=prompt('Due (YYYY-MM-DD):'); initTasks(); db.tasks[state.user].push({id:'task_'+Date.now(),text:t,due:d,priority:'normal',completed:false}); save(); showToast('Task added'); }
function renderTasks() { initTasks(); let tasks=(db.tasks?.[state.user]||[]); return '<div class="col-main"><h2>📋 Tasks</h2><button class="btn-zen primary" onclick="addTask()">+ Add</button><div style="display:grid;gap:8px;margin-top:16px;">'+(tasks.filter(t=>!t.completed).map(t=>'<div style="padding:12px;background:'+(new Date(t.due)<new Date()?'#fee2e2':'var(--bg-hover)')+';border-radius:8px;cursor:pointer;" onclick="completeTask(\''+t.id+'\')"><input type="checkbox"> '+t.text+'<br><span style="font-size:11px;">Due: '+t.due+'</span></div>').join(''))+'</div></div>'; }
function completeTask(id) { initTasks(); let t=(db.tasks?.[state.user]||[]).find(t=>t.id===id); if(t){t.completed=true;save();render();showToast('Done!');} }
function initHabits() { if(!db.habits)db.habits={}; if(!db.habits[state.user])db.habits[state.user]=[]; }
function addHabit() { let n=prompt('Habit name:'); initHabits(); db.habits[state.user].push({id:'habit_'+Date.now(),name:n,streak:0,lastCompleted:null}); save(); showToast('Habit added'); }
function completeHabit(id) { initHabits(); let h=(db.habits?.[state.user]||[]).find(h=>h.id===id); if(h){let today=new Date().toISOString().split('T')[0];if(h.lastCompleted!==today){h.streak++;h.lastCompleted=today;save();render();showToast('Streak: '+h.streak);}else showToast('Already done today!');} }
function renderHabits() { initHabits(); let habits=(db.habits?.[state.user]||[]); return '<div class="col-main"><h2>🔥 Habit Tracker</h2><button class="btn-zen primary" onclick="addHabit()">+ Add Habit</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;margin-top:16px;">'+habits.map(h=>'<div class="post-box" style="text-align:center;"><div style="font-size:32px;">🔥</div><div style="font-weight:700;">'+h.streak+'</div><div>'+h.name+'</div><button class="btn-zen" style="margin-top:8px;" onclick="completeHabit(\''+h.id+'\')">✓ Done</button></div>').join('')+'</div></div>'; }
function initMoodTracker() { if(!db.moodEntries)db.moodEntries=[]; }
function logMood(mood) { let note=prompt('Note (optional):'); initMoodTracker(); db.moodEntries.push({user:state.user,mood,note,date:new Date().toISOString()}); save(); showToast('Mood logged'); }
function renderMoodTracker() { initMoodTracker(); let entries=(db.moodEntries||[]).filter(e=>e.user===state.user); let recent=entries.slice(-7); let avg=recent.length>0?Math.round(recent.reduce((a,e)=>a+e.mood,0)/recent.length):0; return '<div class="col-main"><h2>😊 Mood Tracker</h2><div style="display:flex;gap:8px;margin-bottom:16px;">'+[1,2,3,4,5].map(m=>'<button class="btn-zen" onclick="logMood('+m+')" style="font-size:24px;">'+(m<=avg?'😊':m<=2?'😢':m<=3?'😐':m<=4?'🙂':'😄')+'</button>').join('')+'</div><div class="post-box"><h3>Last 7 Days</h3>'+recent.reverse().map(e=>'<div style="padding:8px;border-bottom:1px solid var(--border);"><span style="font-size:20px;">'+(e.mood<=1?'😢':e.mood<=2?'😔':e.mood<=3?'😐':e.mood<=4?'🙂':'😊')+'</span> '+new Date(e.date).toLocaleDateString()+'<br><span style="font-size:12px;">'+e.note+'</span></div>').join('')+'</div></div>'; }
function initWaterTracker() { if(!db.waterIntake)db.waterIntake={}; if(!db.waterIntake[state.user])db.waterIntake[state.user]={total:0,lastReset:new Date().toISOString().split('T')[0]}; }
function logWater(glasses) { initWaterTracker(); let today=new Date().toISOString().split('T')[0]; if(db.waterIntake[state.user].lastReset!==today){db.waterIntake[state.user]={total:0,lastReset:today};} db.waterIntake[state.user].total+=glasses||1; save(); showToast('Logged: '+db.waterIntake[state.user].total+' glasses'); }
function renderWaterTracker() { initWaterTracker(); let today=new Date().toISOString().split('T')[0]; if(db.waterIntake[state.user].lastReset!==today){db.waterIntake[state.user]={total:0,lastReset:today};save();} let total=db.waterIntake[state.user].total; return '<div class="col-main"><h2>💧 Water Tracker</h2><div class="post-box" style="text-align:center;"><div style="font-size:64px;">💧</div><div style="font-size:48px;font-weight:700;">'+total+'/8</div><div style="margin:16px 0;">'+(total>=8?'🎉 Goal reached!':'Keep going!')+'</div><button class="btn-zen primary" onclick="logWater(1)" style="margin:4px;">+1 Glass</button><button class="btn-zen" onclick="logWater(2)" style="margin:4px;">+2 Glasses</button></div></div>'; }
function initSleepTracker() { if(!db.sleepData)db.sleepData={}; }
function logSleep(hours) { initSleepTracker(); db.sleepData[state.user]=db.sleepData[state.user]||[]; db.sleepData[state.user].push({hours:parseFloat(hours),date:new Date().toISOString().split('T')[0]}); if(db.sleepData[state.user].length>30)db.sleepData[state.user]=db.sleepData[state.user].slice(-30); save(); showToast('Sleep logged: '+hours+' hours'); }
function renderSleepTracker() { initSleepTracker(); let data=(db.sleepData?.[state.user]||[]).slice(-7); let avg=data.length>0?Math.round(data.reduce((a,e)=>a+e.hours,0)/data.length*10)/10:0; return '<div class="col-main"><h2>😴 Sleep Tracker</h2><div class="post-box"><div style="text-align:center;margin-bottom:16px;"><div style="font-size:48px;">😴</div><div style="font-size:32px;font-weight:700;">'+avg+' hrs</div><div>7-day average</div></div><button class="btn-zen primary" onclick="logSleep(prompt(\'Hours:\'))">+ Log Sleep</button></div></div>'; }
function initExerciseTracker() { if(!db.exerciseData)db.exerciseData={}; }
function logExercise(type,minutes) { initExerciseTracker(); db.exerciseData[state.user]=db.exerciseData[state.user]||[]; db.exerciseData[state.user].push({type,minutes:parseInt(minutes),date:new Date().toISOString().split('T')[0]}); save(); showToast('Exercise logged'); }
function renderExerciseTracker() { initExerciseTracker(); let data=(db.exerciseData?.[state.user]||[]).filter(e=>e.date===new Date().toISOString().split('T')[0]); let total=data.reduce((a,e)=>a+e.minutes,0); return '<div class="col-main"><h2>🏃 Exercise Tracker</h2><div class="post-box"><div style="text-align:center;"><div style="font-size:48px;">🏃</div><div style="font-size:32px;font-weight:700;">'+total+' min</div><div>Today</div></div><button class="btn-zen primary" onclick="logExercise(prompt(\'Type:\'),prompt(\'Minutes:\'))">+ Log Exercise</button></div></div>'; }
function initWellness() { if(!db.wellnessScores)db.wellnessScores={}; }
function logWellnessScore(score) { initWellness(); db.wellnessScores[state.user]=db.wellnessScores[state.user]||[]; db.wellnessScores[state.user].push({score:parseInt(score),date:new Date().toISOString().split('T')[0]}); save(); showToast('Wellness: '+score+'/10'); }
function renderWellness() { return '<div class="col-main"><h2>🌟 Wellness</h2><div style="display:flex;gap:8px;">'+[1,2,3,4,5,6,7,8,9,10].map(n=>'<button class="btn-zen" onclick="logWellnessScore('+n+')" style="padding:12px 8px;">'+n+'</button>').join('')+'</div><button class="btn-zen" onclick="renderMoodTracker()" style="margin-top:16px;">😀 Mood</button><button class="btn-zen" onclick="renderSleepTracker()" style="margin-top:16px;">😴 Sleep</button><button class="btn-zen" onclick="renderExerciseTracker()" style="margin-top:16px;">🏃 Exercise</button></div>'; }
function initStudyTimer() { if(!db.studySessions)db.studySessions=[]; }
function startStudySession() { let subject=prompt('Subject:'); initStudyTimer(); let start=Date.now(); state.studySubject=subject; state.studyStart=start; showToast('Study session started'); }
function endStudySession() { if(!state.studyStart)return; let minutes=Math.round((Date.now()-state.studyStart)/60000); initStudyTimer(); db.studySessions.push({subject:state.studySubject,minutes,date:new Date().toISOString().split('T')[0]}); save(); showToast('Session ended: '+minutes+' minutes'); state.studyStart=null; }
function renderStudyTimer() { let active=state.studyStart?'<div style="padding:20px;background:#e8f5e9;border-radius:12px;text-align:center;"><div style="font-size:32px;">⏱️</div><div style="font-size:24px;font-weight:700;">'+Math.round((Date.now()-state.studyStart)/60000)+' min</div><div>'+state.studySubject+'</div><button class="btn-zen" style="margin-top:8px;" onclick="endStudySession()">End Session</button></div>':'<div style="padding:20px;text-align:center;"><button class="btn-zen primary" onclick="startStudySession()">Start Study Session</button></div>'; let todaySessions=(db.studySessions||[]).filter(s=>s.date===new Date().toISOString().split('T')[0]); let total=todaySessions.reduce((a,s)=>a+s.minutes,0); return '<div class="col-main"><h2>📚 Study Timer</h2><div class="post-box"><h3>Today: '+total+' minutes</h3>'+active+'</div></div>'; }
function initPomodoro() { if(!state.pomodoroState)state.pomodoroState={running:false,time:25*60,type:'work'}; }
function togglePomodoro() { initPomodoro(); state.pomodoroState.running=!state.pomodoroState.running; if(state.pomodoroState.running){state.pomodoroInterval=setInterval(()=>{if(state.pomodoroState.time>0){state.pomodoroState.time--;render();}else{switchPomodoroType();}},1000);}else{clearInterval(state.pomodoroInterval);}render(); }
function switchPomodoroType() { initPomodoro(); state.pomodoroState.type=state.pomodoroState.type==='work'?'break':'work'; state.pomodoroState.time=state.pomodoroState.type==='work'?25*60:5*60; state.pomodoroState.running=false; clearInterval(state.pomodoroInterval);render(); }
function renderPomodoro() { initPomodoro(); let m=Math.floor(state.pomodoroState.time/60),s=state.pomodoroState.time%60; let color=state.pomodoroState.type==='work'?'#e8f5e9':'#fef3c7'; return '<div class="col-main"><h2>🍅 Pomodoro</h2><div class="post-box" style="text-align:center;padding:40px;background:'+color+';"><div style="font-size:48px;">'+(state.pomodoroState.type==='work'?'🍅':'☕')+'</div><div style="font-size:64px;font-weight:700;margin:16px 0;">'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s+'</div><div style="margin-bottom:16px;">'+(state.pomodoroState.type==='work'?'Work Time':'Break Time')+'</div><button class="btn-zen primary" onclick="togglePomodoro()">'+(state.pomodoroState.running?'Pause':'Start')+'</button><button class="btn-zen" onclick="switchPomodoroType()" style="margin-left:8px;">Switch</button></div></div>'; }
function initStudyGroups() { if(!db.studyGroups)db.studyGroups=[]; }
function createStudyGroup() { let n=prompt('Group name:'),t=prompt('Topic:'); initStudyGroups(); db.studyGroups.push({id:'sg_'+Date.now(),name:n,topic:t,members:[state.user],createdAt:new Date().toISOString()}); save(); showToast('Group created'); }
function joinStudyGroup() { let id=prompt('Group ID:'); initStudyGroups(); let g=db.studyGroups.find(g=>g.id===id); if(g&&!g.members.includes(state.user)){g.members.push(state.user);save();showToast('Joined!');} }
function renderStudyGroups() { initStudyGroups(); return '<div class="col-main"><h2>👥 Study Groups</h2><button class="btn-zen primary" onclick="createStudyGroup()">+ Create</button><button class="btn-zen" onclick="joinStudyGroup()">Join</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:16px;">'+(db.studyGroups||[]).map(g=>'<div class="post-box"><h4>'+g.name+'</h4><p style="font-size:12px;">Topic: '+g.topic+'</p><p style="font-size:12px;">Members: '+g.members.length+'</p></div>').join('')+'</div></div>'; }
function initFlashcards() { if(!db.flashcardDecks)db.flashcardDecks=[]; }
function createFlashcardDeck() { let n=prompt('Deck name:'); initFlashcards(); let deckId='deck_'+Date.now(); db.flashcardDecks.push({id:deckId,name:n,cards:[],createdAt:new Date().toISOString()}); save(); showToast('Deck created: '+deckId); }
function addFlashcard() { let deckId=prompt('Deck ID:'),q=prompt('Question:'),a=prompt('Answer:'); initFlashcards(); let deck=db.flashcardDecks.find(d=>d.id===deckId); if(deck){deck.cards.push({id:'card_'+Date.now(),question:q,answer:a});save();showToast('Card added');} }
function renderFlashcards() { initFlashcards(); return '<div class="col-main"><h2>🃏 Flashcards</h2><button class="btn-zen primary" onclick="createFlashcardDeck()">+ Create Deck</button><button class="btn-zen" onclick="addFlashcard()">+ Add Card</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:16px;">'+(db.flashcardDecks||[]).map(d=>'<div class="post-box"><h4>'+d.name+'</h4><p style="font-size:12px;">'+d.cards.length+' cards</p></div>').join('')+'</div></div>'; }
function initQuizzes() { if(!db.quizzes)db.quizzes=[]; }
function createQuiz() { let n=prompt('Quiz name:'),q=prompt('Questions (comma separated):'); initQuizzes(); db.quizzes.push({id:'quiz_'+Date.now(),name:n,questions:q.split(',').map(s=>s.trim()),createdAt:new Date().toISOString()}); save(); showToast('Quiz created'); }
function renderQuizzes() { initQuizzes(); return '<div class="col-main"><h2>❓ Quizzes</h2><button class="btn-zen primary" onclick="createQuiz()">+ Create Quiz</button></div>'; }
function initFlash() { if(!db.flashNotes)db.flashNotes=[]; }
function createFlashNote() { let t=prompt('Title:'),c=prompt('Content:'); initFlash(); db.flashNotes.push({id:'fn_'+Date.now(),title:t,content:c,createdAt:new Date().toISOString()}); save(); showToast('Note created'); }
function renderFlashNotes() { initFlash(); return '<div class="col-main"><h2>📝 Flash Notes</h2><button class="btn-zen primary" onclick="createFlashNote()">+ Create Note</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:16px;">'+(db.flashNotes||[]).map(n=>'<div class="post-box"><h4>'+n.title+'</h4><p style="font-size:12px;">'+n.content.substring(0,100)+'...</p></div>').join('')+'</div></div>'; }
function initIdeas() { if(!db.ideas)db.ideas=[]; }
function captureIdea() { let i=prompt('Idea:'); initIdeas(); db.ideas.push({id:'idea_'+Date.now(),text:i,status:'new',createdAt:new Date().toISOString()}); save(); showToast('Idea captured'); }
function renderIdeas() { initIdeas(); return '<div class="col-main"><h2>💡 Ideas</h2><button class="btn-zen primary" onclick="captureIdea()">+ Capture Idea</button><div style="display:grid;gap:8px;margin-top:16px;">'+(db.ideas||[]).slice(-10).reverse().map(i=>'<div class="post-box" style="padding:16px;">'+i.text+'<br><span style="font-size:11px;color:var(--text-muted);">'+new Date(i.createdAt).toLocaleDateString()+'</span></div>').join('')+'</div></div>'; }
function initGratitude() { if(!db.gratitudes)db.gratitudes=[]; }
function logGratitude() { let g=prompt('What are you grateful for?'); initGratitude(); db.gratitudes.push({text:g,date:new Date().toISOString()}); save(); showToast('Logged'); }
function renderGratitude() { initGratitude(); let list=(db.gratitudes||[]).slice(-7).reverse(); return '<div class="col-main"><h2>🙏 Gratitude Journal</h2><button class="btn-zen primary" onclick="logGratitude()">+ Log</button><div class="post-box"><h3>Recent</h3>'+list.map(g=>'<div style="padding:12px;border-bottom:1px solid var(--border);">'+g.text+'<br><span style="font-size:11px;color:var(--text-muted);">'+new Date(g.date).toLocaleDateString()+'</span></div>').join('')+'</div></div>'; }
function initReflections() { if(!db.reflections)db.reflections=[]; }
function writeReflection() { let t=prompt('Title:'),c=prompt('Reflection:'); initReflections(); db.reflections.push({title:t,content:c,date:new Date().toISOString()}); save(); showToast('Written'); }
function renderReflections() { initReflections(); return '<div class="col-main"><h2>📖 Daily Reflections</h2><button class="btn-zen primary" onclick="writeReflection()">+ Write</button></div>'; }
function initGoals() { if(!db.longTermGoals)db.longTermGoals=[]; }
function addLongTermGoal() { let g=prompt('Goal:'),d=prompt('Target date:'); initGoals(); db.longTermGoals.push({id:'ltg_'+Date.now(),text:g,targetDate:d,progress:0,createdAt:new Date().toISOString()}); save(); showToast('Goal added'); }
function renderLongTermGoals() { initGoals(); return '<div class="col-main"><h2>🎯 Long-term Goals</h2><button class="btn-zen primary" onclick="addLongTermGoal()">+ Add Goal</button></div>'; }
function initBucketList() { if(!db.bucketList)db.bucketList=[]; }
function addBucketItem() { let i=prompt('Bucket list item:'); initBucketList(); db.bucketList.push({id:'bl_'+Date.now(),text:i,completed:false,createdAt:new Date().toISOString()}); save(); showToast('Added'); }
function renderBucketList() { initBucketList(); let items=(db.bucketList||[]); return '<div class="col-main"><h2>🪣 Bucket List</h2><button class="btn-zen primary" onclick="addBucketItem()">+ Add</button><div class="post-box">'+(items.filter(i=>!i.completed).map(i=>'<div style="padding:12px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="completeBucketItem(\''+i.id+'\')">⬜ '+i.text+'</div>').join(''))+(items.filter(i=>i.completed).map(i=>'<div style="padding:12px;border-bottom:1px solid var(--border);opacity:0.5;">✅ '+i.text+'</div>').join(''))+'</div></div>'; }
function completeBucketItem(id) { initBucketList(); let i=(db.bucketList||[]).find(i=>i.id===id); if(i){i.completed=true;save();render();showToast('Completed!');} }
function initLifeAreas() { if(!db.lifeAreas)db.lifeAreas={career:50,health:50,relationships:50,finance:50,personal:50,fun:50}; }
function updateLifeArea(area,value) { initLifeAreas(); db.lifeAreas[area]=value; save(); render(); }
function renderLifeRadar() { initLifeAreas(); let areas=db.lifeAreas||{}; return '<div class="col-main"><h2>🎯 Life Balance</h2><div class="post-box">'+(Object.entries(areas).map(([area,val])=>'<div style="margin-bottom:16px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="text-transform:capitalize;">'+area.replace(/([A-Z])/g,' $1')+'</span><span>'+val+'%</span></div><div style="height:12px;background:var(--bg-hover);border-radius:6px;overflow:hidden;"><div style="height:100%;width:'+val+'%;background:var(--primary);"></div></div><input type="range" min="0" max="100" value="'+val+'" onchange="updateLifeArea(\''+area+'\',this.value)" style="width:100%;"></div>').join(''))+'</div></div>'; }
function initResolutions() { if(!db.resolutions)db.resolutions=[]; }
function addResolution() { let r=prompt('Resolution:'),y=prompt('Year:'); initResolutions(); db.resolutions.push({text:r,year:y,status:'active',createdAt:new Date().toISOString()}); save(); showToast('Resolution added'); }
function renderResolutions() { initResolutions(); let res=(db.resolutions||[]).filter(r=>r.status==='active'); return '<div class="col-main"><h2>🎊 Resolutions</h2><button class="btn-zen primary" onclick="addResolution()">+ Add</button><div class="post-box">'+(res.map(r=>'<div style="padding:12px;border-bottom:1px solid var(--border);">'+r.text+'<br><span style="font-size:11px;">'+r.year+'</span></div>').join(''))+'</div></div>'; }
function initWeeklyReview() { if(!db.weeklyReviews)db.weeklyReviews=[]; }
function createWeeklyReview() { let wins=prompt('Wins (comma separated):'),learn=prompt('Lessons (comma separated):'),next=prompt('Next week goals (comma separated):'); initWeeklyReview(); db.weeklyReviews.push({wins:wins.split(','),lessons:learn.split(','),nextWeek:next.split(','),date:new Date().toISOString()}); save(); showToast('Review saved'); }
function renderWeeklyReview() { initWeeklyReview(); let review=(db.weeklyReviews||[]).slice(-1)[0]; return '<div class="col-main"><h2>📊 Weekly Review</h2><button class="btn-zen primary" onclick="createWeeklyReview()">+ Create Review</button>'+(review?'<div class="post-box"><h3>Wins 🎉</h3>'+review.wins.map(w=>'<div>'+w+'</div>').join('')+'<h3>Lessons 📚</h3>'+review.lessons.map(l=>'<div>'+l+'</div>').join('')+'<h3>Next Week 🎯</h3>'+review.nextWeek.map(n=>'<div>'+n+'</div>').join('')+'</div>':'<p>No review yet.</p>')+'</div>'; }
function initGoalSetting() { if(!db.goalSetting)db.goalSetting={}; }
function createSmartGoal() { let g=prompt('Goal:'),s=prompt('Specific:'),m=prompt('Measurable:'),a=prompt('Achievable:'),r=prompt('Relevant:'),tb=prompt('Time-bound:'); initGoalSetting(); db.goalSetting[state.user]=db.goalSetting[state.user]||[]; db.goalSetting[state.user].push({goal:g,specific:s,measurable:m,achievable:a,relevant:r,timebound:tb,status:'in_progress',createdAt:new Date().toISOString()}); save(); showToast('SMART Goal created'); }
function renderSmartGoals() { initGoalSetting(); let goals=(db.goalSetting?.[state.user]||[]).filter(g=>g.status==='in_progress'); return '<div class="col-main"><h2>🎯 SMART Goals</h2><button class="btn-zen primary" onclick="createSmartGoal()">+ Create SMART Goal</button></div>'; }
function initVisionBoard() { if(!db.visionBoard)db.visionBoard=[]; }
function addVisionItem() { let i=prompt('Image URL or description:'),c=prompt('Category:'); initVisionBoard(); db.visionBoard.push({id:'vb_'+Date.now(),item:i,category:c,createdAt:new Date().toISOString()}); save(); showToast('Added to vision board'); }
function renderVisionBoard() { initVisionBoard(); return '<div class="col-main"><h2>🖼 Vision Board</h2><button class="btn-zen primary" onclick="addVisionItem()">+ Add</button><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:16px;">'+(db.visionBoard||[]).map(v=>'<div class="post-box" style="text-align:center;padding:8px;"><div style="font-size:32px;">🖼</div><div style="font-size:11px;margin-top:4px;">'+v.category+'</div></div>').join('')+'</div></div>'; }
function initMilestones() { if(!db.lifeMilestones)db.lifeMilestones=[]; }
function addMilestone() { let t=prompt('Milestone:'),d=prompt('Date achieved:'),desc=prompt('Description:'); initMilestones(); db.lifeMilestones.push({id:'lm_'+Date.now(),title:t,date:d,description:desc,createdAt:new Date().toISOString()}); save(); showToast('Milestone added'); }
function renderLifeMilestones() { initMilestones(); return '<div class="col-main"><h2>🏆 Life Milestones</h2><button class="btn-zen primary" onclick="addMilestone()">+ Add Milestone</button><div style="display:grid;gap:16px;margin-top:16px;">'+(db.lifeMilestones||[]).map(m=>'<div class="post-box"><h4>'+m.title+'</h4><p style="font-size:12px;">'+m.description+'</p><span style="font-size:11px;color:var(--text-muted);">'+m.date+'</span></div>').join('')+'</div></div>'; }
function initDreamTracking() { if(!db.dreams)db.dreams=[]; }
function logDream() { let d=prompt('Dream description:'),m=prompt('Mood after:'); initDreamTracking(); db.dreams.push({description:d,mood:m,date:new Date().toISOString()}); save(); showToast('Dream logged'); }
function renderDreamJournal() { initDreamTracking(); return '<div class="col-main"><h2>🌙 Dream Journal</h2><button class="btn-zen primary" onclick="logDream()">+ Log Dream</button></div>'; }
function initCreativity() { if(!db.creativity)db.creativity={}; }
function logCreativity(activity,minutes) { initCreativity(); db.creativity[state.user]=db.creativity[state.user]||[]; db.creativity[state.user].push({activity,minutes:parseInt(minutes),date:new Date().toISOString()}); save(); showToast('Logged'); }
function renderCreativity() { return '<div class="col-main"><h2>🎨 Creativity Tracker</h2><button class="btn-zen primary" onclick="logCreativity(prompt(\'Activity:\'),prompt(\'Minutes:\'))">+ Log</button></div>'; }
function initSkillTracking() { if(!db.skills)db.skills={}; }
function logSkill(skill,level) { initSkillTracking(); db.skills[state.user]=db.skills[state.user]||[]; db.skills[state.user].push({skill,level:parseInt(level),date:new Date().toISOString()}); save(); showToast('Logged'); }
function renderSkillTracker() { return '<div class="col-main"><h2>⭐ Skill Tracker</h2><button class="btn-zen primary" onclick="logSkill(prompt(\'Skill:\'),prompt(\'Level 1-10:\'))">+ Log Skill</button></div>'; }
function initPassion() { if(!db.passions)db.passions=[]; }
function addPassion() { let p=prompt('Passion:'); initPassion(); db.passions.push({id:'passion_'+Date.now(),text:p,status:'exploring',createdAt:new Date().toISOString()}); save(); showToast('Added'); }
function renderPassions() { initPassion(); return '<div class="col-main"><h2>❤️ Passions</h2><button class="btn-zen primary" onclick="addPassion()">+ Add Passion</button></div>'; }
function initValues() { if(!db.values)db.values=['Integrity','Growth','Compassion','Excellence','Balance']; }
function logValue(value,action) { initValues(); if(!db.valueLog)db.valueLog={}; if(!db.valueLog[value])db.valueLog[value]=[]; db.valueLog[value].push({action,date:new Date().toISOString()}); save(); showToast('Logged'); }
function renderValues() { initValues(); return '<div class="col-main"><h2>💎 Core Values</h2>'+(db.values||[]).map(v=>'<div class="post-box" style="margin-bottom:8px;"><h4>'+v+'</h4><button class="btn-zen" onclick="logValue(\''+v+'\',prompt(\'How did you live this value?\'))">Log Action</button></div>').join('')+'</div>'; }
function initNetworking() { if(!db.contacts)db.contacts=[]; }
function addContact() { let n=prompt('Name:'),r=prompt('Role:'),e=prompt('Email:'); initNetworking(); db.contacts.push({id:'cnt_'+Date.now(),name:n,role:r,email:e,lastContact:null}); save(); showToast('Contact added'); }
function renderNetworking() { initNetworking(); return '<div class="col-main"><h2>🤝 Networking</h2><button class="btn-zen primary" onclick="addContact()">+ Add Contact</button></div>'; }
function initMentorship() { if(!db.mentors)db.mentors=[]; if(!db.mentees)db.mentees=[]; }
function addMentor() { let n=prompt('Name:'),a=prompt('Area:'); initMentorship(); db.mentors.push({id:'mnt_'+Date.now(),name:n,area:a}); save(); showToast('Mentor added'); }
function renderMentorship() { initMentorship(); return '<div class="col-main"><h2>🌱 Mentorship</h2><button class="btn-zen primary" onclick="addMentor()">+ Find Mentor</button></div>'; }
function initLearning() { if(!db.learningGoals)db.learningGoals=[]; }
function addLearningGoal() { let l=prompt('What do you want to learn?'); initLearning(); db.learningGoals.push({id:'lg_'+Date.now(),goal:l,progress:0,createdAt:new Date().toISOString()}); save(); showToast('Goal added'); }
function renderLearning() { initLearning(); return '<div class="col-main"><h2>📚 Learning Goals</h2><button class="btn-zen primary" onclick="addLearningGoal()">+ Add Goal</button></div>'; }
function initBookClub() { if(!db.bookClub)db.bookClub={books:[],discussions:[]}; }
function addBook() { let t=prompt('Book title:'),a=prompt('Author:'); initBookClub(); db.bookClub.books.push({id:'book_'+Date.now(),title:t,author:a,status:'reading'}); save(); showToast('Book added'); }
function renderBookClub() { initBookClub(); return '<div class="col-main"><h2>📖 Book Club</h2><button class="btn-zen primary" onclick="addBook()">+ Add Book</button></div>'; }
function initPodcastTracker() { if(!db.podcasts)db.podcasts=[]; }
function addPodcast() { let n=prompt('Podcast name:'),e=prompt('Episode:'); initPodcastTracker(); db.podcasts.push({id:'pod_'+Date.now(),name:n,episode:e,listened:false}); save(); showToast('Added'); }
function renderPodcasts() { initPodcastTracker(); return '<div class="col-main"><h2>🎧 Podcasts</h2><button class="btn-zen primary" onclick="addPodcast()">+ Add</button></div>'; }
function initAffirmations() { if(!db.affirmations)db.affirmations=['I am capable of achieving my goals','Every day I am learning and growing','I embrace challenges as opportunities','I am worthy of success']; }
function renderAffirmations() { initAffirmations(); let aff=db.affirmations||[]; let daily=aff[Math.floor(Math.random()*aff.length)]; return '<div class="col-main"><h2>✨ Daily Affirmation</h2><div class="post-box" style="text-align:center;padding:40px;"><div style="font-size:24px;font-style:italic;">"'+daily+'"</div><button class="btn-zen" style="margin-top:16px;" onclick="renderAffirmations()">🔄 New Affirmation</button></div></div>'; }
function initQuoteJournal() { if(!db.quotes)db.quotes=[]; }
function addQuote() { let q=prompt('Quote:'),a=prompt('Author:'); initQuoteJournal(); db.quotes.push({quote:q,author:a,date:new Date().toISOString()}); save(); showToast('Quote added'); }
function renderQuotes() { initQuoteJournal(); return '<div class="col-main"><h2>💬 Quote Journal</h2><button class="btn-zen primary" onclick="addQuote()">+ Add Quote</button></div>'; }
function initDailyPractice() { if(!db.dailyPractice)db.dailyPractice={}; }
function logPractice(activity,minutes) { initDailyPractice(); let today=new Date().toISOString().split('T')[0]; if(!db.dailyPractice[today])db.dailyPractice[today]={}; db.dailyPractice[today][activity]=(db.dailyPractice[today][activity]||0)+parseInt(minutes||0); save(); showToast('Logged'); }
function renderDailyPractice() { initDailyPractice(); return '<div class="col-main"><h2>🧘 Daily Practice</h2><button class="btn-zen" onclick="logPractice(\'meditation\',prompt(\'Minutes:\'))">🧘 Meditate</button><button class="btn-zen" onclick="logPractice(\'journaling\',1)">📝 Journal</button><button class="btn-zen" onclick="logPractice(\'reading\',prompt(\'Minutes:\'))">📖 Read</button><button class="btn-zen" onclick="logPractice(\'exercise\',prompt(\'Minutes:\'))">🏃 Exercise</button></div>'; }
function initTimeCapsule() { if(!db.timeCapsule)db.timeCapsule=[]; }
function addToCapsule(item) { let f=prompt('What will you add?'),d=prompt('Open when (date):'); initTimeCapsule(); db.timeCapsule.push({item:f,openDate:d,createdAt:new Date().toISOString()}); save(); showToast('Added to time capsule'); }
function renderTimeCapsule() { initTimeCapsule(); return '<div class="col-main"><h2>⏳ Time Capsule</h2><button class="btn-zen primary" onclick="addToCapsule()">+ Add Item</button></div>'; }
function initLegacy() { if(!db.legacy)db.legacy=[]; }
function writeLegacy() { let t=prompt('What impact do you want to leave?'); initLegacy(); db.legacy.push({text:t,date:new Date().toISOString()}); save(); showToast('Saved'); }
function renderLegacy() { initLegacy(); return '<div class="col-main"><h2>🌟 Legacy</h2><button class="btn-zen primary" onclick="writeLegacy()">+ Write</button></div>'; }

// Add admin and student toolbars to render
function renderDashboardExtras() { let role=db.users[state.user]?.role; return '<div>'+(role!=='student'?renderAdminToolbar():'')+renderStudentToolbar()+'</div>'; }

// Initialize all new features
initAlerts(); initAnnouncements(); initPolls(); initSurveys(); initForms(); initWiki(); initKnowledgeBase(); initFAQs(); initHelpTickets(); initApprovals(); initWorkflows(); initTemplates(); initChecklists(); initMilestones(); initGoals(); initTasks(); initHabits(); initMoodTracker(); initWaterTracker(); initSleepTracker(); initExerciseTracker(); initWellness(); initStudyTimer(); initPomodoro(); initStudyGroups(); initFlashcards(); initFlash(); initIdeas(); initGratitude(); initReflections(); initLongTermGoals(); initBucketList(); initLifeAreas(); initResolutions(); initWeeklyReview(); initGoalSetting(); initVisionBoard(); initLifeMilestones(); initDreamTracking(); initCreativity(); initSkillTracking(); initPassions(); initValues(); initNetworking(); initMentorship(); initLearning(); initBookClub(); initPodcastTracker(); initAffirmations(); initQuoteJournal(); initDailyPractice(); initTimeCapsule(); initLegacy();

if(document.getElementById('root')) render();
