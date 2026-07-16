# O que foi corrigido

Este projeto era um template "bolt-expo" que misturava dois tipos de projeto:
- Uma estrutura de app Expo/React Native (pastas `app/`, `hooks/`, `components/`,
  `lib/` na raiz, arquivo `eas.json`) — que nunca chegou a ser usada de verdade.
- O app real, construído inteiramente dentro de `src/` como um app Vite + React
  (para navegador), com o Capacitor sendo o caminho certo para virar `.apk`.

## O que mudou
- Removidas todas as pastas/arquivos do Expo que não eram usados (`app/`, `hooks/`,
  `components/`, `lib/` da raiz, `eas.json`, `app.json`, `types/env.d.ts`).
- `tsconfig.json` corrigido (não depende mais de `expo/tsconfig.base`).
- Adicionado `@supabase/supabase-js` ao `package.json` (faltava — era o erro
  original do build).
- Adicionado Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`)
  ao `package.json`, e criado `capacitor.config.ts`.
- Pasta `assets/` movida para `public/` (padrão do Vite para arquivos estáticos).
- Criado `.env.example` — copie para `.env` e preencha com as chaves do Supabase.
- Criado `.github/workflows/build-apk.yml`: gera o `.apk` automaticamente na
  nuvem via GitHub Actions, sem precisar rodar o build pesado no celular.

## Como usar

### 1. Subir para o GitHub
No Termux, dentro da pasta do projeto (substitua pelo conteúdo deste zip):
```bash
git add -A
git commit -m "Corrige estrutura do projeto e adiciona build automático de APK"
git push
```

### 2. Configurar as chaves do Supabase no GitHub (uma vez só)
No repositório no GitHub: **Settings > Secrets and variables > Actions > New
repository secret**. Crie dois secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(valores em Supabase > Configurações do Projeto > API)

### 3. Gerar o APK
Basta dar `git push` na branch `main` — o GitHub Actions builda o APK
automaticamente. Para baixar:
1. Vá na aba **Actions** do repositório no GitHub.
2. Abra a execução mais recente de "Build Android APK".
3. Baixe o arquivo em **Artifacts > app-debug-apk**.

Também dá pra disparar manualmente pela aba Actions, botão **Run workflow**.

### 4. Rodar localmente (opcional, se quiser testar no PC)
```bash
npm install
cp .env.example .env   # preencha com suas chaves
npm run build
npx cap add android
npx cap sync android
npx cap open android   # abre no Android Studio
```

## Notificações na barra do celular

O app agora dispara notificações reais na barra de notificações do Android
(usando `@capacitor/local-notifications`), com o ícone do PHD Gestões e a
cor da marca. Detalhes importantes:

- Ao abrir o app pela primeira vez após instalar, o Android pergunta a
  permissão de notificações (isso é um comportamento do próprio sistema —
  desde o Android 6 não existe mais "permissão na instalação", só em tempo
  de execução).
- O workflow do GitHub Actions (`build-apk.yml`) já cuida de adicionar a
  permissão `POST_NOTIFICATIONS` no `AndroidManifest.xml` e de copiar o
  ícone (`public/assets/images/icon.png`) como ícone de notificação — isso
  acontece automaticamente a cada build, sem precisar mexer em nada.
- Testando localmente (`npx cap sync android` + Android Studio), rode o
  mesmo passo manualmente se quiser testar antes de commitar, copiando
  `public/assets/images/icon.png` para
  `android/app/src/main/res/drawable/ic_stat_notify.png` e adicionando a
  permissão `POST_NOTIFICATIONS` no manifest.

## Ícone do app

O ícone anterior (`icon.png` e `favicon.png`) estava corrompido — o arquivo
não abria como imagem em nenhum lugar (nem no app, nem no ícone do
Android). Foi substituído por uma nova imagem enviada, e o processo de
build agora gera automaticamente o ícone do launcher do Android
(`@capacitor/assets`, a partir de `resources/icon.png`) a cada `git push`,
coisa que também nunca tinha sido configurada antes — sem isso, o APK
saía sempre com o ícone padrão do Capacitor.
