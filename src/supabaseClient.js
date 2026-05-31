import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jamsbyazdosjwqyyysms.supabase.co";
const supabaseAnonKey = "PASTE_YOUR_ANON_KEY_HERE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
