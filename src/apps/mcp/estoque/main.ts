import { Module } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bootstrapMcp } from '../../../shared/bootstrap';

const NOME = 'estoque';
const URL_ESTOQUE = 'http://estoque:5000';
const mcp = new McpServer({ name: NOME, version: '1.0.0' });

const INFO = {
  nome: NOME,
  descrição: 'Serviço MCP com informações sobre o estoque de produtos da Florart.',
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

mcp.tool('informacoes_estoque', 'Apresenta informações básicas sobre o serviço MCP de estoque.', async () => ({
  content: [{ type: 'text', text: JSON.stringify(INFO, null, 2) }],
}));

mcp.tool('listar_estoque', 'Apresenta a situação de estoque de todos os produtos.', async () => ({
  content: [{ type: 'text', text: await acessar(`${URL_ESTOQUE}/estoque`) }],
}));

mcp.tool(
  'estoque_por_produto',
  'Procura o estoque de um produto identificado pelo ID.',
  { produtoId: z.number().describe('ID do produto.') },
  async ({ produtoId }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_ESTOQUE}/estoque/produto/${produtoId}`) }],
  }),
);

mcp.tool(
  'estoque_baixo',
  'Apresenta produtos com estoque no mínimo, abaixo do mínimo ou dentro de uma margem.',
  { limite: z.number().optional().describe('Margem adicional acima do mínimo.') },
  async ({ limite }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_ESTOQUE}/estoque/baixo${limite ? `?limite=${limite}` : ''}`) }],
  }),
);

mcp.tool('itens_criticos', 'Apresenta somente produtos abaixo do estoque mínimo.', async () => ({
  content: [{ type: 'text', text: await acessar(`${URL_ESTOQUE}/estoque/criticos`) }],
}));

@Module({})
class EstoqueMcpModule {}

void bootstrapMcp(EstoqueMcpModule, mcp, 8000);
