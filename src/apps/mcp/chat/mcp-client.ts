import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export type McpConnection = {
  nome: string;
  cliente: Client;
  transporte: StreamableHTTPClientTransport;
};

export type McpToolInfo = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  servico: McpConnection;
};

const endpoints = {
  pedidos: { url: 'http://localhost:8001/mcp', label: 'pedidos' },
  produtos: { url: 'http://localhost:8002/mcp', label: 'produtos' },
  estoque: { url: 'http://localhost:8003/mcp', label: 'estoque' },
  avaliacoes: { url: 'http://localhost:8004/mcp', label: 'avaliações' },
};

export async function conectarServicos(): Promise<McpConnection[]> {
  const conexoes: McpConnection[] = [];
  for (const endpoint of Object.values(endpoints)) {
    const cliente = new Client({ name: 'florart-bot', version: '1.0.0' });
    const transporte = new StreamableHTTPClientTransport(new URL(endpoint.url));
    await cliente.connect(transporte);
    conexoes.push({ nome: endpoint.label, cliente, transporte });
    console.log(`🌼  Conectado ao serviço MCP de ${endpoint.label}.`);
  }
  return conexoes;
}

export async function descobrirFerramentas(conexoes: McpConnection[]): Promise<McpToolInfo[]> {
  const ferramentas: McpToolInfo[] = [];
  for (const servico of conexoes) {
    const resultado = await servico.cliente.listTools();
    for (const ferramenta of resultado.tools) {
      ferramentas.push({
        name: ferramenta.name,
        description: ferramenta.description ?? '',
        inputSchema: ferramenta.inputSchema as Record<string, unknown>,
        servico,
      });
    }
  }
  return ferramentas;
}

export async function executarFerramenta(
  ferramenta: McpToolInfo,
  argumentos: Record<string, unknown>,
): Promise<string> {
  console.log(`🤖  Consultando ${ferramenta.name} no serviço MCP de ${ferramenta.servico.nome}.`);
  const resultado = (await ferramenta.servico.cliente.callTool({
    name: ferramenta.name,
    arguments: argumentos,
  })) as { content: Array<{ type: string; text?: string }> };
  return resultado.content
    .map((conteudo) => conteudo.text ?? JSON.stringify(conteudo))
    .join('\n');
}

export async function fecharServicos(conexoes: McpConnection[]): Promise<void> {
  await Promise.all(conexoes.map(({ cliente }) => cliente.close()));
}
