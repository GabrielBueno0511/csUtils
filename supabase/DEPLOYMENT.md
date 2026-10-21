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

## Administração de usuários

A migração `20261021000100_admin_user_management.sql` adiciona os papéis `admin` e `user`, promove as contas que já existem e deixa novos cadastros como `user`. Ela também cria RPCs protegidas para listar dados das contas e alterar papéis. A listagem não retorna hashes de senha; metadados removem os campos `password` e `encrypted_password`.

Essa migração foi aplicada manualmente no SQL Editor do projeto Supabase em 21/10/2026; a consulta de verificação confirmou três contas existentes como `admin`. Em outros ambientes, aplique o arquivo uma vez antes de publicar o frontend. Como as migrações foram aplicadas pelo SQL Editor, sincronize o histórico de ambas antes de executar `supabase db push`. A tela `/admin/users` exige papel admin, e a autorização também é verificada pelas RPCs no banco. A página mostra nome, e-mail, telefone quando disponível, confirmação, datas de criação/atualização/último acesso, metadados, papel e número de utilitárias criadas.

## Catálogo de spots administrável

A migração `20261022000100_admin_spot_catalog.sql` foi aplicada no projeto Supabase conectado em 21/10/2026. Ela cria o catálogo compartilhado de spots adicionais e alterações dos spots existentes, além do bucket público `map-spot-images`. A consulta de verificação confirmou a tabela, o bucket e as três políticas do Storage. Todos podem consultar o catálogo e visualizar as imagens; somente admins podem incluir ou editar spots e enviar/remover imagens, com validação no banco e no Storage. A tela `/admin/spots` permite escolher o mapa, criar spots e editar o nome/imagem de spots existentes ou novos. As alterações ficam disponíveis a todos nos mapas e nas opções de criação de utilitárias. Aplique essa migração uma vez nos outros projetos Supabase antes de publicar neles.
