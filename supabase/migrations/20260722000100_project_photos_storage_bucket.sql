/*
  # Bucket de armazenamento para fotos de obra (diário, ocorrências, notas fiscais)

  Antes, essas fotos eram salvas como texto base64 direto nas tabelas
  (diary_entries.photo, incidents.photo, material_receipts.photo), o que
  deixa o banco pesado e caro conforme o uso cresce. Agora elas vão para o
  Storage do Supabase, e as colunas passam a guardar só a URL do arquivo.

  Caminho dos arquivos no bucket: {project_id}/{tipo}/{arquivo}
  Isso permite restringir upload/leitura a quem é membro daquela obra
  específica, verificando o {project_id} que vem no início do caminho.
*/

-- Cria o bucket "project-photos" (privado — só membros da obra acessam)
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

-- Função auxiliar: o usuário é membro do projeto cujo id está na 1ª pasta do caminho?
create or replace function public.is_member_of_photo_project(object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_members.project_id = (storage.foldername(object_name))[1]::uuid
    and project_members.user_id = auth.uid()
  );
$$;

create policy "Members can read project photos"
on storage.objects for select
to authenticated
using (bucket_id = 'project-photos' and public.is_member_of_photo_project(name));

create policy "Members can upload project photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'project-photos' and public.is_member_of_photo_project(name));

create policy "Members can update project photos"
on storage.objects for update
to authenticated
using (bucket_id = 'project-photos' and public.is_member_of_photo_project(name));

create policy "Members can delete project photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'project-photos' and public.is_member_of_photo_project(name));
