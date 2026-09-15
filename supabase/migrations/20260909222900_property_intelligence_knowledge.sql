insert into public.assistant_knowledge_documents (slug, title, category, body, is_active, metadata)
values (
  'property-intelligence-and-contactability',
  'Property intelligence and contactability',
  'property_intelligence',
  'MyTradeBox can enrich an unlocked planning opportunity with property-level intelligence from TwentyCI when configured. This may include a matched UPRN, indicative property value, property attributes, recent property-market trigger history, transaction recency and a Likely To Sell percentile. These signals are used to improve timing and prioritisation only. They do not identify who currently lives at the property, do not prove that planned construction work will proceed, and do not create permission to email or text a homeowner. Homeowner-led opportunities should continue to use the contact strategy selected by MyTradeBox, normally project-address post followed by a permissioned QuoteLink response. Planning agents, limited companies and other professional contacts may use the applicable business contact route. A low Likely To Sell percentile means TwentyCI considers the property more likely to sell relative to UK residential properties; it should be described as property-movement context rather than construction intent. Property intelligence is only shown for opportunities the signed-in workspace is entitled to unlock.',
  true,
  '{"provider":"twentyci","purpose":"rag_guardrail"}'::jsonb
)
on conflict (slug) do update
set title = excluded.title,
    category = excluded.category,
    body = excluded.body,
    is_active = true,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.assistant_knowledge_chunks (document_id, chunk_index, heading, content)
select id, 0, title, body
from public.assistant_knowledge_documents
where slug = 'property-intelligence-and-contactability'
on conflict (document_id, chunk_index) do update
set heading = excluded.heading,
    content = excluded.content,
    embedding = null,
    updated_at = now();
