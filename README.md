# CS Utils

Angular para organizar utilitárias de Counter-Strike 2. Possui dois modos de backend:

| Modo | Login, utilitárias e favoritos | Imagens | Execução |
| --- | --- | --- | --- |
| `api` (padrão local) | API Python/Quart + SQLite existente | Banco local legado | `npm start` + Python |
| `supabase` | Supabase Auth + PostgreSQL com RLS | Supabase Storage | `npm start` ou Vercel |

O modo Supabase dispensa a API Python. O frontend é uma aplicação estática, com rotas tratadas pelo `vercel.json`. O banco SQLite e a API existentes foram preservados.

## Rodar com o backend Python existente

Requer Node.js 24 e Python 3.12. Na pasta deste README:

```bash
nvm use
npm ci
cp .env.example .env.local
npm start
```

Mantenha `APP_BACKEND=api`. Em outro terminal:

```bash
cd ../csutil-api/flask_project
source venv/bin/activate
python app.py
```

Abra `http://localhost:4200`. O proxy de desenvolvimento encaminha `/api` para `http://127.0.0.1:5001`. Se precisar recriar o venv, consulte `../ENVIRONMENT.md`.

## Rodar localmente com Supabase

Você pode usar um projeto Supabase remoto em desenvolvimento ou a stack inteiramente local.

### Usando seu projeto remoto

Crie o projeto e aplique a migração seguindo a seção de publicação abaixo. Depois crie `.env.local`:

```dotenv
APP_BACKEND=supabase
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

Execute `npm start`. Não precisa iniciar Python nem Docker. Os dados usados serão os do projeto Supabase informado.

### Stack Supabase no computador

Instale e inicie o Docker antes destes comandos. A CLI já é uma dependência de desenvolvimento:

```bash
npm run supabase:start
npm run supabase:status
```

A primeira inicialização aplica `supabase/migrations/20261020000100_initial.sql` e cria o bucket `utility-images`. Copie a URL da API e a chave pública mostradas pela CLI para `.env.local`:

```dotenv
APP_BACKEND=supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=CHAVE_ANON_MOSTRADA_PELA_CLI
```

Use `SUPABASE_PUBLISHABLE_KEY` se a CLI fornecer uma chave `sb_publishable_`; remova uma variável antiga antes de trocar, pois a publishable tem prioridade. Execute `npm start` e abra `http://localhost:4200`. A confirmação de e-mail está desativada somente na configuração da stack local. A senha mínima é 10 caracteres.

Para parar: `npm run supabase:stop`. A stack local guarda seus dados em volumes Docker. Evite comandos de reset se quiser preservar esses dados.

## Publicar no Supabase + Vercel

### 1. Criar o banco e o Storage

Use um projeto Supabase novo para evitar conflitos com tabelas preexistentes. Na pasta deste README:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npm run supabase:push
```

Alternativa: execute o conteúdo de `supabase/migrations/20261020000100_initial.sql` no SQL Editor do projeto **uma única vez**. A migração cria:

- `profiles`: nomes públicos dos autores; e-mails e senhas ficam no Supabase Auth.
- `utilities`: leitura pública, criação autenticada e exclusão apenas pelo autor.
- `utility_favorites`: leitura e alterações apenas pelo dono da conta.
- `utility-images`: bucket público para screenshots PNG, JPEG e WebP de até 5 MB por imagem; uploads e remoção ficam restritos ao dono. Não é permitido remover arquivos enquanto estiverem ligados a uma utilitária.

O bucket é público porque as utilitárias já são compartilhadas na aplicação. Ao excluir uma utilitária, a aplicação tenta remover suas imagens após excluir a linha. Uma falha de rede nessa limpeza pode deixar arquivos sem referência, mas não afeta os demais registros.

As políticas são a autorização efetiva; esconder um botão no Angular não concede nem remove permissões no banco.

### 2. Configurar autenticação

No painel Supabase, habilite o provedor Email e configure:

- **Site URL**: `https://SEU-SITE.vercel.app` (ou seu domínio).
- **Redirect URLs**: `https://SEU-SITE.vercel.app/login` e `http://localhost:4200/login`. Inclua `http://127.0.0.1:4200/login` se usar esse endereço local.
- Senha mínima: 10 caracteres, para corresponder ao formulário.
- Mantenha confirmação de e-mail habilitada em produção. O cadastro mostra a mensagem para confirmar; ele não assume que o usuário já está logado.
- Para envio de e-mails reais em produção, configure seu SMTP no Supabase e confira os limites do serviço. Mantenha o template padrão com `ConfirmationURL` ou ajuste seu template conforme a documentação de redirecionamentos.

