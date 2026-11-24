import type { ItemSchema } from '~/schema/item/index.js'

import type { ItemSchemaDTO } from '../types.js'
import type { SchemaDTOContext } from './context.js'
import { getSchemaDTO } from './schema.js'

export const getItemSchemaDTO = (
  schema: ItemSchema,
  context?: SchemaDTOContext
): ItemSchemaDTO => ({
  type: 'item',
  attributes: Object.fromEntries(
    Object.entries(schema.attributes).map(([attributeName, attribute]) => [
      attributeName,
      getSchemaDTO(attribute, context)
    ])
  ) as ItemSchemaDTO['attributes']
})
