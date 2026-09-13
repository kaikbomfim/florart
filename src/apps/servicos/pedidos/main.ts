import { BadRequestException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { bootstrapApi } from '../../../shared/bootstrap';
import { DatabaseService, intParam } from '../../../shared/database';

@Controller()
class PedidosController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  informacoes() {
    return { descrição: 'Serviço de gerenciamento de pedidos da Florart.', versão: '1.0.0' };
  }

  @Get('pedidos')
  async listar(@Query('status') status?: string) {
    const params: unknown[] = [];
    const filters: string[] = [];
    if (status) {
      params.push(status);
      filters.push(`p.status = $${params.length}`);
    }
    return this.db.query(
      `SELECT p.id, p.status, p.canal, p.entrega_em, p.criado_em,
              c.nome AS cliente, c.cidade,
              SUM(pi.quantidade * pi.preco_unitario)::float AS total,
              COUNT(pi.id)::int AS itens
       FROM pedidos p
       JOIN clientes c ON c.id = p.cliente_id
       JOIN pedido_itens pi ON pi.pedido_id = p.id
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       GROUP BY p.id, c.nome, c.cidade
       ORDER BY p.criado_em DESC`,
      params,
    );
  }

  @Get('pedidos/status/:status')
  porStatus(@Param('status') status: string) {
    return this.listar(status);
  }

  @Get('pedidos/:id')
  async detalhe(@Param('id') id: string) {
    try {
      const pedidoId = intParam(id);
      const pedidos = await this.db.query(
        `SELECT p.id, p.status, p.canal, p.entrega_em, p.criado_em,
                c.nome AS cliente, c.telefone, c.cidade
         FROM pedidos p
         JOIN clientes c ON c.id = p.cliente_id
         WHERE p.id = $1`,
        [pedidoId],
      );
      if (!pedidos[0]) return { mensagem: 'Pedido não encontrado.' };
      const itens = await this.db.query(
        `SELECT pr.id AS produto_id, pr.nome, pi.quantidade, pi.preco_unitario::float,
                (pi.quantidade * pi.preco_unitario)::float AS subtotal
         FROM pedido_itens pi
         JOIN produtos pr ON pr.id = pi.produto_id
         WHERE pi.pedido_id = $1
         ORDER BY pr.nome`,
        [pedidoId],
      );
      return { ...pedidos[0], itens };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Parâmetro inválido.');
    }
  }
}

@Module({ controllers: [PedidosController], providers: [DatabaseService] })
class PedidosModule {}

void bootstrapApi(PedidosModule, 5000);
