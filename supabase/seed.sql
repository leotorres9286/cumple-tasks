insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@cumple.tasks',
  crypt('pqlamz12..', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin Cumple","role":"admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@cumple.tasks"}',
  'email',
  '00000000-0000-0000-0000-000000000001',
  now(),
  now(),
  now()
)
on conflict (provider, provider_id) do nothing;

insert into public.profiles (
  id,
  email,
  full_name,
  initials,
  role,
  avatar_color
)
values (
  '00000000-0000-0000-0000-000000000001',
  'admin@cumple.tasks',
  'Admin Cumple',
  'AC',
  'admin',
  '#17201b'
)
on conflict (id) do update set role = 'admin';
