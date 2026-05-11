import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';

let supabaseAdmin: SupabaseClient | null = null;
let supabasePublic: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdmin;
}

export function getSupabasePublic(): SupabaseClient {
  if (!supabasePublic) {
    supabasePublic = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }
  return supabasePublic;
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  file: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) return null;
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicData.publicUrl;
}
