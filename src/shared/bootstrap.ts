import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

type NestRequest = { body: unknown };

export async function bootstrapApi(module: unknown, defaultPort: number): Promise<void> {
  const app = await NestFactory.create(module as never, { cors: true });
  app.enableCors();
  const port = Number(process.env.PORT ?? defaultPort);
  await app.listen(port, '0.0.0.0');
}

export async function bootstrapMcp(
  module: unknown,
  server: McpServer,
  defaultPort: number,
): Promise<void> {
  const app = await NestFactory.create(module as never, { cors: true });
  app.enableCors();
  const http = app.getHttpAdapter().getInstance();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await server.connect(transport);
  http.post('/mcp', (request: NestRequest, response: unknown) =>
    transport.handleRequest(request as never, response as never, request.body as never),
  );
  http.get('/mcp', (request: unknown, response: unknown) =>
    transport.handleRequest(request as never, response as never),
  );
  http.delete('/mcp', (request: unknown, response: unknown) =>
    transport.handleRequest(request as never, response as never),
  );

  const port = Number(process.env.PORT ?? defaultPort);
  await app.listen(port, '0.0.0.0');
}
