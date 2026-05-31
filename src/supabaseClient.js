import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jamsbyazdosjwqyyysms.supabase.co";
const supabaseAnonKey = "sb_publishable_JTZH_xEtSfkH5iCv0YYBIQ_1RvTv7hJ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
