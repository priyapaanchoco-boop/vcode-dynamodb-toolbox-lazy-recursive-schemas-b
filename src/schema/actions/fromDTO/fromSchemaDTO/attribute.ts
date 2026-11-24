import type { ISchemaDTO } from '~/schema/actions/dto/index.js'
import type { Schema } from '~/schema/index.js'
import { lazy } from '~/schema/lazy/index.js'

import { fromAnySchemaDTO } from './any.js'
import { fromAnyOfSchemaDTO } from './anyOf.js'
import type { FromSchemaDTOContext } from './context.js'
import { referenceId } from './context.js'
import { fromItemSchemaDTO } from './item.js'
import { fromListSchemaDTO } from './list.js'
import { fromMapSchemaDTO } from './map.js'
import { fromPrimitiveSchemaDTO } from './primitive.js'
import { fromRecordSchemaDTO } from './record.js'
import { fromSetSchemaDTO } from './set.js'

export const fromSchemaDTO = (
  schemaDTO: ISchemaDTO,
  context: FromSchemaDTOContext = { definitions: {}, schemas: new Map() }
): Schema => {
  if ('$ref' in schemaDTO) {
    const { $ref, keyDefault, putDefault, updateDefault, keyLink, putLink, updateLink, ...props } =
      schemaDTO
    const defaults = { keyDefault, putDefault, updateDefault }
    const defaultProps = Object.fromEntries(
      Object.entries(defaults).flatMap(([key, value]) =>
        value?.defaulterId === 'value' ? [[key, value.value]] : []
      )
    )
    keyLink
    putLink
    updateLink
    const id = referenceId($ref, context)
    return lazy(
      () => {
        let schema = context.schemas.get(id)
        if (schema === undefined) {
          schema = fromSchemaDTO(context.definitions[id]!, context)
          context.schemas.set(id, schema)
        }
        return schema
      },
      { ...props, ...defaultProps }
    )
  }
  switch (schemaDTO.type) {
    case 'any':
      return fromAnySchemaDTO(schemaDTO)
    case 'null':
    case 'boolean':
    case 'number':
    case 'string':
    case 'binary':
      return fromPrimitiveSchemaDTO(schemaDTO)
    case 'set':
      return fromSetSchemaDTO(schemaDTO)
    case 'list':
      return fromListSchemaDTO(schemaDTO, context)
    case 'map':
      return fromMapSchemaDTO(schemaDTO, context)
    case 'record':
      return fromRecordSchemaDTO(schemaDTO, context)
    case 'anyOf':
      return fromAnyOfSchemaDTO(schemaDTO, context)
    case 'item':
      return fromItemSchemaDTO(schemaDTO, context)
  }
}
