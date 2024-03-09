/**
 * Script for running the server locally exposing the API on port 3001
 */
import { server } from './server'

const app = server.makeApp('/')

app.listen(3001, () => {
  console.log(`Gateway is running!`)
})
