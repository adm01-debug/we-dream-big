create or replace function public.update_quote_transactional(
  _quote_id uuid,
  _quote_patch jsonb,
  _items jsonb
)
returns public.quotes
language plpgsql
security invoker
set search_path = public
as $$
declare
  _updated_quote public.quotes;
  _item jsonb;
  _pers jsonb;
  _new_item_id uuid;
begin
  update public.quotes
  set
    client_name = coalesce(_quote_patch->>'client_name', client_name),
    client_email = coalesce(_quote_patch->>'client_email', client_email),
    client_phone = coalesce(_quote_patch->>'client_phone', client_phone),
    status = coalesce((_quote_patch->>'status')::quote_status, status),
    shipping_type = coalesce(_quote_patch->>'shipping_type', shipping_type),
    shipping_cost = coalesce((_quote_patch->>'shipping_cost')::numeric, shipping_cost),
    payment_terms = coalesce(_quote_patch->>'payment_terms', payment_terms),
    notes = coalesce(_quote_patch->>'notes', notes),
    discount_percent = coalesce((_quote_patch->>'discount_percent')::numeric, discount_percent),
    discount_value = coalesce((_quote_patch->>'discount_value')::numeric, discount_value),
    subtotal = coalesce((_quote_patch->>'subtotal')::numeric, subtotal),
    total_amount = coalesce((_quote_patch->>'total_amount')::numeric, total_amount),
    quote_number = coalesce(_quote_patch->>'quote_number', quote_number),
    expires_at = coalesce((_quote_patch->>'expires_at')::timestamptz, expires_at),
    updated_at = now()
  where id = _quote_id
  returning * into _updated_quote;

  if _updated_quote is null then
    raise exception 'Orçamento não encontrado para atualização';
  end if;

  delete from public.quote_item_personalizations
  where quote_item_id in (
    select id from public.quote_items where quote_id = _quote_id
  );

  delete from public.quote_items where quote_id = _quote_id;

  for _item in select value from jsonb_array_elements(coalesce(_items, '[]'::jsonb)) loop
    insert into public.quote_items (
      quote_id, product_id, product_name, quantity, unit_price, discount_percent,
      discount_value, line_total, sort_order, notes
    )
    values (
      _quote_id,
      nullif(_item->>'product_id', '')::uuid,
      _item->>'product_name',
      coalesce((_item->>'quantity')::integer, 0),
      coalesce((_item->>'unit_price')::numeric, 0),
      coalesce((_item->>'discount_percent')::numeric, 0),
      coalesce((_item->>'discount_value')::numeric, 0),
      coalesce((_item->>'line_total')::numeric, 0),
      coalesce((_item->>'sort_order')::integer, 0),
      _item->>'notes'
    )
    returning id into _new_item_id;

    for _pers in select value from jsonb_array_elements(coalesce(_item->'personalizations', '[]'::jsonb)) loop
      insert into public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, location, colors, dimensions,
        quantity, unit_cost, total_cost, notes
      )
      values (
        _new_item_id,
        nullif(_pers->>'technique_id', '')::uuid,
        _pers->>'technique_name',
        _pers->>'location',
        _pers->>'colors',
        _pers->>'dimensions',
        coalesce((_pers->>'quantity')::integer, 0),
        coalesce((_pers->>'unit_cost')::numeric, 0),
        coalesce((_pers->>'total_cost')::numeric, 0),
        _pers->>'notes'
      );
    end loop;
  end loop;

  return _updated_quote;
end;
$$;
