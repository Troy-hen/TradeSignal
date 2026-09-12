update public.assistant_knowledge_documents
set body = 'MyTradeBox can enrich an unlocked planning opportunity with property-level intelligence from TwentyCI when configured. This may include a matched UPRN, indicative property value, property attributes, recent property-market trigger history, transaction recency, planning history associated with the property and a Likely To Sell percentile. These signals are used to improve timing, context and prioritisation only. They do not identify who currently lives at the property, do not prove that planned construction work will proceed, and do not create permission to email or text a homeowner. Homeowner-led opportunities should continue to use the contact strategy selected by MyTradeBox, normally project-address post followed by a permissioned QuoteLink response. Planning agents, limited companies and other professional contacts may use the applicable business contact route. A low Likely To Sell percentile means TwentyCI considers the property more likely to sell relative to UK residential properties; it should be described as property-movement context rather than construction intent. Property planning history can indicate repeated improvement or development activity but should not be treated as proof that the current project will proceed. Property intelligence is only shown for opportunities the signed-in workspace is entitled to unlock.',
    updated_at = now()
where slug = 'property-intelligence-and-contactability';

update public.assistant_knowledge_chunks c
set content = d.body,
    embedding = null,
    updated_at = now()
from public.assistant_knowledge_documents d
where c.document_id = d.id
  and c.chunk_index = 0
  and d.slug = 'property-intelligence-and-contactability';
