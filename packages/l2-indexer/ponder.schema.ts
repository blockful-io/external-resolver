import { createSchema } from '@ponder/core'

export default createSchema((p) => ({
  domain: p.createTable({
    id: p.string(),
    node: p.string(),
    name: p.string(),
    parent: p.string(),
    owner: p.string(),
    contenthash: p.string().optional(),
    ttl: p.string().optional(),
    resolver: p.string(),
    resolverVersion: p.string().optional(),
    createdAt: p.string().optional(),
    updatedAt: p.string().optional(),
  }),

  text: p.createTable({
    id: p.string(),
    key: p.string(),
    value: p.string(),
    domain: p.string(),
    resolver: p.string().optional(),
    resolverVersion: p.string().optional(),
    createdAt: p.string().optional(),
    updatedAt: p.string().optional(),
  }),

  address: p.createTable({
    id: p.string(),
    address: p.string(),
    coin: p.string(),
    domain: p.string(),
    resolver: p.string().optional(),
    resolverVersion: p.string().optional(),
    createdAt: p.string().optional(),
    updatedAt: p.string().optional(),
  }),
}))
