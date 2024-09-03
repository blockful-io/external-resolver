import path from 'path'
import 'reflect-metadata'
import { DataSource } from 'typeorm'

// to initialize the initial connection with the database, register all entities
export function NewDataSource(
  dbUrl: string,
  synchronize: boolean = false,
  debug: boolean = false,
): DataSource {
  return new DataSource({
    type: 'postgres',
    url: dbUrl,
    synchronize,
    logging: debug,
    entities: [path.resolve(__dirname, '..', 'entities/*.ts')],
    migrations: [path.resolve(__dirname, 'migrations/*.ts')],
    migrationsRun: true,
  })
}