Para testar previews da Vercel, autorize também os endereços de preview da sua equipe; não use um wildcard que autorize projetos de terceiros.

### 3. Publicar o frontend na Vercel

Importe o repositório do frontend na Vercel. Se o repositório contiver a pasta pai com a API, selecione **Root Directory: `csutils`**. Se o repositório já começar na pasta deste README, deixe a raiz padrão.

| Configuração | Valor |
| --- | --- |
| Framework | Angular |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist/csutils/browser` |

Configure estas variáveis no projeto Vercel, em Production e nas Previews que desejar usar:

```dotenv
APP_BACKEND=supabase
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

Também é aceita a chave JWT `anon` em `SUPABASE_ANON_KEY`, em projetos que ainda a utilizam. As chaves publishable/anon são públicas por definição; o acesso é protegido por RLS. **Nunca use `service_role`, `sb_secret_...` ou a senha do banco no frontend.** O script de configuração rejeita essas chaves e publica apenas os três valores necessários em `app-config.json`.

Use `npm run build`, que gera essa configuração antes do Angular. Um `ng build` direto não atualiza as variáveis. Após alterar uma variável no painel, faça um novo deploy. O `vercel.json` inclui o fallback das rotas para `index.html`, e `app-config.json` não recebe cache persistente.

Não há necessidade de configurar `API_URL`, executar a API Python ou cadastrar credenciais administrativas na Vercel.

### 4. Conferir a publicação

Abra um mapa e atualize a página diretamente na rota dele. Depois confira: cadastro, confirmação de e-mail, login, criação com duas imagens, favoritos e exclusão pelo autor. Em outra conta, confira que não é possível apagar a utilitária nem ver os favoritos da primeira conta.

## Dados já salvos no SQLite

Os dois modos usam bancos independentes. Trocar `APP_BACKEND` não transfere os dados. O arquivo `app.db` local não é modificado por esta adaptação.

Existe uma ferramenta administrativa opcional. Primeiro faça uma simulação, sem conectar ao Supabase:

```bash
npm run import:legacy -- --db ../csutil-api/flask_project/app.db
```

O script lê o SQLite em modo somente leitura. Para importar, crie um arquivo **local e ignorado pelo Git**, `.env.import`:

```dotenv
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_ADMINISTRATIVA
```

Em seguida, após aplicar a migração no Supabase:

```bash
node --env-file=.env.import scripts/import-legacy.mjs --db ../csutil-api/flask_project/app.db --apply
```

O script envia as imagens Base64 suportadas para o Storage e copia as utilitárias. Registros já importados são identificados por `legacy_id` e não são sobrescritos ao repetir. Imagens acima de 5 MB ou em formatos diferentes de PNG/JPEG/WebP precisam ser convertidas antes da importação. Não apaga os dados originais. Não importa registros de Overpass/Vertigo, que saíram do catálogo.

As senhas antigas não são compatíveis com o Supabase Auth e não são copiadas. Cadastre as contas novamente. Sem mapeamento, o nome antigo do autor é preservado para exibição, mas as utilitárias importadas ficam sem um proprietário autenticado e seus favoritos não são transferidos.

Para associar autores e favoritos, crie `users-map.json`, relacionando os IDs numéricos antigos aos UUIDs das novas contas Supabase, e informe `--users users-map.json` **na primeira importação**:

```json
{ "1": "UUID-DA-NOVA-CONTA-SUPABASE" }
```

```bash
node --env-file=.env.import scripts/import-legacy.mjs --db ../csutil-api/flask_project/app.db --users users-map.json --apply
```

O mapeamento é validado antes da importação. Depois de importar sem ele, uma nova execução não muda a autoria dos registros existentes. Revise também as calls antigas: a ferramenta preserva `spot_name`, e calls removidas/renomeadas precisam ser ajustadas para aparecer nas posições atuais. A chave administrativa é usada somente pelo script local; nunca pelo Angular.

## Testes

```bash
npm test -- --watch=false
npm run test:config
npm run test:db
npm run build
```

Com `APP_BACKEND=supabase` e as variáveis preenchidas, `npm run check:connection` testa a leitura pública, o bloqueio de favoritos anônimos e a disponibilidade do Auth no projeto configurado, sem criar usuários ou alterar dados.

`test:db` executa a migração e verifica RLS/grants em PostgreSQL embarcado, com stubs das funções e tabelas gerenciadas pelo Supabase. Não substitui o teste integrado contra Auth, PostgREST e Storage reais.

## Referências

- [CLI e desenvolvimento local](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage e permissões](https://supabase.com/docs/guides/storage/security/access-control)
- [URLs de autenticação](https://supabase.com/docs/guides/auth/redirect-urls)
- [Node.js na Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
