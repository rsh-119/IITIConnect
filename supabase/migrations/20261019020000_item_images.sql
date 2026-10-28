insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('item-images','item-images',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.can_upload_item_image(p_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_folders text[]; v_item_id uuid;
begin
  v_folders := storage.foldername(p_name);
  if array_length(v_folders,1)<>2 or v_folders[1]<>auth.uid()::text
     or storage.extension(p_name) not in ('jpg','jpeg','png','webp') then
    return false;
  end if;
  select r.id into v_item_id from public.item_requests r
  where r.id::text=v_folders[2] and r.requester_id=auth.uid()
    and r.campus_id=private.active_campus_id()
    and r.status='open' and r.image_path is null
  for update;
  if not found then return false; end if;
  return not exists (
    select 1 from storage.objects o
    where o.bucket_id='item-images'
      and o.name like auth.uid()::text || '/' || v_item_id::text || '/%'
  );
end $$;
revoke all on function private.can_upload_item_image(text) from public, anon;
grant execute on function private.can_upload_item_image(text) to authenticated;

create policy item_images_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'item-images' and (select private.can_upload_item_image(name))
);

create policy item_images_read on storage.objects for select to authenticated using (
  bucket_id = 'item-images'
  and (
    exists (
      select 1 from public.item_requests r
      where r.image_path = name
        and r.campus_id = (select private.active_campus_id())
    )
    or (
      owner_id = (select auth.uid())::text
      and (select private.active_campus_id()) is not null
      and not exists (select 1 from public.item_requests r where r.image_path = name)
    )
  )
);

create policy item_images_remove_orphan on storage.objects for delete to authenticated using (
  bucket_id = 'item-images'
  and owner_id = (select auth.uid())::text
  and (select private.active_campus_id()) is not null
  and not exists (select 1 from public.item_requests r where r.image_path = name)
);

create function public.attach_item_image(p_request_id uuid,p_path text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_request public.item_requests%rowtype;
begin
  if private.active_campus_id() is null then
    raise exception 'Account unavailable' using errcode='28000';
  end if;
  select * into v_request from public.item_requests where id=p_request_id for update;
  if not found or v_request.requester_id<>auth.uid() or v_request.status<>'open'
     or v_request.image_path is not null then
    raise exception 'Request unavailable' using errcode='22023';
  end if;
  if p_path not like auth.uid()::text || '/' || p_request_id::text || '/%'
     or char_length(p_path)>500
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id='item-images' and o.name=p_path
         and o.owner_id=auth.uid()::text
     ) then
    raise exception 'Image unavailable' using errcode='22023';
  end if;
  update public.item_requests
    set image_path=p_path,version=version+1,updated_at=now()
    where id=p_request_id;
end $$;
revoke all on function public.attach_item_image(uuid,text) from public, anon;
grant execute on function public.attach_item_image(uuid,text) to authenticated;
