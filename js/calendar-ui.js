let currentYear, currentMonth, selectedDate = null;

function initCalendar() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('month-label');
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();

    monthLabel.textContent = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Render major events for this month
    renderMajorEvents(firstDay, lastDay);

    let html = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
        html += `<div class="cal-header">${d}</div>`;
    });

    // Previous month padding
    const prevLast = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
        html += `<div class="cal-day other-month">${prevLast - i}</div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(currentYear, currentMonth, d);
        const dateStr = date.toISOString().split('T')[0];
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        const dayEvents = getEventsForDate(date);
        const dayBlocked = getBlockedForDate(date);

        let classes = 'cal-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (dayBlocked.length > 0) classes += ' has-blocked';

        let eventsHtml = '';
        dayEvents.slice(0, 3).forEach(evt => {
            const color = getMemberColor(evt.created_by);
            eventsHtml += `<div class="event-pill" style="background:${color}20;border-left:3px solid ${color}">${escapeHtml(evt.title)}</div>`;
        });
        if (dayEvents.length > 3) {
            eventsHtml += `<div class="event-more">+${dayEvents.length - 3} more</div>`;
        }

        // Blocked day indicators
        let blockedHtml = '';
        dayBlocked.forEach(b => {
            const color = getMemberColor(b.member_id);
            blockedHtml += `<div class="blocked-indicator" style="background:${color}" title="${escapeHtml(getMemberName(b.member_id))}: ${escapeHtml(b.label)}"></div>`;
        });

        html += `<div class="${classes}" data-date="${dateStr}" onclick="selectDay('${dateStr}')">
            <span class="day-number">${d}</span>
            ${blockedHtml ? '<div class="blocked-bar">' + blockedHtml + '</div>' : ''}
            <div class="day-events">${eventsHtml}</div>
        </div>`;
    }

    // Next month padding
    const totalCells = startDow + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="cal-day other-month">${i}</div>`;
    }

    grid.innerHTML = html;
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    selectedDate = null;
    closeDayPanel();
    refreshCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    selectedDate = null;
    closeDayPanel();
    refreshCalendar();
}

function selectDay(dateStr) {
    selectedDate = new Date(dateStr + 'T00:00:00');
    renderCalendar();
    openDayPanel(selectedDate);
}

