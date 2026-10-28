-- Supabase-specific. PGlite tests do not have the managed publication.
alter publication supabase_realtime add table public.messages;
