create unique index if not exists quote_requests_one_per_response_link_idx
  on public.quote_requests(response_link_id);
