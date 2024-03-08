import "reflect-metadata"
import { DataSource } from "typeorm"
import * as dotenvx from '@dotenvx/dotenvx'

import { Address, Domain, Text } from "../entities"

dotenvx.config()

// to initialize the initial connection with the database, register all entities
// and "synchronize" database schema, call "initialize()" method of a newly created database
// once in your application bootstrap
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [Address, Domain, Text],
  synchronize: true,
  logging: false,
})


