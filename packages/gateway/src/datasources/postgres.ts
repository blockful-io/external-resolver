import path from 'path'
import 'reflect-metadata'
import { DataSource } from 'typeorm'

import * as entities from '../entities'

// to initialize the initial connection with the database, register all entities
export function NewDataSource(
  dbUrl: string,
  options?: {
    synchronize?: boolean
    debug?: boolean
  },
): DataSource {
  return new DataSource({
    type: 'postgres',
    url: dbUrl,
    logging: options?.debug,
    entities,
    migrations: [path.resolve(__dirname, 'migrations/*.ts')],
    migrationsRun:
      options?.synchronize !== undefined ? options.synchronize : true,
  })
}
