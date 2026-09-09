create extension if not exists vector with schema extensions;

create table if not exists public.assistant_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  body text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.assistant_knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  heading text,
  content text not null,
  embedding extensions.vector(1536),
  search_vector tsvector generated always as (to_tsvector('english', coalesce(heading, '') || ' ' || content)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index if not exists assistant_knowledge_chunks_search_idx on public.assistant_knowledge_chunks using gin(search_vector);
create index if not exists assistant_knowledge_chunks_embedding_idx on public.assistant_knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.assistant_knowledge_documents enable row level security;
alter table public.assistant_knowledge_chunks enable row level security;
revoke all on public.assistant_knowledge_documents from anon, authenticated;
revoke all on public.assistant_knowledge_chunks from anon, authenticated;

insert into public.assistant_knowledge_documents (slug, title, category, body) values
('territories-and-exclusivity','Territories and exclusivity','territories','A MyTradeBox territory is a postcode district and trade combination. An active territory gives one business exclusive MyTradeBox access to the full matched opportunity briefs for that trade in that district. Users can explore other districts before buying. Unowned opportunity previews intentionally show only enough information to judge the signal, such as project type, planning status and indicative trade value, while private planning details remain locked. Territory availability can change when another business reserves or activates the same district and trade.'),
('opportunity-scoring','Opportunity scoring and value','opportunities','MyTradeBox ranks matched opportunities using a deterministic score from 0 to 100. Hot is 90 or above, Strong is 75 to 89, Possible is 50 to 74 and Low is below 50. The score considers trade fit, indicative value, project size, recency, planning stage and AI confidence. Planning stage materially affects urgency: approved work is generally more commercially actionable than a newly submitted application. Estimated project and trade values are indicative estimates, not formal valuations or accounting records.'),
('planning-status-and-timing','Planning status and timing','planning','Planning applications may be submitted, validated, under consideration, decision expected, approved, rejected, withdrawn or under appeal. MyTradeBox monitors status changes and can alert territory holders when a matched application is approved. Recommended contact timing is guidance derived from the project context and planning stage; users should still apply their own commercial judgement.'),
('opportunity-workflow','Opportunity workflow','workflow','The opportunity workflow helps a user move from discovery to action. A new opportunity can be viewed, saved, contacted, quoted, won or lost. Follow-up reminders can be scheduled against an opportunity. When an opportunity is marked won, the user can record contract value so MyTradeBox can measure attributable value and ROI.'),
('notifications','Notifications and alerts','notifications','MyTradeBox provides in-app notifications plus configurable email delivery. Important events include planning approvals, high-priority opportunities, follow-up reminders, nearby available territories and billing issues. The in-app notification rail prioritises urgent commercial events above general updates and links users to the relevant opportunity or workspace area when possible.'),
('roi','ROI and business case','roi','The ROI view summarises open estimated pipeline, quoted value, won value, monthly territory spend and an estimated ROI multiple. Won value uses the contract value recorded by the user where available and otherwise falls back to the indicative opportunity estimate. Pipeline and ROI are decision-support metrics rather than accounting statements.'),
('data-access-and-privacy','Data access, previews and privacy','security','Ask MyTradeBox must respect the same territory access rules as the rest of the application. A user may search the wider MyTradeBox market, but opportunities outside their active territories must remain in teaser form. Teaser results may include postcode district or town, trade, project type, planning status and indicative trade value. Addresses, planning references, detailed summaries, AI reasoning, applicant details and recommended outreach remain private unless the user owns the relevant territory.'),
('outreach','Contacting an opportunity','outreach','MyTradeBox can generate draft outreach based on the facts in an unlocked opportunity brief. Current draft formats include an introductory letter, a phone opener and a doorstep script. Generated content is a starting point for review and personalisation; MyTradeBox does not send outreach automatically unless an explicit outbound delivery feature is configured.'),
('exports','Exports','exports','The Opportunities page can export permission-safe CSV data and an unlocked opportunity can be downloaded as a branded PDF brief. The ROI page can export a branded PDF business-case report. Export endpoints use the signed-in user context and must never reveal fields the workspace is not entitled to view.'),
('explore-versus-coverage','Explore territories and My coverage','territories','Explore territories is for discovering and evaluating postcode districts, opportunity volume and indicative commercial value. My coverage is for managing districts and trades the business already owns. Users should explore when they want to expand and use My coverage when they want to understand or manage their existing footprint.')
on conflict (slug) do update set title=excluded.title, category=excluded.category, body=excluded.body, is_active=true, updated_at=now();

insert into public.assistant_knowledge_chunks (document_id, chunk_index, heading, content)
select id, 0, title, body from public.assistant_knowledge_documents
on conflict (document_id, chunk_index) do update set heading=excluded.heading, content=excluded.content, embedding=null, updated_at=now();

create or replace function public.search_assistant_knowledge(p_query text, p_query_embedding extensions.vector(1536) default null, p_match_count integer default 6)
returns table (document_slug text, document_title text, category text, heading text, content text, relevance double precision)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return query
  with ranked as (
    select d.slug,d.title,d.category,c.heading,c.content,
      case when p_query_embedding is not null and c.embedding is not null then greatest(0::double precision,1-(c.embedding <=> p_query_embedding)) else 0::double precision end semantic_score,
      case when nullif(btrim(p_query),'') is not null then ts_rank_cd(c.search_vector,websearch_to_tsquery('english',p_query))::double precision else 0::double precision end lexical_score
    from public.assistant_knowledge_chunks c join public.assistant_knowledge_documents d on d.id=c.document_id where d.is_active
  )
  select r.slug,r.title,r.category,r.heading,r.content,
    case when p_query_embedding is not null then (r.semantic_score*0.8)+(r.lexical_score*0.2) else r.lexical_score end
  from ranked r
  where (p_query_embedding is not null and r.semantic_score>=0.20) or r.lexical_score>0
  order by 6 desc limit greatest(1,least(coalesce(p_match_count,6),12));
end; $$;
revoke all on function public.search_assistant_knowledge(text, extensions.vector, integer) from public, anon;
grant execute on function public.search_assistant_knowledge(text, extensions.vector, integer) to authenticated;

create or replace function public.search_opportunity_teasers(p_location text,p_trade_slug text default null,p_status text default null,p_limit integer default 25)
returns table (opportunity_id uuid,total_matches bigint,postcode_district text,post_town text,trade_name text,trade_slug text,project_type text,planning_status text,estimated_trade_value_low numeric,estimated_trade_value_high numeric,access_level text,opportunity_score numeric,opportunity_bucket text,summary text,recommended_action text,territory_status text,monthly_price_pence integer)
language plpgsql stable security definer set search_path=public as $$
declare v_company_id uuid; v_location text:=lower(btrim(coalesce(p_location,'')));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if v_location='' then raise exception 'location_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then raise exception 'company_required'; end if;
  return query
  with candidates as (
    select o.id opportunity_id,o.postcode_district,pd.post_town,tc.name trade_name,tc.slug trade_slug,ac.project_type,pa.status::text planning_status,o.estimated_trade_value_low,o.estimated_trade_value_high,o.opportunity_score,o.opportunity_bucket::text,ac.summary,o.recommended_action,tr.id territory_id,tr.monthly_price_pence,
      exists(select 1 from public.territory_claims c where c.territory_id=tr.id and c.company_id=v_company_id and c.status='active') is_owned,
      exists(select 1 from public.territory_claims c where c.territory_id=tr.id and c.status in ('reserved','active','suspended')) is_claimed
    from public.application_trade_opportunities o
    join public.planning_applications pa on pa.id=o.planning_application_id
    join public.application_classifications ac on ac.id=o.application_classification_id
    join public.trade_categories tc on tc.id=o.trade_category_id
    left join public.postcode_districts pd on pd.id=o.postcode_district
    join public.territories tr on tr.postcode_district=o.postcode_district and tr.trade_category_id=o.trade_category_id and tr.is_active
    where o.is_active and (lower(coalesce(pd.post_town,'')) like '%'||v_location||'%' or lower(o.postcode_district)=v_location or lower(coalesce(pd.region,'')) like '%'||v_location||'%' or lower(coalesce(pa.local_planning_authority,'')) like '%'||v_location||'%')
      and (p_trade_slug is null or tc.slug=p_trade_slug) and (p_status is null or pa.status::text=p_status)
  ), counted as (select c.*,count(*) over() total_matches from candidates c)
  select c.opportunity_id,c.total_matches,c.postcode_district,c.post_town,c.trade_name,c.trade_slug,c.project_type,c.planning_status,c.estimated_trade_value_low,c.estimated_trade_value_high,
    case when c.is_owned then 'full' else 'teaser' end,
    case when c.is_owned then c.opportunity_score else null end,
    case when c.is_owned then c.opportunity_bucket else null end,
    case when c.is_owned then c.summary else null end,
    case when c.is_owned then c.recommended_action else null end,
    case when c.is_owned then 'owned' when c.is_claimed then 'claimed' else 'available' end,c.monthly_price_pence
  from counted c order by c.opportunity_score desc nulls last,c.estimated_trade_value_high desc nulls last limit greatest(1,least(coalesce(p_limit,25),100));
end; $$;
revoke all on function public.search_opportunity_teasers(text,text,text,integer) from public, anon;
grant execute on function public.search_opportunity_teasers(text,text,text,integer) to authenticated;
