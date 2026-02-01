let familyMembers = [];

async function fetchMembers() {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('family_id', getFamilyId());
    if (error) throw error;
    familyMembers = data;
    return data;
}

function getMemberById(id) {
    return familyMembers.find(m => m.id === id);
}

function getMemberColor(memberId) {
    const member = getMemberById(memberId);
    return member ? member.color : '#999';
}

function getMemberName(memberId) {
    const member = getMemberById(memberId);
    return member ? member.display_name : 'Unknown';
}

async function updateMember(displayName, color) {
    const { error } = await supabase
        .from('members')
        .update({ display_name: displayName, color: color })
        .eq('id', getMemberId());
    if (error) throw error;
    await fetchMembers();
}
