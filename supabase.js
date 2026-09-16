const SUPABASE_URL = "https://badeaemeqyfvuvzthhfi.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_R7fInzurYQ8tVJWrknlyaw_UoBIXGqY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);