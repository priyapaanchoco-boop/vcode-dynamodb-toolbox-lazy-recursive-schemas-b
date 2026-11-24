import type { ItemSchema } from '~/schema/index.js'
import { SchemaAction } from '~/schema/index.js'

import { createSchemaDTOContext } from './getSchemaDTO/context.js'
import { getSchemaDTO } from './getSchemaDTO/index.js'
import type { ItemSchemaDTO } from './types.js'

export class SchemaDTO<SCHEMA extends ItemSchema = ItemSchema>
  extends SchemaAction<SCHEMA>
  implements ItemSchemaDTO
{
  static override actionName = 'dto' as const

  type: ItemSchemaDTO['type']
  attributes: ItemSchemaDTO['attributes']
  $schemaDefs?: ItemSchemaDTO['$schemaDefs']

  constructor(schema: SCHEMA) {
    super(schema)
    this.type = 'item'
    const context = createSchemaDTOContext()
    this.attributes = Object.fromEntries(
      Object.entries(this.schema.attributes).map(([attributeName, attribute]) => [
        attributeName,
        getSchemaDTO(attribute, context)
      ])
    ) as ItemSchemaDTO['attributes']
    if (Object.keys(context.definitions).length > 0) this.$schemaDefs = context.definitions
  }

  toJSON(): ItemSchemaDTO {
    return {
      type: this.type,
      attributes: this.attributes,
      ...(this.$schemaDefs !== undefined ? { $schemaDefs: this.$schemaDefs } : {})
    }
  }
}
