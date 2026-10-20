# Supabase configurado

Em 20/10/2026, a migração inicial `20261020000100_initial.sql` foi aplicada pelo SQL Editor, em uma transação, ao projeto `csutils` no plano Free.

- Project ref: `mjgjfqmhzmdmatruslyu`
- URL da API: `https://mjgjfqmhzmdmatruslyu.supabase.co`
- Painel: https://supabase.com/dashboard/project/mjgjfqmhzmdmatruslyu
- Tabelas: `profiles`, `utilities`, `utility_favorites`, todas com RLS ativo.
- 10 políticas: 7 nas tabelas e 3 no Storage.
- Trigger: `on_auth_user_created`, para criar o perfil após cadastro no Auth.
- Bucket: `utility-images`, público, até 5 MB por arquivo, PNG/JPEG/WebP.

A presença das tabelas, das políticas, do trigger e das configurações do bucket foi verificada no banco remoto e no painel de Storage. O frontend local foi conectado ao projeto por `.env.local`, usando somente a chave publishable existente. A configuração está ignorada pelo Git. A leitura pública de utilitárias com a relação de autores, o bloqueio de leitura anônima de favoritos e a disponibilidade do Auth por e-mail foram verificados contra o Supabase real. A tela de utilitárias local carregou sem erro de conexão.

Não reaplique a migração inicial: as tabelas já existem. Como a aplicação foi feita no SQL Editor, ela não registra automaticamente o histórico da CLI. Ao adotar a CLI neste projeto, sincronize o histórico da migração já aplicada antes de executar `supabase db push`.

Nenhum dado do SQLite foi importado. As contas e imagens da aplicação ainda devem ser criadas/importadas conforme o README. Senha do banco, tokens administrativos e outras credenciais não estão armazenados neste documento.

## Retorno de autenticação local

Configurado no painel com autorização do usuário:

- Site URL: `http://localhost:4200`
- Redirect URLs: `http://localhost:4200/login` e `http://127.0.0.1:4200/login`

Execute `npm run check:connection` para repetir as verificações remotas sem criar usuários ou alterar dados. Cadastro/login com uma conta real e upload de screenshots ainda precisam ser validados. O domínio da Vercel deve ser adicionado quando o frontend for publicado.
