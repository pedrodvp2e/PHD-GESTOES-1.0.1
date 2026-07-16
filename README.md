# PHD Gestões

Aplicativo de gestão de obras e equipes para construção civil.

## Funcionalidades

- **Obras**: Cadastro e gestão de obras com progresso, prazos e status
- **Serviços**: Controle de serviços com cronômetro e progresso percentual
- **Materiais**: Acompanhamento de quantidade necessária vs. adquirida
- **Equipe**: Visualização de trabalhadores por obra com cargo e função
- **Mensagens**: Chat em tempo real entre membros de cada obra
- **Avisos**: Notificações de materiais baixos e prazos de serviços próximos
- **Contas individuais**: Cada usuário tem sua conta com login e senha
- **Verificação de email**: Confirmação de email ao criar conta
- **Segurança**: Cada conta só acessa dados das obras onde é membro

## Papéis

- **Administrador**: Acesso total a todas as obras e dados
- **Engenheiro**: Cria obras, gerencia equipes e serviços
- **Mestre de Obras**: Cria obras, gerencia equipes e serviços
- **Encarregado**: Acessa obras onde é membro
- **Funcionário**: Acessa obras onde é membro

## Build APK (Android via EAS)

### Pré-requisitos

1. Instalar EAS CLI:
```bash
npm install -g eas-cli
```

2. Fazer login na Expo:
```bash
eas login
```

3. Criar o projeto no EAS (se ainda não existir):
```bash
eas init
```

### Gerar APK

```bash
# Build de produção (APK)
eas build --platform android --profile production

# Build de preview (APK para testes)
eas build --platform android --profile preview
```

O APK será gerado e disponibilizado para download após o build.

### Build local (alternativa)

```bash
# Pré-build do projeto
npx expo prebuild --platform android

# Compilar APK com Gradle
cd android && ./gradlew assembleRelease
```

O APK ficará em `android/app/build/outputs/apk/release/app-release.apk`.

## Conta Admin

- **Email**: admin@obrafacil.com
- **Senha**: 2412

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Type check
npm run typecheck

# Build web
npm run build:web
```

## Configuração do Email

Para ativar a verificação de email ao criar conta:

1. Acesse o dashboard do Supabase
2. Vá em Authentication > Settings
3. Ative "Confirm email"
4. Configure o template de email de confirmação

## Tecnologias

- **Frontend**: React Native (Expo)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Notificações**: expo-notifications
- **Armazenamento local**: AsyncStorage
- **Build**: EAS (Expo Application Services)
