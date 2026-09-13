import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({
    host: 'dados',
    port: 5432,
    user: 'florart',
    password: 'florart',
    database: 'florart',
  });

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

export function intParam(value: string | undefined, fallback?: number): number {
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error('Parâmetro numérico obrigatório ausente.');
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Parâmetro numérico inválido: ${value}`);
  }
  return parsed;
}
