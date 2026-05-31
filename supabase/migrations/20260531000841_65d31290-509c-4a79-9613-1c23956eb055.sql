create or replace function public.lookup_debate_by_join_code(_code text)
returns table(id uuid, topic text, status text, format text, max_speakers_per_side int)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.topic, d.status, d.format, d.max_speakers_per_side
  from public.debates d
  where d.join_code = upper(_code)
  limit 1
$$;

grant execute on function public.lookup_debate_by_join_code(text) to anon, authenticated;