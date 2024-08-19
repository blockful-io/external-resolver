import { config } from 'dotenv'

import { NewDataSource } from './postgres'

config({
  path: process.env.ENV_FILE,
})

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  throw new Error('DATABASE_URL is not set')
}
const datasource = NewDataSource(dbUrl)
datasource.initialize()
export default datasource
