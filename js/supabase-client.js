// The UMD build declares `var supabase` globally (the library).
// We reassign it to the client instance so all scripts can use `supabase` directly.
supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
