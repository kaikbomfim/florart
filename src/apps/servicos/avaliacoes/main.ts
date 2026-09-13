import { BadRequestException, Controller, Get, Module, Param } from '@nestjs/common';
import { bootstrapApi } from '../../../shared/bootstrap';
import { DatabaseService, intParam } from '../../../shared/database';

@Controller()
class AvaliacoesController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  informacoes() {
    return { descrição: 'Serviço de gerenciamento de avaliações de produtos da Florart.', versão: '1.0.0' };
  }

  @Get('avaliacoes')
  listar() {
    return this.db.query(
      `SELECT a.id, p.id AS produto_id, p.nome AS produto, c.nome AS cliente,
              a.nota, a.comentario, a.criado_em
       FROM avaliacoes a
       JOIN produtos p ON p.id = a.produto_id
       JOIN clientes c ON c.id = a.cliente_id
       ORDER BY a.criado_em DESC`,
    );
  }

  @Get('avaliacoes/resumo')
  resumo() {
    return this.db.query(
      `SELECT p.id AS produto_id, p.nome AS produto,
              COUNT(a.id)::int AS total_avaliacoes,
              ROUND(AVG(a.nota), 2)::float AS media,
              MIN(a.nota)::int AS menor_nota,
              MAX(a.nota)::int AS maior_nota
       FROM produtos p
       LEFT JOIN avaliacoes a ON a.produto_id = p.id
       GROUP BY p.id, p.nome
       ORDER BY media DESC NULLS LAST, total_avaliacoes DESC`,
    );
  }

  @Get('avaliacoes/produto/:produtoId')
  async porProduto(@Param('produtoId') produtoId: string) {
    try {
      const id = intParam(produtoId);
      return this.db.query(
        `SELECT a.id, p.id AS produto_id, p.nome AS produto, c.nome AS cliente,
                a.nota, a.comentario, a.criado_em
         FROM avaliacoes a
         JOIN produtos p ON p.id = a.produto_id
         JOIN clientes c ON c.id = a.cliente_id
         WHERE p.id = $1
         ORDER BY a.criado_em DESC`,
        [id],
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Parâmetro inválido.');
    }
  }

  @Get('avaliacoes/:id')
  async detalhe(@Param('id') id: string) {
    try {
      const avaliacaoId = intParam(id);
      const rows = await this.db.query(
        `SELECT a.id, p.id AS produto_id, p.nome AS produto, c.nome AS cliente,
                a.nota, a.comentario, a.criado_em
         FROM avaliacoes a
         JOIN produtos p ON p.id = a.produto_id
         JOIN clientes c ON c.id = a.cliente_id
         WHERE a.id = $1`,
        [avaliacaoId],
      );
      return rows[0] ?? { mensagem: 'Avaliação não encontrada.' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Parâmetro inválido.');
    }
  }
}

@Module({ controllers: [AvaliacoesController], providers: [DatabaseService] })
class AvaliacoesModule {}

void bootstrapApi(AvaliacoesModule, 5000);
