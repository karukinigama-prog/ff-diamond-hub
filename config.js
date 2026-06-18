// ================================================================
// FF DIAMOND HUB — Supabase Configuration
// Created by Hasith
// ================================================================

const SUPABASE_URL = 'https://wibcldhwnnklzjbflyhu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYmNsZGh3bm5rbHpqYmZseWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTY3MjUsImV4cCI6MjA5NzE5MjcyNX0.jSr67yiOXTG_mFzZBriwLYBSHMy7zvaqtxQAET5ZTxU';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
