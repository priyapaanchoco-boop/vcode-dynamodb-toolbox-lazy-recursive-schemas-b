import type { ItemSchemaDTO } from '~/schema/actions/dto/index.js'
import { item } from '~/schema/item/index.js'
import type { ItemSchema } from '~/schema/item/index.js'

import { validateReferences } from './fromSchemaDTO/context.js'
import type { FromSchemaDTOContext } from './fromSchemaDTO/context.js'
import { fromSchemaDTO as _fromSchemaDTO } from './fromSchemaDTO/index.js'

export const fromSchemaDTO = (schemaDTO: ItemSchemaDTO): ItemSchema => {
  const context: FromSchemaDTOContext = {
    definitions: schemaDTO.$schemaDefs ?? {},
    schemas: new Map()
  }
  validateReferences(schemaDTO, context)
  Object.values(context.definitions).forEach(dto => validateReferences(dto, context))
  return item(
    Object.fromEntries(
      Object.entries(schemaDTO.attributes).map(([attributeName, attributeDTO]) => [
        attributeName,
        _fromSchemaDTO(attributeDTO, context)
      ])
    )
  )
}
