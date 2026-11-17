# Meu Treino

App de treinos (PWA) para academia e casa: planejamento semanal flexível, biblioteca de exercícios com
demonstrações animadas, modo treino com cronômetro e descanso automático, calendário, histórico com
comparação de cargas, metas e conquistas. Funciona **offline** e sincroniza com o Supabase quando há conexão.

React + TypeScript + Vite + Tailwind CSS 4 + Recharts + Dexie (IndexedDB) + Supabase + vite-plugin-pwa.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes da lógica (cronômetro, histórico, planejamento, sincronização offline/online)
npm run build      # build de produção (gera o service worker)
npm run preview    # serve o build em http://localhost:4173 (use para testar PWA/offline)
```

Sem configurar nada, o app funciona **100% local**: os dados ficam no aparelho (IndexedDB).

## Ativar login e sincronização (Supabase)

1. Crie um projeto em supabase.com.
2. No SQL Editor, rode [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Ele cria as tabelas
   (perfis, exercícios personalizados, treinos planejados e seus itens, treinos executados, exercícios e séries
   realizadas, metas, conquistas, vídeos/transcrições, grupos musculares) com **RLS ativo**: cada usuário só vê e
   altera as próprias linhas. Um trigger recusa gravações mais antigas que o registro salvo (o mais recente vence).
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. (Opcional) Para buscar a transcrição de vídeos do YouTube automaticamente:
   `supabase functions deploy youtube-transcript`. Sem isso, a transcrição é colada manualmente.

### Login pelo Clerk (mesmo do Plano CIAAR)
Opcional. Se `VITE_CLERK_PUBLISHABLE_KEY` estiver definida, o login é do Clerk e o token dele autentica o Supabase:
1. Rode também `supabase/migrations/0002_clerk.sql` (troca `user_id` para texto e as regras de acesso para o id do Clerk).
2. Clerk Dashboard → Integrations → Supabase → Activate. Supabase → Authentication → Third-Party Auth → Clerk (cole o domain).
3. Coloque `VITE_CLERK_PUBLISHABLE_KEY` no `.env.local` (e na Vercel). Sem essa variável, vale o login nativo do Supabase (0001 apenas).

### Como a sincronização funciona
- Tudo é gravado primeiro no aparelho; o envio é em segundo plano (ao voltar a conexão, ao abrir o app, ao
  voltar para a aba e a cada ~45 s).
- Cada registro tem um UUID gerado no aparelho e é enviado com `upsert` por `id`: reenviar não duplica treinos.
- Exclusões são lógicas (`deleted`) para chegarem aos outros aparelhos.
- O indicador no topo mostra: Online/sincronizado, Offline (dados no aparelho), Sincronizando, Erro (pendências).

## Instalar no celular
- **Android/Chrome**: botão "Instalar" no Início/Perfil (ou menu do navegador → Instalar app).
- **iPhone/iPad (Safari)**: Compartilhar → Adicionar à Tela de Início.
- Para publicar: qualquer hospedagem estática com HTTPS (Vercel, Netlify, Cloudflare Pages). `vercel.json` já
  contém o redirecionamento de rotas.

## Como o treino não perde progresso
O cronômetro e o descanso são calculados por **carimbos de data/hora** gravados no banco (início, pausas, fim
do descanso), nunca por um contador em memória. Fechar o app, atualizar a página ou bloquear o celular não
altera o tempo real decorrido; pausas são descontadas. Cada série/carga/repetição é gravada ao ser alterada.
Ao reabrir, o app pergunta se você quer continuar, finalizar (se tudo foi feito) ou descartar.

## Demonstrações dos exercícios
Em vez de GIFs de terceiros (licenças incertas e, na maioria, de pessoas reais), as demonstrações são
**ilustrações vetoriais animadas próprias** (bonecos gerados por ângulos, com o músculo trabalhado destacado), com
início/fim do movimento. Nunca quebram, funcionam offline e correspondem ao exercício. Exercícios
personalizados sem animação mostram as instruções (ou uma demonstração que você escolher explicitamente).
O motor está em `src/lib/pose.ts`; as poses em `src/data/poses.ts`; o conteúdo em `src/data/library.ts`.

## Testes
`npm test` cobre, com um Supabase simulado, os cenários: retomar treino após fechar/atualizar; séries/cargas
mantidas; cronômetro com pausa; alterar planejamento sem mexer no histórico; comparação de cargas;
treino completo offline e sincronização ao reconectar sem duplicar; resolução de conflitos.

## Limitações conhecidas
- Telas bloqueadas: o navegador pausa JavaScript, então o **aviso sonoro/vibração do fim do descanso** pode
  não tocar com a tela bloqueada (o tempo, porém, continua correto ao voltar). O app pede para manter a tela
  ligada durante o treino (Wake Lock) quando suportado.
- iOS: vibração não é suportada no Safari; notificações exigem o app instalado na Tela de Início (iOS 16.4+).
- A busca automática de transcrição depende da Edge Function acima e de o vídeo ter legendas.
- O app anterior (HTML puro) está preservado em `legacy/`.
