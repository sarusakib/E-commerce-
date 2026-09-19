-- E-Commerce Premium: expose only active custom-domain mappings to public routing.
create policy "custom_domains_public_active"
on public.custom_domains for select
to anon
using (status='active');
grant select on public.custom_domains to anon;
