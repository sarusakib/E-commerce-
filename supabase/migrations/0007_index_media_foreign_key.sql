-- E-Commerce Premium: index the product media composite foreign key.

create index product_images_store_product_idx
  on public.product_images(store_id, product_id);
