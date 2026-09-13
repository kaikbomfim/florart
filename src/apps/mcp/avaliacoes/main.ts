import { Module } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bootstrapMcp } from '../../../shared/bootstrap';

const NOME = 'avaliacoes';
const URL_AVALIACOES = 'http://avaliacoes:5000';
const mcp = new McpServer({ name: NOME, version: '1.0.0' });

const INFO = {
  nome: 'avaliações',
  descrição: 'Serviço MCP com informações sobre avaliações de produtos da Florart.',
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

mcp.tool('informacoes_avaliacoes', 'Apresenta informações básicas sobre o serviço MCP de avaliações.', async () => ({
  content: [{ type: 'text', text: JSON.stringify(INFO, null, 2) }],
}));

mcp.tool('listar_avaliacoes', 'Apresenta avaliações recentes de produtos.', async () => ({
  content: [{ type: 'text', text: await acessar(`${URL_AVALIACOES}/avaliacoes`) }],
}));

mcp.tool('avaliacoes_por_produto', 'Apresenta o resumo das avaliações de todos os produtos.', async () => ({
  content: [{ type: 'text', text: await acessar(`${URL_AVALIACOES}/avaliacoes/resumo`) }],
}));

mcp.tool(
  'avaliacoes_por_id_produto',
  'Procura avaliações associadas a um produto identificado pelo ID.',
  { produtoId: z.number().describe('ID do produto.') },
  async ({ produtoId }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_AVALIACOES}/avaliacoes/produto/${produtoId}`) }],
  }),
);

mcp.tool(
  'detalhar_avaliacao',
  'Procura uma avaliação pelo ID.',
  { id: z.number().describe('ID da avaliação.') },
  async ({ id }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_AVALIACOES}/avaliacoes/${id}`) }],
  }),
);

@Module({})
class AvaliacoesMcpModule {}

void bootstrapMcp(AvaliacoesMcpModule, mcp, 8000);
