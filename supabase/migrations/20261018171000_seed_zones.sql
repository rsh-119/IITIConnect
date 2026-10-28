-- Coarse, public meeting/destination zones; no personal addresses.
insert into public.location_zones(campus_id,label)
select c.id, z.label from public.campuses c
cross join (values ('IIT Indore Campus'),('Indore Airport'),('Indore Railway Station'),('Vijay Nagar'),('Palasia'),('Rajwada')) as z(label)
where c.code='iiti'
on conflict(campus_id,label) do nothing;
