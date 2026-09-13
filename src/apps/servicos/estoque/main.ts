import { BadRequestException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { bootstrapApi } from '../../../shared/bootstrap';
import { DatabaseService, intParam } from '../../../shared/database';

@Controller()
class EstoqueController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  informacoes() {
    return { descrição: 'Serviço de gerenciamento de estoque da Florart.', versão: '1.0.0' };
  }

  @Get('estoque')
  listar() {
    return this.db.query(
      `SELECT e.id, p.id AS produto_id, p.nome AS produto, c.nome AS categoria,
              e.quantidade, e.minimo, e.localizacao, e.atualizado_em,
              CASE WHEN e.quantidade < e.minimo THEN 'baixo'
                   WHEN e.quantidade = e.minimo THEN 'atencao'
                   ELSE 'ok' END AS situacao
       FROM estoque e
       JOIN produtos p ON p.id = e.produto_id
       JOIN categorias c ON c.id = p.categoria_id
       ORDER BY e.quantidade - e.minimo ASC, p.nome`,
    );
  }

  @Get('estoque/baixo')
  async baixo(@Query('limite') limite?: string) {
    const margem = limite ? intParam(limite) : 0;
    return this.db.query(
      `SELECT e.id, p.id AS produto_id, p.nome AS produto, e.quantidade, e.minimo, e.localizacao,
              (e.minimo - e.quantidade)::int AS deficit
       FROM estoque e
       JOIN produtos p ON p.id = e.produto_id
       WHERE e.quantidade <= e.minimo + $1
       ORDER BY deficit DESC, p.nome`,
      [margem],
    );
  }

  @Get('estoque/criticos')
  criticos() {
    return this.db.query(
      `SELECT e.id, p.id AS produto_id, p.nome AS produto, e.quantidade, e.minimo, e.localizacao,
              ROUND((e.quantidade::numeric / NULLIF(e.minimo, 0)) * 100, 1)::float AS cobertura_percentual
       FROM estoque e
       JOIN produtos p ON p.id = e.produto_id
       WHERE e.quantidade < e.minimo
       ORDER BY cobertura_percentual ASC`,
    );
  }

  @Get('estoque/produto/:produtoId')
  async porProduto(@Param('produtoId') produtoId: string) {
    try {
      const id = intParam(produtoId);
      const rows = await this.db.query(
        `SELECT e.id, p.id AS produto_id, p.nome AS produto, e.quantidade, e.minimo, e.localizacao, e.atualizado_em
         FROM estoque e
         JOIN produtos p ON p.id = e.produto_id
         WHERE p.id = $1`,
        [id],
      );
      return rows[0] ?? { mensagem: 'Estoque do produto não encontrado.' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Parâmetro inválido.');
    }
  }
}

@Module({ controllers: [EstoqueController], providers: [DatabaseService] })
class EstoqueModule {}

void bootstrapApi(EstoqueModule, 5000);
