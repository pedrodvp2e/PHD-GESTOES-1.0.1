/*
  # Bucket de armazenamento para fotos de perfil (avatars)

  1. Novo bucket
    - `avatars` (público para leitura, já que as fotos aparecem para toda a equipe)

  2. Políticas de acesso
    - Qualquer usuário autenticado pode enviar/atualizar/remover apenas
      arquivos dentro da própria pasta (nomeada com o seu user id)
    - Leitura pública, pois as fotos de perfil são exibidas para todos os
      membros das obras (chat, equipe, etc.)
*/

-- Cria o bucket "avatars" caso ainda não exista
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Permite leitura pública dos arquivos do bucket avatars
create policy "Avatar images are publicly accessible"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- Permite que o usuário autenticado envie arquivos apenas na sua própria pasta
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Permite que o usuário autenticado atualize apenas seus próprios arquivos
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Permite que o usuário autenticado remova apenas seus próprios arquivos
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
