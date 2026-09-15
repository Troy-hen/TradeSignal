update public.assistant_knowledge_documents
set title = 'Coverage, trial and lead unlocks',
    body = $$Local, Regional and Nationwide are geography plans only. New accounts choose coverage at signup and, where the offer is enabled, start a 14-day platform trial. The monthly coverage fee is not charged until the trial ends. Every first-plan trial includes three lead unlock credits regardless of the coverage shape selected. Once those credits are used or the trial ends, each additional individual lead unlock is £20. All relevant opportunities within coverage are included; there are no vertical subscriptions, source subscriptions or lead bundles.$$,
    is_active = true,
    updated_at = now()
where slug = 'coverage-and-unlocks';

update public.assistant_knowledge_chunks c
set heading = d.title,
    content = d.body,
    embedding = null,
    updated_at = now()
from public.assistant_knowledge_documents d
where c.document_id = d.id
  and d.slug = 'coverage-and-unlocks';
