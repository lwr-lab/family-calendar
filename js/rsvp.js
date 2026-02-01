async function setRsvp(eventId, status) {
    const { data, error } = await supabase
        .from('rsvps')
        .upsert({
            event_id: eventId,
            member_id: getMemberId(),
            status: status,
            updated_at: new Date().toISOString()
        }, { onConflict: 'event_id,member_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

function getRsvpForMember(event, memberId) {
    if (!event.rsvps) return 'pending';
    const rsvp = event.rsvps.find(r => r.member_id === memberId);
    return rsvp ? rsvp.status : 'pending';
}

function getRsvpIcon(status) {
    switch (status) {
        case 'available': return '<span class="rsvp-icon rsvp-available" title="Available">&#10003;</span>';
        case 'not_available': return '<span class="rsvp-icon rsvp-not-available" title="Not Available">&#10007;</span>';
        case 'maybe': return '<span class="rsvp-icon rsvp-maybe" title="Maybe">?</span>';
        default: return '<span class="rsvp-icon rsvp-pending" title="Pending">&ndash;</span>';
    }
}
