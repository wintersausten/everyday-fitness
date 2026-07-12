import 'fake-indexeddb/auto'
import { beforeEach } from 'vitest'
import { db } from '../src/db/db.ts'

// Each test starts from an empty database.
beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})
