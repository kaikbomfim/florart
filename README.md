# Florart

Florart é uma solução NestJS para gestão de floricultura. As quatro APIs REST — pedidos, produtos, estoque e avaliações — alimentam o Dashboard e são disponibilizadas para IA pelos quatro serviços MCP. Todas as operações são de consulta.

## 🚀 Configuração e execução

Execute os comandos a seguir na pasta do projeto:

```bash
cd florart
```

### 1. Pré-requisitos e pnpm

Instale Docker com Docker Compose e Node.js **22.13 ou superior**. As portas `7001`–`7005`, `8001`–`8004` e `8080` devem estar livres.

O projeto usa pnpm `11.x`. Para instalá-lo usando o Corepack, execute:

```bash
corepack enable
corepack install
```

Se o PowerShell informar que `corepack` não é reconhecido — algo esperado no Node 25 ou superior — instale o Corepack uma vez e execute a sequência anterior:

```bash
npm install --global corepack@latest
corepack enable
corepack install
```

Se `corepack` ainda não for reconhecido, abra outro PowerShell, execute novamente `nvm use <versão>` e repita os comandos.

### 2. Configurar o chat

Crie `.env` a partir do modelo e informe a chave do provedor escolhido.

```bash
# Linux, macOS ou Git Bash
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

| Provedor | Configuração necessária                 |
| -------- | --------------------------------------- |
| Gemini   | `AI_PROVIDER=google` e `GOOGLE_API_KEY` |
| OpenAI   | `AI_PROVIDER=openai` e `OPENAI_API_KEY` |

Os modelos podem ser alterados em `GOOGLE_MODEL` ou `OPENAI_MODEL`. A chave do outro provedor não é necessária.

### 3. Subir os módulos

Crie a rede compartilhada uma única vez e suba os serviços em dois terminais:

```bash
docker network create rede-florart
docker compose -f src/apps/servicos/docker-compose.yml up -d --build
```

```bash
docker compose -f src/apps/mcp/docker-compose.yml up -d --build
```

O primeiro comando sobe PostgreSQL, APIs REST e Dashboard. Abra o Dashboard em [http://localhost:8080](http://localhost:8080). O segundo sobe os MCPs.

### 4. Iniciar o FlorartBot

Com os MCPs em execução:

```bash
pnpm install --frozen-lockfile --ignore-scripts # somente no primeiro uso ou após mudar o lockfile
pnpm chat
```

Se `node_modules` já existir e o `pnpm-lock.yaml` não mudou, basta `pnpm chat`. Não use `npm install` dentro do projeto: ele usa pnpm.

Perguntas para experimentar:

- “Quais pedidos estão em preparo?”
- “Quais itens precisam de reposição?”
- “Quais produtos são mais bem avaliados?”
- “Qual é o preço, o estoque e a média de avaliações do Buquê Aurora?”

### 5. Inspecionar os MCPs

Execute `npx @modelcontextprotocol/inspector`. Clique no link com token que o terminal exibir; no Inspector, selecione **Streamable HTTP** e use o endereço desejado:

| MCP        | Endereço                    |
| ---------- | --------------------------- |
| Pedidos    | `http://localhost:8001/mcp` |
| Produtos   | `http://localhost:8002/mcp` |
| Estoque    | `http://localhost:8003/mcp` |
| Avaliações | `http://localhost:8004/mcp` |

## 🧩 Serviços e acessos

| Domínio    | API REST                | MCP                         |
| ---------- | ----------------------- | --------------------------- |
| Pedidos    | `http://localhost:7001` | `http://localhost:8001/mcp` |
| Produtos   | `http://localhost:7002` | `http://localhost:8002/mcp` |
| Estoque    | `http://localhost:7003` | `http://localhost:8003/mcp` |
| Avaliações | `http://localhost:7004` | `http://localhost:8004/mcp` |
| PostgreSQL | `localhost:7005`        | —                           |
| Dashboard  | `http://localhost:8080` | —                           |

Cada MCP usa `McpServer` com Streamable HTTP e consulta exclusivamente a API REST do seu domínio. O Dashboard consulta as quatro APIs separadamente a cada dez segundos; se uma API parar, somente o painel correspondente fica indisponível e se recupera na próxima consulta bem-sucedida.

## Rotas REST principais

| Domínio    | Consultas                                                    |
| ---------- | ------------------------------------------------------------ |
| Pedidos    | `/pedidos`, `/pedidos/status/novo`, `/pedidos/1`             |
| Produtos   | `/produtos`, `/produtos?q=orquídea`, `/produtos/1`           |
| Estoque    | `/estoque`, `/estoque/baixo`, `/estoque/produto/2`           |
| Avaliações | `/avaliacoes`, `/avaliacoes/resumo`, `/avaliacoes/produto/1` |

Acrescente a URL da API da tabela anterior a cada rota, por exemplo: `http://localhost:7001/pedidos`.

## Verificação rápida

1. Abra o Dashboard e consulte ao menos duas rotas de cada API.
2. No Inspector, conecte-se aos quatro MCPs e execute duas tools de cada um.
3. Para demonstrar a resiliência, execute `docker compose -f src/apps/servicos/docker-compose.yml stop estoque`; os demais painéis permanecem ativos. Reinicie-o com `start estoque` e aguarde a atualização do Dashboard.
4. Rode o FlorartBot com Gemini ou OpenAI e faça uma pergunta que combine domínios.
