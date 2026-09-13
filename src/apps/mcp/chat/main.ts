import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  conectarServicos,
  descobrirFerramentas,
  executarFerramenta,
  fecharServicos,
  McpToolInfo,
} from './mcp-client';

const systemPrompt = `Você é um assistente administrativo de uma floricultura chamada Florart. O seu nome é FlorartBot.

Quando o usuário fizer uma saudação ou iniciar uma conversa, identifique-se pelo seu nome e informe que não é uma pessoa real, mas um assistente virtual.

Quando o usuário solicitar informações sobre pedidos, produtos, estoque ou avaliações de produtos, use as ferramentas MCP disponíveis para obter as informações. Identifique quando mais de uma ferramenta for necessária. Obedeça estas regras:
- Para informações sobre pedidos, use as ferramentas de pedidos;
- Para informações sobre produtos ou categorias, use as ferramentas de produtos;
- Para informações sobre estoque, use as ferramentas de estoque;
- Para informações sobre avaliações, use as ferramentas de avaliações;
- Se a pergunta não estiver relacionada a esses domínios, informe que não está capacitado para responder e oriente o usuário a procurar o setor responsável.`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function openAiTools(tools: McpToolInfo[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

function geminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(geminiSchema);
  }
  if (!schema || typeof schema !== 'object') return schema;

  return Object.fromEntries(
    Object.entries(schema as Record<string, unknown>)
      .filter(([key]) => key !== '$schema' && key !== 'additionalProperties')
      .map(([key, value]) => [key, geminiSchema(value)]),
  );
}

function geminiTools(tools: McpToolInfo[]): any {
  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: geminiSchema(tool.inputSchema) as Record<string, unknown>,
      })),
    },
  ];
}

function mostrarAbertura(provider: string, totalTools: number): void {
  const provedor = provider === 'google' ? 'Gemini' : 'OpenAI';
  console.log([
    '',
    '╭────────────────────────────────────────────────────────────╮',
    '│ 🌷  FlorartBot                                               │',
    '│ Assistente virtual da Florart — não sou uma pessoa real.     │',
    '│ Posso consultar pedidos, produtos, estoque e avaliações.    │',
    `│ ${totalTools} ferramentas MCP conectadas via ${provedor}.                         │`,
    '│ Digite sua pergunta ou "sair" para encerrar.                 │',
    '╰────────────────────────────────────────────────────────────╯',
  ].join('\n'));
}

async function askOpenAi(question: string, tools: McpToolInfo[]): Promise<string> {
  const client = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ];

  for (let step = 0; step < 6; step += 1) {
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools: openAiTools(tools),
      tool_choice: 'auto',
    });
    const message = completion.choices[0]?.message;
    if (!message) return 'Não consegui gerar uma resposta.';
    messages.push(message);
    if (!message.tool_calls?.length) return message.content ?? 'Resposta sem conteúdo.';
    for (const toolCall of message.tool_calls) {
      const tool = tools.find((item) => item.name === toolCall.function.name);
      if (!tool) continue;
      const args = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
      const result = await executarFerramenta(tool, args);
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    }
  }
  return 'A consulta exigiu muitas chamadas de ferramentas. Refine a pergunta e tente novamente.';
}

async function askGoogle(question: string, tools: McpToolInfo[]): Promise<string> {
  const genAI = new GoogleGenerativeAI(requireEnv('GOOGLE_API_KEY'));
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_MODEL ?? 'gemini-3.5-flash-lite',
    tools: geminiTools(tools),
    systemInstruction: systemPrompt,
  });
  const history: any[] = [{ role: 'user', parts: [{ text: question }] }];
  let result = await model.generateContent({ contents: history });

  for (let step = 0; step < 6; step += 1) {
    const calls = result.response.functionCalls();
    if (!calls?.length) return result.response.text();
    const content = result.response.candidates?.[0]?.content;
    if (!content) return 'Não consegui obter o retorno da IA após consultar as ferramentas.';

    history.push(content);
    const parts = [];
    for (const fn of calls) {
      const tool = tools.find((item) => item.name === fn.name);
      if (!tool) continue;
      const data = await executarFerramenta(tool, (fn.args ?? {}) as Record<string, unknown>);
      parts.push({ functionResponse: { name: fn.name, response: { result: data } } });
    }
    history.push({ role: 'user', parts });
    result = await model.generateContent({ contents: history });
  }
  return 'A consulta exigiu muitas chamadas de ferramentas. Refine a pergunta e tente novamente.';
}

async function main() {
  const provider = requireEnv('AI_PROVIDER');
  if (!['google', 'openai'].includes(provider)) {
    throw new Error('AI_PROVIDER deve ser google ou openai.');
  }
  const servicos = await conectarServicos();
  try {
    const tools = await descobrirFerramentas(servicos);
    const rl = readline.createInterface({ input, output });
    mostrarAbertura(provider, tools.length);
    while (true) {
      const question = await rl.question('\n👤  Você: ');
      if (['sair', 'exit', 'quit'].includes(question.trim().toLowerCase())) break;
      if (!question.trim()) continue;
      try {
        const answer = provider === 'google' ? await askGoogle(question, tools) : await askOpenAi(question, tools);
        console.log(`\n🤖  FlorartBot: ${answer}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido.';
        console.log(`\n⚠️  FlorartBot não conseguiu concluir a consulta: ${message}`);
      }
    }
    rl.close();
  } finally {
    await fecharServicos(servicos);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
