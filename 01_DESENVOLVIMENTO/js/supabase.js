const SUPABASE_URL = "https://vynhxxlzrxdarevjnckv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bmh4eGx6cnhkYXJldmpuY2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzOTczNzgsImV4cCI6MjEwODk3MzM3OH0.Nez8VQRyeewurT9_UFsN_ellzhOTN7xO2yMX5Fd4rQc";

window.desvelarSupabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
