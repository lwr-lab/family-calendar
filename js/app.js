// Toast notification
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Refresh calendar data and re-render
async function refreshCalendar() {
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    await Promise.all([
        fetchEvents(start, end),
        fetchBlockedDays(start, end),
        fetchMembers()
    ]);
    renderCalendar();
    if (selectedDate) openDayPanel(selectedDate);
}

// Event modal
function openCreateEvent(dateStr) {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    document.getElementById('event-modal-title').textContent = 'New Event';
    form.reset();
    form.dataset.mode = 'create';
    form.dataset.eventId = '';
    document.getElementById('event-date').value = dateStr;
    document.getElementById('event-start-time').value = '09:00';
    document.getElementById('event-end-time').value = '10:00';
    document.getElementById('event-recurrence-interval').value = '1';
    document.getElementById('event-recurrence-end').value = '';
    document.getElementById('custom-recurrence-row').style.display = 'none';
    modal.classList.add('open');
}

function openEditEvent(eventId) {
    const event = calendarEvents.find(e => e.id === eventId || e.original_id === eventId);
    if (!event) return;
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    document.getElementById('event-modal-title').textContent = 'Edit Event';
    form.dataset.mode = 'edit';
    form.dataset.eventId = event.original_id || event.id;
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-description').value = event.description || '';
    document.getElementById('event-date').value = new Date(event.start_time).toISOString().split('T')[0];
    document.getElementById('event-start-time').value = new Date(event.start_time).toTimeString().slice(0, 5);
    document.getElementById('event-end-time').value = new Date(event.end_time).toTimeString().slice(0, 5);
    document.getElementById('event-all-day').checked = event.is_all_day;
    document.getElementById('event-reminder').value = event.reminder_minutes || '';

    // Handle custom recurrence
    const hasCustomRecurrence = event.recurrence_interval > 1 || event.recurrence_end;
    if (hasCustomRecurrence && event.recurrence !== 'none') {
        document.getElementById('event-recurrence').value = 'custom';
        document.getElementById('event-recurrence-interval').value = event.recurrence_interval || 1;
        document.getElementById('event-recurrence-unit').value = event.recurrence;
        document.getElementById('event-recurrence-end').value = event.recurrence_end || '';
        document.getElementById('custom-recurrence-row').style.display = 'flex';
    } else {
        document.getElementById('event-recurrence').value = event.recurrence;
        document.getElementById('event-recurrence-interval').value = 1;
        document.getElementById('event-recurrence-end').value = '';
        document.getElementById('custom-recurrence-row').style.display = 'none';
    }

    modal.classList.add('open');
}

function closeEventModal() {
    document.getElementById('event-modal').classList.remove('open');
}

