import { Module } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bootstrapMcp } from '../../../shared/bootstrap';

const NOME = 'produtos';
const URL_PRODUTOS = 'http://produtos:5000';
const mcp = new McpServer({ name: NOME, version: '1.0.0' });

const INFO = {
  nome: NOME,
  descrição: 'Serviço MCP com informações sobre o catálogo de produtos da Florart.',
  versão: '1.0.0',
};

async function acessar(url: string): Promise<string> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return await resposta.text();
  } catch (error) {
    return `Ocorreu um erro ao acessar ${url}: ${error instanceof Error ? error.message : 'erro desconhecido'}.`;
  }
}

mcp.tool('informacoes_produtos', 'Apresenta informações básicas sobre o serviço MCP de produtos.', async () => ({
  content: [{ type: 'text', text: JSON.stringify(INFO, null, 2) }],
}));

mcp.tool(
  'listar_produtos',
  'Apresenta o catálogo de produtos, com filtros opcionais por nome e categoria.',
  {
    nome: z.string().optional().describe('Trecho do nome do produto.'),
    categoria: z.string().optional().describe('Nome da categoria.'),
  },
  async ({ nome, categoria }) => {
    const parametros = new URLSearchParams();
    if (nome) parametros.set('q', nome);
    if (categoria) parametros.set('categoria', categoria);
    const sufixo = parametros.size ? `?${parametros}` : '';
    return { content: [{ type: 'text', text: await acessar(`${URL_PRODUTOS}/produtos${sufixo}`) }] };
  },
);

mcp.tool(
  'detalhar_produto',
  'Procura os detalhes de um produto pelo ID, incluindo categoria e estoque atual.',
  { id: z.number().describe('ID do produto.') },
  async ({ id }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_PRODUTOS}/produtos/${id}`) }],
  }),
);

mcp.tool('listar_categorias', 'Apresenta as categorias de produtos disponíveis no catálogo.', async () => ({
  content: [{ type: 'text', text: await acessar(`${URL_PRODUTOS}/categorias`) }],
}));

@Module({})
class ProdutosMcpModule {}

void bootstrapMcp(ProdutosMcpModule, mcp, 8000);
