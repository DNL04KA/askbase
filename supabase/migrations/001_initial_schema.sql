-- Askbase — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  billing_provider text not null default 'mock' check (billing_provider in ('mock', 'stripe')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.chatbots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  system_prompt text not null default 'You are a helpful assistant. Answer questions based on the provided context.',
  welcome_message text not null default 'Hi! Ask me anything about our docs.',
  theme_config jsonb not null default '{"color": "#7c5cff", "position": "bottom-right"}',
  is_active boolean not null default true,
  embed_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots (id) on delete cascade,
  title text not null,
  source_type text not null default 'file' check (source_type in ('file', 'text')),
  file_path text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  error_message text,
  chunk_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  content text not null,
  embedding vector(1536),
  chunk_index int not null default 0,
  metadata jsonb not null default '{}'
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots (id) on delete cascade,
  source text not null default 'app' check (source in ('app', 'widget')),
  visitor_id text,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  tokens_used int,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  stripe_subscription_id text unique,
  status text,
  plan text,
  provider text not null default 'mock' check (provider in ('mock', 'stripe')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_stats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  stat_date date not null default current_date,
  messages_count int not null default 0,
  documents_count int not null default 0,
  storage_bytes bigint not null default 0,
  unique (org_id, stat_date)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists document_chunks_document_id_idx on public.document_chunks (document_id);
create index if not exists documents_chatbot_id_idx on public.documents (chatbot_id);
create index if not exists chatbots_org_id_idx on public.chatbots (org_id);
create index if not exists chatbots_embed_token_idx on public.chatbots (embed_token);
create index if not exists conversations_chatbot_id_idx on public.conversations (chatbot_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists usage_stats_org_date_idx on public.usage_stats (org_id, stat_date);

-- ---------------------------------------------------------------------------
-- Semantic search
-- ---------------------------------------------------------------------------

create or replace function public.match_documents (
  query_embedding vector(1536),
  target_chatbot_id uuid,
  match_count int default 5,
  match_threshold float default 0.7
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    dc.id as chunk_id,
    d.id as document_id,
    d.title as document_title,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where d.chatbot_id = target_chatbot_id
    and d.status = 'processed'
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- Atomic usage counter (avoids read-modify-write races from the app)
create or replace function public.increment_message_usage(
  target_org_id uuid,
  tokens int default 0
)
returns void
language sql security definer set search_path = public
as $$
  insert into public.usage_stats (org_id, stat_date, messages_count)
  values (target_org_id, current_date, 1)
  on conflict (org_id, stat_date)
  do update set messages_count = usage_stats.messages_count + 1;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Auto-create a profile for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'organizations', 'chatbots', 'documents', 'subscriptions']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.chatbots enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_stats enable row level security;

-- Membership helper (security definer avoids recursive RLS on organization_members)
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = check_org_id and user_id = auth.uid()
  );
$$;

create policy "profiles: own row" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations: members read" on public.organizations
  for select using (public.is_org_member(id));

create policy "organizations: owner update" on public.organizations
  for update using (owner_id = auth.uid());

create policy "organizations: authenticated insert" on public.organizations
  for insert with check (owner_id = auth.uid());

create policy "org_members: members read" on public.organization_members
  for select using (public.is_org_member(org_id));

create policy "org_members: self insert" on public.organization_members
  for insert with check (user_id = auth.uid());

create policy "chatbots: members all" on public.chatbots
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy "documents: members all" on public.documents
  for all using (
    exists (
      select 1 from public.chatbots c
      where c.id = documents.chatbot_id and public.is_org_member(c.org_id)
    )
  );

create policy "document_chunks: members all" on public.document_chunks
  for all using (
    exists (
      select 1
      from public.documents d
      join public.chatbots c on c.id = d.chatbot_id
      where d.id = document_chunks.document_id and public.is_org_member(c.org_id)
    )
  );

create policy "conversations: members all" on public.conversations
  for all using (
    exists (
      select 1 from public.chatbots c
      where c.id = conversations.chatbot_id and public.is_org_member(c.org_id)
    )
  );

create policy "messages: members all" on public.messages
  for all using (
    exists (
      select 1
      from public.conversations conv
      join public.chatbots c on c.id = conv.chatbot_id
      where conv.id = messages.conversation_id and public.is_org_member(c.org_id)
    )
  );

create policy "subscriptions: members read" on public.subscriptions
  for select using (public.is_org_member(org_id));

create policy "usage_stats: members read" on public.usage_stats
  for select using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded documents
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents bucket: org members read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents bucket: org members write"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents bucket: org members delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
