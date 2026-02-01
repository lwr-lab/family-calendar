let realtimeChannel = null;

function subscribeToFamily(familyId) {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }

    realtimeChannel = supabase
        .channel(`family-${familyId}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` },
            () => refreshCalendar()
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'rsvps' },
            () => refreshCalendar()
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'blocked_days', filter: `family_id=eq.${familyId}` },
            () => refreshCalendar()
        )
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'members', filter: `family_id=eq.${familyId}` },
            (payload) => {
                fetchMembers();
                showToast(`${payload.new?.display_name || 'A member'} updated`);
            }
        )
        .subscribe();

    return realtimeChannel;
}

function unsubscribe() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}
