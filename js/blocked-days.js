let blockedDays = [];

async function fetchBlockedDays(startDate, endDate) {
    const { data, error } = await supabase
        .from('blocked_days')
        .select('*')
        .eq('family_id', getFamilyId())
        .lte('start_date', endDate.toISOString().split('T')[0])
        .gte('end_date', startDate.toISOString().split('T')[0]);
    if (error) throw error;
    blockedDays = data;
    return data;
}

function getBlockedForDate(date) {
    const dayStr = date.toISOString().split('T')[0];
    return blockedDays.filter(b => dayStr >= b.start_date && dayStr <= b.end_date);
}

async function createBlockedDays(startDate, endDate, label) {
    const { data, error } = await supabase
        .from('blocked_days')
        .insert({
            family_id: getFamilyId(),
            member_id: getMemberId(),
            start_date: startDate,
            end_date: endDate,
            label: label || 'Work'
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deleteBlockedDay(id) {
    const { error } = await supabase
        .from('blocked_days')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
