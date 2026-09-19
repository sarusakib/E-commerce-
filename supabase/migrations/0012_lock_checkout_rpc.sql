-- E-Commerce Premium: explicitly restrict checkout RPC execution.

revoke execute on function public.create_guest_order(text, text, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.get_guest_order(text) from public, anon, authenticated;
grant execute on function public.create_guest_order(text, text, jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.get_guest_order(text) to service_role;