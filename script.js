// ---------- state ----------
let roomCreated = false;
let roomId = null;
let roomName = '';
let roomPass = '';
let participants = [{ name: 'You', role: 'interviewer', creator: true }];
let chatMode = 'group';
let localStream = null;
let screenStream = null;
let micEnabled = true;
let aceEditor = null;
let currentQuestion = ''; // shared question text

// ---------- initialization ----------
window.onload = function() {
    aceEditor = ace.edit("codeEditor");
    aceEditor.setTheme("ace/theme/tomorrow_night");
    aceEditor.session.setMode("ace/mode/javascript");
    aceEditor.setOptions({ fontSize: "13px", showPrintMargin: false });
    updateParticipantList();
    updateQuestionUI();
};

// ---------- theme toggle ----------
const body = document.body;
document.getElementById('themeToggle').addEventListener('click', () => body.classList.toggle('dark'));

// ---------- mobile dropdown ----------
const menuIcon = document.getElementById('menuIcon');
const dropdown = document.getElementById('mobileDropdown');
menuIcon.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('show'); });
function toggleDropdown() { dropdown.classList.remove('show'); }

// ---------- modals ----------
function closeAllModals() { 
    document.getElementById('aboutModal').classList.remove('show'); 
    document.getElementById('teamModal').classList.remove('show'); 
    document.getElementById('privacyModal').classList.remove('show');
    dropdown.classList.remove('show'); 
}
function showAbout() { document.getElementById('aboutModal').classList.add('show'); overlay.classList.add('show'); }
function closeAbout() { document.getElementById('aboutModal').classList.remove('show'); overlay.classList.remove('show'); }
function showTeam() { document.getElementById('teamModal').classList.add('show'); overlay.classList.add('show'); }
function closeTeam() { document.getElementById('teamModal').classList.remove('show'); overlay.classList.remove('show'); }
function showPrivacy() { document.getElementById('privacyModal').classList.add('show'); overlay.classList.add('show'); }
function closePrivacy() { document.getElementById('privacyModal').classList.remove('show'); overlay.classList.remove('show'); }

// ---------- landing / room ----------
function showLanding() { document.getElementById('landing').style.display = 'block'; document.getElementById('roomView').style.display = 'none'; }
function showRoom() { document.getElementById('landing').style.display = 'none'; document.getElementById('roomView').style.display = 'flex'; }

// ---------- create room ----------
function createRoom() {
    roomName = document.getElementById('roomNameCreate').value || "Interview";
    roomPass = document.getElementById('roomPassCreate').value;
    roomId = 'cm-' + Math.random().toString(36).substring(2,8);
    roomCreated = true;
    participants = [{ name: 'You', role: 'interviewer', creator: true }];
    updateParticipantList();
    document.getElementById('currentRoomName').innerText = roomName;
    document.getElementById('currentRoomId').innerText = roomId;
    document.getElementById('adminControls').style.display = 'flex';
    document.getElementById('chatMessages').innerHTML = '<div class="chat-msg"><strong>System:</strong> Room created. You are interviewer.</div>';
    currentQuestion = ''; // empty question initially
    updateQuestionUI();
    showRoom();
}

// ---------- join room (only if created) ----------
function joinRoom() {
    let joinId = document.getElementById('roomIdJoin').value;
    let joinPass = document.getElementById('roomPassJoin').value;
    if (!roomCreated) {
        document.getElementById('joinError').innerText = 'No active room. Create one first.';
        return;
    }
    if (joinId !== roomId) {
        document.getElementById('joinError').innerText = 'Room ID not found.';
        return;
    }
    if (joinPass !== roomPass) {
        document.getElementById('joinError').innerText = 'Incorrect password.';
        return;
    }
    if (participants.length >= 1000) {
        document.getElementById('joinError').innerText = 'Room full (max 1000 participants).';
        return;
    }
    let newName = prompt("Enter your name:", "Candidate");
    if (!newName) newName = "Candidate";
    participants.push({ name: newName, role: 'candidate', creator: false });
    updateParticipantList();
    addVideoTile(newName);
    document.getElementById('chatMessages').innerHTML += `<div class="chat-msg"><strong>System:</strong> ${newName} joined.</div>`;
    document.getElementById('joinError').innerText = '';
    // Update question UI for new joiner (they see read-only)
    updateQuestionUI();
}

function inviteParticipant() {
    if (participants.length >= 1000) {
        alert('Maximum participants (1000) reached.');
        return;
    }
    let name = prompt("Enter participant name:", "Alex");
    if (!name) return;
    participants.push({ name, role: 'candidate', creator: false });
    updateParticipantList();
    addVideoTile(name);
    document.getElementById('chatMessages').innerHTML += `<div class="chat-msg"><strong>System:</strong> ${name} joined.</div>`;
}