async function handleEventSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endTime = document.getElementById('event-end-time').value;
    const isAllDay = document.getElementById('event-all-day').checked;
    const reminder = document.getElementById('event-reminder').value;
    const recurrenceSelect = document.getElementById('event-recurrence').value;

    // Handle custom recurrence
    let recurrence = recurrenceSelect;
    let recurrenceInterval = 1;
    let recurrenceEnd = null;

    if (recurrenceSelect === 'custom') {
        recurrence = document.getElementById('event-recurrence-unit').value;
        recurrenceInterval = parseInt(document.getElementById('event-recurrence-interval').value) || 1;
        recurrenceEnd = document.getElementById('event-recurrence-end').value || null;
    }

    const eventData = {
        title: document.getElementById('event-title').value,
        description: document.getElementById('event-description').value,
        start_time: isAllDay ? `${date}T00:00:00` : `${date}T${startTime}:00`,
        end_time: isAllDay ? `${date}T23:59:59` : `${date}T${endTime}:00`,
        is_all_day: isAllDay,
        recurrence: recurrence,
        recurrence_interval: recurrenceInterval,
        recurrence_end: recurrenceEnd,
        reminder_minutes: reminder ? parseInt(reminder) : null
    };

    try {
        if (form.dataset.mode === 'edit') {
            await updateEvent(form.dataset.eventId, eventData);
            showToast('Event updated');
        } else {
            await createEvent(eventData);
            showToast('Event created');
        }
        closeEventModal();
        await refreshCalendar();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

async function confirmDeleteEvent(eventId) {
    if (!confirm('Delete this event?')) return;
    try {
        await deleteEvent(eventId);
        showToast('Event deleted');
        await refreshCalendar();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

// RSVP handler
async function handleRsvp(eventId, status) {
    try {
        await setRsvp(eventId, status);
        await refreshCalendar();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

// Block days modal
function openBlockDays(dateStr) {
    const modal = document.getElementById('block-modal');
    document.getElementById('block-start').value = dateStr;
    document.getElementById('block-end').value = dateStr;
    document.getElementById('block-label').value = 'Work';
    modal.classList.add('open');
}

function closeBlockModal() {
    document.getElementById('block-modal').classList.remove('open');
}

async function handleBlockSubmit(e) {
    e.preventDefault();
    try {
        await createBlockedDays(
            document.getElementById('block-start').value,
            document.getElementById('block-end').value,
            document.getElementById('block-label').value
        );
        closeBlockModal();
        showToast('Days blocked');
        await refreshCalendar();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

async function removeBlockedDay(id) {
    try {
        await deleteBlockedDay(id);
        showToast('Block removed');
        await refreshCalendar();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

// Settings panel
function openSettings() {
    const panel = document.getElementById('settings-panel');
    const inviteCode = localStorage.getItem('invite_code') || '—';
    const me = getMemberById(getMemberId());

    let html = `<div class="panel-header">
        <h3>Family Settings</h3>
        <button class="btn-icon" onclick="closeSettings()">&times;</button>
    </div>`;

    html += `<div class="settings-section">
        <label>Invite Code</label>
        <div class="invite-code-display">
            <code id="invite-code-text">${escapeHtml(inviteCode)}</code>
            <button class="btn-sm" onclick="copyInviteCode()">Copy</button>
        </div>
        <p class="hint">Share this code with family members so they can join.</p>
    </div>`;

    html += `<div class="settings-section">
        <label>Your Profile</label>
        <div class="profile-edit">
            <input type="text" id="settings-name" value="${me ? escapeHtml(me.display_name) : ''}" placeholder="Display name">
            <div class="color-picker-row">
                ${MEMBER_COLORS.map(c =>
                    `<button class="color-swatch ${me && me.color === c ? 'active' : ''}"
                            style="background:${c}" onclick="selectSettingsColor('${c}')"></button>`
                ).join('')}
            </div>
            <input type="hidden" id="settings-color" value="${me ? me.color : '#4A90D9'}">
            <button class="btn btn-primary" onclick="saveProfile()">Save</button>
        </div>
    </div>`;

    html += `<div class="settings-section">
        <label>Members</label>
        <div class="member-list">
            ${familyMembers.map(m =>
                `<div class="member-item">
                    <span class="member-dot" style="background:${m.color}"></span>
                    <span>${escapeHtml(m.display_name)}</span>
                    ${m.id === getMemberId() ? '<span class="badge">You</span>' : ''}
                </div>`
            ).join('')}
        </div>
    </div>`;

    html += `<div class="settings-section">
        <button class="btn btn-danger" onclick="if(confirm('Leave this family?')) leaveFamily()">Leave Family</button>
    </div>`;

    panel.innerHTML = html;
    panel.classList.add('open');
}

function closeSettings() {
    document.getElementById('settings-panel').classList.remove('open');
}

function selectSettingsColor(color) {
    document.getElementById('settings-color').value = color;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    event.target.classList.add('active');
}

function copyInviteCode() {
    const code = document.getElementById('invite-code-text').textContent;
    navigator.clipboard.writeText(code).then(() => showToast('Invite code copied!'));
}

async function saveProfile() {
    try {
        await updateMember(
            document.getElementById('settings-name').value,
            document.getElementById('settings-color').value
        );
        showToast('Profile updated');
        openSettings();
        renderCalendar();
    } catch (err) {
        showToast('Error: ' + err.message);
    }
}

// Initialize the app
async function initApp() {
    if (!getFamilyId()) {
        window.location.href = 'index.html';
        return;
    }

    try {
        await ensureSignedIn();
        await fetchMembers();
        initCalendar();
        await refreshCalendar();
        subscribeToFamily(getFamilyId());
        await requestNotificationPermission();
        startReminderChecker();
    } catch (err) {
        console.error('Init error:', err);
        showToast('Failed to load calendar. Please refresh.');
    }
}

document.addEventListener('DOMContentLoaded', initApp);
