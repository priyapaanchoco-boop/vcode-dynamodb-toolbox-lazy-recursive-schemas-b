import type { Schema } from '~/schema/index.js'

import type { ISchemaDTO } from '../types.js'

export interface SchemaDTOContext {
  ids: Map<Schema, string>
  definitions: Record<string, ISchemaDTO>
}
export const createSchemaDTOContext = (): SchemaDTOContext => ({ ids: new Map(), definitions: {} })
