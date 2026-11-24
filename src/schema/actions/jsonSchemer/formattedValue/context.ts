import type { Schema } from '~/schema/index.js'

export interface JSONSchemaContext {
  ids: Map<Schema, string>
  definitions: Record<string, unknown>
}
