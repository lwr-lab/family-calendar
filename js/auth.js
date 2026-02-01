async function ensureSignedIn() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.session;
}

async function createFamily(familyName, displayName, color) {
    await ensureSignedIn();
    const { data, error } = await supabase.rpc('create_family', {
        p_family_name: familyName,
        p_display_name: displayName,
        p_color: color
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    localStorage.setItem('family_id', data.family_id);
    localStorage.setItem('member_id', data.member_id);
    localStorage.setItem('invite_code', data.invite_code);
    return data;
}

async function joinFamily(inviteCode, displayName, color) {
    await ensureSignedIn();
    const { data, error } = await supabase.rpc('join_family_by_invite', {
        p_invite_code: inviteCode.trim().toLowerCase(),
        p_display_name: displayName,
        p_color: color
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    localStorage.setItem('family_id', data.family_id);
    localStorage.setItem('member_id', data.member_id);
    return data;
}

function getFamilyId() {
    return localStorage.getItem('family_id');
}

function getMemberId() {
    return localStorage.getItem('member_id');
}

function leaveFamily() {
    localStorage.removeItem('family_id');
    localStorage.removeItem('member_id');
    localStorage.removeItem('invite_code');
    window.location.href = 'index.html';
}