function addVideoTile(name) {
    let grid = document.getElementById('videoGrid');
    let tile = document.createElement('div');
    tile.className = 'video-tile';
    tile.innerHTML = `<i class="fas fa-user-circle" style="font-size:3rem;"></i><span class="label">${name}</span>`;
    grid.appendChild(tile);
}

function updateParticipantList() {
    let list = document.getElementById('participantList');
    list.innerHTML = '';
    participants.forEach(p => {
        let li = document.createElement('li');
        li.innerHTML = `<i class="fas ${p.creator ? 'fa-crown' : 'fa-user'}" style="color:${p.creator ? 'gold' : 'var(--text-secondary)'};"></i> ${p.name} ${p.role ? '('+p.role+')' : ''} ${p.creator ? '<span class="badge">creator</span>' : ''}`;
        list.appendChild(li);
    });
    document.getElementById('participantCount').innerText = participants.length;
    let select = document.getElementById('privateUserSelect');
    select.innerHTML = '<option>Select participant</option>';
    participants.forEach(p => { if (p.name !== 'You') select.innerHTML += `<option>${p.name}</option>`; });
}

// ---------- question UI (interviewer can edit, others view) ----------
function updateQuestionUI() {
    let area = document.getElementById('questionArea');
    let isCreator = participants.find(p => p.name === 'You')?.creator || false;
    if (isCreator) {
        // interviewer: editable textarea
        area.innerHTML = `<textarea id="questionInput" placeholder="Type your question here..." rows="3">${currentQuestion}</textarea>`;
        document.getElementById('questionInput').addEventListener('input', function(e) {
            currentQuestion = e.target.value;
            // In a real app, broadcast to others; here we just update the shared variable.
            // For demo, we also update any read-only view if we were to switch roles, but since it's single client, it's fine.
        });
    } else {
        // interviewee: read-only display
        area.innerHTML = `<div style="white-space:pre-wrap; background:var(--code-bg); color:#e2e8f0; padding:0.8rem; border-radius:28px;">${currentQuestion || 'Waiting for interviewer to type a question...'}</div>`;
    }
}

// ---------- chat ----------
function setChatMode(mode, el) {
    chatMode = mode;
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
}
function sendChatMessage() {
    let input = document.getElementById('chatInput');
    let msg = input.value.trim();
    if (!msg) return;
    let chat = document.getElementById('chatMessages');
    let target = '';
    if (chatMode === 'private') {
        let select = document.getElementById('privateUserSelect');
        target = select.value;
        if (target === 'Select participant') { alert('Select a participant'); return; }
    }
    let displayMsg = chatMode === 'group' ? `You (to everyone): ${msg}` : `You (to ${target}): ${msg}`;
    chat.innerHTML += `<div class="chat-msg self"><strong>${displayMsg}</strong></div>`;
    input.value = '';
    setTimeout(() => {
        let replier = target !== '' ? target : (participants.find(p => p.name !== 'You')?.name || 'Alex');
        if (replier) chat.innerHTML += `<div class="chat-msg"><strong>${replier}:</strong> Thanks</div>`;
    }, 800);
}
function sendPrivate() { setChatMode('private', document.querySelectorAll('.chat-tab')[1]); }

