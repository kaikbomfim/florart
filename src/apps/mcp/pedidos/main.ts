import { Module } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { bootstrapMcp } from '../../../shared/bootstrap';

const NOME = 'pedidos';
const URL_PEDIDOS = 'http://pedidos:5000';
const mcp = new McpServer({ name: NOME, version: '1.0.0' });

const INFO = {
  nome: NOME,
  descrição: 'Serviço MCP com informações sobre pedidos de clientes da Florart.',
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

mcp.tool('informacoes_pedidos', 'Apresenta informações básicas sobre o serviço MCP de pedidos.', async () => ({
  content: [{ type: 'text', text: JSON.stringify(INFO, null, 2) }],
}));

mcp.tool(
  'listar_pedidos',
  'Apresenta pedidos da Florart e aceita filtro opcional por status.',
  { status: z.string().optional().describe('novo, em_preparo, saiu_para_entrega, entregue ou cancelado.') },
  async ({ status }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_PEDIDOS}/pedidos${status ? `?status=${encodeURIComponent(status)}` : ''}`) }],
  }),
);

mcp.tool(
  'detalhar_pedido',
  'Procura um pedido pelo ID e apresenta cliente, entrega e itens.',
  { id: z.number().describe('ID do pedido.') },
  async ({ id }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_PEDIDOS}/pedidos/${id}`) }],
  }),
);

mcp.tool(
  'pedidos_por_status',
  'Procura pedidos identificados por status operacional.',
  { status: z.string().describe('Status operacional do pedido.') },
  async ({ status }) => ({
    content: [{ type: 'text', text: await acessar(`${URL_PEDIDOS}/pedidos/status/${encodeURIComponent(status)}`) }],
  }),
);

@Module({})
class PedidosMcpModule {}

void bootstrapMcp(PedidosMcpModule, mcp, 8000);
