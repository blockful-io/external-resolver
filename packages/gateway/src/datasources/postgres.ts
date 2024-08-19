import path from 'path'
import 'reflect-metadata'
import { DataSource } from 'typeorm'

// to initialize the initial connection with the database, register all entities
export function NewDataSource(
  dbUrl: string,
  synchronize: boolean = false,
): DataSource {
  return new DataSource({
    type: 'postgres',
    url: dbUrl,
    entities: [path.resolve(__dirname, '../entities/*.ts')],
    synchronize,
    logging: false,
    migrations: [path.resolve(__dirname, '../migrations/*.ts')],
  })
}