// ---------- video/audio ----------
async function toggleCamera() {
    let btn = document.getElementById('cameraBtn');
    // If screen is being shared, don't allow camera toggle (or handle gracefully)
    if (screenStream) {
        alert('Stop screen sharing first to toggle camera.');
        return;
    }
    if (localStream && localStream.getVideoTracks().length > 0) {
        localStream.getVideoTracks().forEach(t => t.stop());
        // remove video track from stream
        localStream.getVideoTracks().forEach(t => localStream.removeTrack(t));
        document.getElementById('localVideo').style.display = 'none';
        document.getElementById('localIcon').style.display = 'block';
        btn.classList.add('off');
        btn.innerHTML = '<i class="fas fa-video-slash"></i> Camera';
    } else {
        try {
            if (!localStream) {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micEnabled });
            } else {
                // add video track
                let newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                let newTrack = newStream.getVideoTracks()[0];
                localStream.addTrack(newTrack);
            }
            let video = document.getElementById('localVideo');
            video.srcObject = localStream;
            video.style.display = 'block';
            document.getElementById('localIcon').style.display = 'none';
            video.play();
            btn.classList.remove('off');
            btn.innerHTML = '<i class="fas fa-video"></i> Camera';
        } catch (e) { alert('Camera access denied'); }
    }
}
async function toggleMic() {
    let btn = document.getElementById('micBtn');
    if (!localStream) {
        // No stream yet, just toggle state
        micEnabled = !micEnabled;
        if (micEnabled) {
            btn.classList.remove('off');
            btn.innerHTML = '<i class="fas fa-microphone"></i> Mic';
        } else {
            btn.classList.add('off');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mic';
        }
        return;
    }
    let audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        if (audioTrack.enabled) {
            btn.classList.remove('off');
            btn.innerHTML = '<i class="fas fa-microphone"></i> Mic';
        } else {
            btn.classList.add('off');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mic';
        }
    } else {
        try {
            let newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            let newTrack = newStream.getAudioTracks()[0];
            localStream.addTrack(newTrack);
            btn.classList.remove('off');
            btn.innerHTML = '<i class="fas fa-microphone"></i> Mic';
        } catch { alert('Mic access denied'); }
    }
}
async function shareScreen() {
    let btn = document.getElementById('shareBtn');
    if (screenStream) {
        // Stop sharing
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
        // Restore camera feed if available
        if (localStream && localStream.getVideoTracks().length > 0) {
            let video = document.getElementById('localVideo');
            video.srcObject = localStream;
            video.style.display = 'block';
            document.getElementById('localIcon').style.display = 'none';
        } else {
            document.getElementById('localVideo').style.display = 'none';
            document.getElementById('localIcon').style.display = 'block';
        }
        document.getElementById('localLabel').innerText = 'You';
        btn.classList.remove('off');
        btn.innerHTML = '<i class="fas fa-desktop"></i> Share';
        return;
    }
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        // Replace local tile content with screen stream
        let video = document.getElementById('localVideo');
        video.srcObject = screenStream;
        video.style.display = 'block';
        document.getElementById('localIcon').style.display = 'none';
        document.getElementById('localLabel').innerText = 'You (sharing)';
        btn.classList.add('off');
        btn.innerHTML = '<i class="fas fa-stop"></i> Stop';
        screenStream.getVideoTracks()[0].onended = () => {
            // When user stops sharing via browser UI
            screenStream = null;
            if (localStream && localStream.getVideoTracks().length > 0) {
                video.srcObject = localStream;
                video.style.display = 'block';
                document.getElementById('localIcon').style.display = 'none';
            } else {
                video.style.display = 'none';
                document.getElementById('localIcon').style.display = 'block';
            }
            document.getElementById('localLabel').innerText = 'You';
            btn.classList.remove('off');
            btn.innerHTML = '<i class="fas fa-desktop"></i> Share';
        };
    } catch { alert('Screen share cancelled'); }
}

// ---------- room actions ----------
function copyInviteLink() {
    let link = `https://codemeetly.com/room/${roomId} (pass: ${roomPass || 'none'})`;
    navigator.clipboard?.writeText(link).then(() => alert('Invite link copied!'));
}
function endSession() {
    if (confirm('End session?')) {
        showLanding();
        roomCreated = false;
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        if (screenStream) screenStream.getTracks().forEach(t => t.stop());
        localStream = null; screenStream = null;
        document.getElementById('localVideo').style.display = 'none';
        document.getElementById('localIcon').style.display = 'block';
        participants = [{ name: 'You', role: 'interviewer', creator: true }];
        updateParticipantList();
        let grid = document.getElementById('videoGrid');
        grid.innerHTML = `<div class="video-tile" id="localTile"><video id="localVideo" autoplay muted playsinline style="display:none;"></video><i class="fas fa-user-circle" id="localIcon" style="font-size:3rem;"></i><span class="label" id="localLabel">You</span></div>`;
        // reset question
        currentQuestion = '';
        updateQuestionUI();
        // reset camera/mic buttons
        document.getElementById('cameraBtn').classList.add('off');
        document.getElementById('cameraBtn').innerHTML = '<i class="fas fa-video-slash"></i> Camera';
        document.getElementById('micBtn').classList.remove('off');
        document.getElementById('micBtn').innerHTML = '<i class="fas fa-microphone"></i> Mic';
        document.getElementById('shareBtn').classList.remove('off');
        document.getElementById('shareBtn').innerHTML = '<i class="fas fa-desktop"></i> Share';
    }
}
function muteAll() { alert('Mute all (mock)'); }

// logout
document.getElementById('logoutBtn').addEventListener('click', ()=> { alert('Logged out'); showLanding(); roomCreated=false; });

// expose functions to global
window.showLanding = showLanding;
window.showAbout = showAbout;
window.showTeam = showTeam;
window.showPrivacy = showPrivacy;
window.closeAbout = closeAbout;
window.closeTeam = closeTeam;
window.closePrivacy = closePrivacy;
window.closeAllModals = closeAllModals;
window.toggleDropdown = toggleDropdown;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.inviteParticipant = inviteParticipant;
window.setChatMode = setChatMode;
window.sendChatMessage = sendChatMessage;
window.sendPrivate = sendPrivate;
window.toggleCamera = toggleCamera;
window.toggleMic = toggleMic;
window.shareScreen = shareScreen;
window.copyInviteLink = copyInviteLink;
window.endSession = endSession;
window.muteAll = muteAll;
