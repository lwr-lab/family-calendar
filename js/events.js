let calendarEvents = [];

async function fetchEvents(startDate, endDate) {
    const { data, error } = await supabase
        .from('events')
        .select('*, rsvps(*)')
        .eq('family_id', getFamilyId())
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');
    if (error) throw error;
    calendarEvents = expandRecurring(data, startDate, endDate);
    return calendarEvents;
}

function expandRecurring(events, rangeStart, rangeEnd) {
    const result = [];
    for (const event of events) {
        result.push(event);
        if (event.recurrence === 'none') continue;

        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const duration = end - start;
        let cursor = new Date(start);

        for (let i = 0; i < 60; i++) {
            if (event.recurrence === 'daily') cursor.setDate(cursor.getDate() + 1);
            else if (event.recurrence === 'weekly') cursor.setDate(cursor.getDate() + 7);
            else if (event.recurrence === 'monthly') cursor.setMonth(cursor.getMonth() + 1);

            if (cursor > rangeEnd) break;
            if (cursor >= rangeStart) {
                result.push({
                    ...event,
                    id: event.id + '-r' + i,
                    original_id: event.id,
                    start_time: new Date(cursor).toISOString(),
                    end_time: new Date(cursor.getTime() + duration).toISOString(),
                    is_recurring_instance: true
                });
            }
        }
    }
    return result;
}

function getEventsForDate(date) {
    const dayStr = date.toISOString().split('T')[0];
    return calendarEvents.filter(e => {
        const eventDay = new Date(e.start_time).toISOString().split('T')[0];
        return eventDay === dayStr;
    });
}

async function createEvent(eventData) {
    const { data, error } = await supabase
        .from('events')
        .insert({
            family_id: getFamilyId(),
            created_by: getMemberId(),
            title: eventData.title,
            description: eventData.description || null,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            is_all_day: eventData.is_all_day || false,
            recurrence: eventData.recurrence || 'none',
            reminder_minutes: eventData.reminder_minutes || null
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateEvent(eventId, eventData) {
    const { data, error } = await supabase
        .from('events')
        .update({
            title: eventData.title,
            description: eventData.description || null,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            is_all_day: eventData.is_all_day || false,
            recurrence: eventData.recurrence || 'none',
            reminder_minutes: eventData.reminder_minutes || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deleteEvent(eventId) {
    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
    if (error) throw error;
}
