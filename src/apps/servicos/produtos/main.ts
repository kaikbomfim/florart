import { BadRequestException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { bootstrapApi } from '../../../shared/bootstrap';
import { DatabaseService, intParam } from '../../../shared/database';

@Controller()
class ProdutosController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  informacoes() {
    return { descrição: 'Serviço de gerenciamento de produtos da Florart.', versão: '1.0.0' };
  }

  @Get('produtos')
  async listar(@Query('q') q?: string, @Query('categoria') categoria?: string) {
    const params: unknown[] = [];
    const filters = ['p.ativo = TRUE'];
    if (q) {
      params.push(`%${q}%`);
      filters.push(`p.nome ILIKE $${params.length}`);
    }
    if (categoria) {
      params.push(categoria);
      filters.push(`c.nome ILIKE $${params.length}`);
    }
    return this.db.query(
      `SELECT p.id, p.nome, p.descricao, p.preco::float, c.nome AS categoria
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE ${filters.join(' AND ')}
       ORDER BY p.nome`,
      params,
    );
  }

  @Get('produtos/:id')
  async detalhe(@Param('id') id: string) {
    try {
      const produtoId = intParam(id);
      const rows = await this.db.query(
        `SELECT p.id, p.nome, p.descricao, p.preco::float, p.ativo, c.nome AS categoria,
                e.quantidade, e.minimo, e.localizacao
         FROM produtos p
         JOIN categorias c ON c.id = p.categoria_id
         LEFT JOIN estoque e ON e.produto_id = p.id
         WHERE p.id = $1`,
        [produtoId],
      );
      return rows[0] ?? { mensagem: 'Produto não encontrado.' };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Parâmetro inválido.');
    }
  }

  @Get('categorias')
  categorias() {
    return this.db.query('SELECT id, nome FROM categorias ORDER BY nome');
  }
}

@Module({ controllers: [ProdutosController], providers: [DatabaseService] })
class ProdutosModule {}

void bootstrapApi(ProdutosModule, 5000);