function openDayPanel(date) {
    const panel = document.getElementById('day-panel');
    const events = getEventsForDate(date);
    const blocked = getBlockedForDate(date);
    const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    let html = `<div class="panel-header">
        <h3>${dateLabel}</h3>
        <button class="btn-icon" onclick="closeDayPanel()">&times;</button>
    </div>`;

    if (blocked.length > 0) {
        html += '<div class="blocked-section">';
        blocked.forEach(b => {
            const color = getMemberColor(b.member_id);
            const isOwn = b.member_id === getMemberId();
            html += `<div class="blocked-item" style="border-left:3px solid ${color}">
                <span>${escapeHtml(getMemberName(b.member_id))}: ${escapeHtml(b.label)}</span>
                ${isOwn ? `<button class="btn-sm btn-danger" onclick="removeBlockedDay('${b.id}')">Remove</button>` : ''}
            </div>`;
        });
        html += '</div>';
    }

    if (events.length === 0) {
        html += '<p class="no-events">No events this day</p>';
    } else {
        events.forEach(evt => {
            const color = getMemberColor(evt.created_by);
            const creator = getMemberName(evt.created_by);
            const time = evt.is_all_day ? 'All day' :
                new Date(evt.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) +
                ' - ' +
                new Date(evt.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const eventId = evt.original_id || evt.id;
            const isOwn = evt.created_by === getMemberId();

            html += `<div class="event-card" style="border-left:4px solid ${color}">
                <div class="event-card-header">
                    <strong>${escapeHtml(evt.title)}</strong>
                    ${isOwn && !evt.is_recurring_instance ? `
                        <div class="event-actions">
                            <button class="btn-icon" onclick="openEditEvent('${eventId}')" title="Edit">&#9998;</button>
                            <button class="btn-icon btn-danger" onclick="confirmDeleteEvent('${eventId}')" title="Delete">&#128465;</button>
                        </div>
                    ` : ''}
                </div>
                <div class="event-meta">
                    <span class="event-time">${time}</span>
                    <span class="event-creator" style="color:${color}">${escapeHtml(creator)}</span>
                    ${evt.recurrence !== 'none' ? '<span class="event-recurring">&#128260; ' + evt.recurrence + '</span>' : ''}
                </div>
                ${evt.description ? `<p class="event-desc">${escapeHtml(evt.description)}</p>` : ''}
                <div class="rsvp-section">
                    <span class="rsvp-label">RSVP:</span>
                    ${renderRsvpButtons(evt)}
                </div>
                <div class="rsvp-summary">${renderRsvpSummary(evt)}</div>
            </div>`;
        });
    }

    html += `<div class="panel-actions">
        <button class="btn btn-primary" onclick="openCreateEvent('${date.toISOString().split('T')[0]}')">+ New Event</button>
        <button class="btn btn-secondary" onclick="openBlockDays('${date.toISOString().split('T')[0]}')">Block Day</button>
    </div>`;

    panel.innerHTML = html;
    panel.classList.add('open');
}

function closeDayPanel() {
    const panel = document.getElementById('day-panel');
    panel.classList.remove('open');
}

function renderRsvpButtons(event) {
    const eventId = event.original_id || event.id;
    const myStatus = getRsvpForMember(event, getMemberId());
    const statuses = ['available', 'not_available', 'maybe'];
    const labels = { available: '&#10003; Yes', not_available: '&#10007; No', maybe: '? Maybe' };

    return statuses.map(s =>
        `<button class="btn-rsvp ${myStatus === s ? 'active' : ''} rsvp-${s}"
                onclick="handleRsvp('${eventId}', '${s}')">${labels[s]}</button>`
    ).join('');
}

function renderRsvpSummary(event) {
    return familyMembers.map(m => {
        const status = getRsvpForMember(event, m.id);
        return `<span class="rsvp-member" style="color:${m.color}" title="${escapeHtml(m.display_name)}: ${status}">
            ${escapeHtml(m.display_name.charAt(0))}${getRsvpIcon(status)}
        </span>`;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let currentMajorEvent = null;

async function loadMajorEvent(year, month) {
    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const familyId = getFamilyId();
    if (!familyId) return null;

    const { data, error } = await supabase
        .from('major_events')
        .select('*')
        .eq('family_id', familyId)
        .eq('year_month', yearMonth)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error loading major event:', error);
    }
    return data || null;
}

async function saveMajorEvent(year, month, title) {
    const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    const familyId = getFamilyId();
    const memberId = getMemberId();
    if (!familyId) return;

    if (!title.trim()) {
        // Delete if empty
        await supabase
            .from('major_events')
            .delete()
            .eq('family_id', familyId)
            .eq('year_month', yearMonth);
        currentMajorEvent = null;
    } else {
        // Upsert
        const { data, error } = await supabase
            .from('major_events')
            .upsert({
                family_id: familyId,
                year_month: yearMonth,
                title: title.trim(),
                updated_by: memberId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'family_id,year_month' })
            .select()
            .single();

        if (error) {
            console.error('Error saving major event:', error);
            showToast('Failed to save', 'error');
            return;
        }
        currentMajorEvent = data;
    }
    showToast('Saved!', 'success');
}

async function renderMajorEvents(firstDay, lastDay) {
    const container = document.getElementById('major-events');
    if (!container) return;

    currentMajorEvent = await loadMajorEvent(currentYear, currentMonth);
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });

    const title = currentMajorEvent?.title || '';

    container.innerHTML = `
        <div class="major-events-header">Major Event in ${monthName}</div>
        <div class="major-event-display" id="major-event-display">
            ${title
                ? `<span class="major-event-text">${escapeHtml(title)}</span>`
                : `<span class="major-event-placeholder">No major event set</span>`
            }
            <button class="major-event-edit-btn" onclick="editMajorEvent()">Edit</button>
        </div>
        <div class="major-event-form" id="major-event-form" style="display:none">
            <input type="text" class="major-event-input" id="major-event-input"
                   placeholder="Enter major event for this month..."
                   value="${escapeHtml(title)}"
                   onkeydown="handleMajorEventKeydown(event)">
            <button class="major-event-save-btn" onclick="saveMajorEventFromInput()">Save</button>
            <button class="major-event-cancel-btn" onclick="cancelMajorEventEdit()">Cancel</button>
        </div>
    `;
}

function editMajorEvent() {
    document.getElementById('major-event-display').style.display = 'none';
    document.getElementById('major-event-form').style.display = 'flex';
    const input = document.getElementById('major-event-input');
    input.focus();
    input.select();
}

function cancelMajorEventEdit() {
    document.getElementById('major-event-display').style.display = 'flex';
    document.getElementById('major-event-form').style.display = 'none';
    // Reset input value
    document.getElementById('major-event-input').value = currentMajorEvent?.title || '';
}

async function saveMajorEventFromInput() {
    const input = document.getElementById('major-event-input');
    await saveMajorEvent(currentYear, currentMonth, input.value);
    renderMajorEvents(new Date(currentYear, currentMonth, 1), new Date(currentYear, currentMonth + 1, 0));
}

function handleMajorEventKeydown(event) {
    if (event.key === 'Enter') {
        saveMajorEventFromInput();
    } else if (event.key === 'Escape') {
        cancelMajorEventEdit();
    }
}
