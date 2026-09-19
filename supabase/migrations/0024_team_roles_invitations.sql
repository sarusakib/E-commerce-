-- E-Commerce Premium: extend seller team roles in a standalone transaction.

alter type public.store_member_role add value if not exists 'manager';
alter type public.store_member_role add value if not exists 'product_manager';
alter type public.store_member_role add value if not exists 'order_manager';
