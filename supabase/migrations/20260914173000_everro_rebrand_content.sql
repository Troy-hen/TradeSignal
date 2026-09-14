-- Align mutable product content with the Everro brand while preserving durable
-- historical identifiers, signatures and previously-applied migration history.

update public.ai_prompt_versions
set system_prompt = replace(replace(system_prompt, 'TradeSignal', 'Everro'), 'MyTradeBox', 'Everro')
where system_prompt like '%TradeSignal%' or system_prompt like '%MyTradeBox%';

update public.assistant_knowledge_documents
set
  title = replace(replace(title, 'TradeSignal', 'Everro'), 'MyTradeBox', 'Everro'),
  body = replace(replace(body, 'TradeSignal', 'Everro'), 'MyTradeBox', 'Everro'),
  updated_at = now()
where
  title like '%TradeSignal%' or title like '%MyTradeBox%'
  or body like '%TradeSignal%' or body like '%MyTradeBox%';

update public.assistant_knowledge_chunks
set
  heading = replace(replace(heading, 'TradeSignal', 'Everro'), 'MyTradeBox', 'Everro'),
  content = replace(replace(content, 'TradeSignal', 'Everro'), 'MyTradeBox', 'Everro'),
  updated_at = now()
where
  heading like '%TradeSignal%' or heading like '%MyTradeBox%'
  or content like '%TradeSignal%' or content like '%MyTradeBox%';

update public.notification_log
set
  subject = replace(replace(subject, 'TradeSignal', 'Everro'), 'MyTradeBox', 'Everro'),
  email_html = replace(replace(email_html, 'TradeSignal', 'Everro'), 'MyTradeBox', 'Everro')
where
  subject like '%TradeSignal%' or subject like '%MyTradeBox%'
  or email_html like '%TradeSignal%' or email_html like '%MyTradeBox%';
