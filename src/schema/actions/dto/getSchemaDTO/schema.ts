import type { Schema } from '~/schema/index.js'

import type { ISchemaDTO } from '../types.js'
import { getAnySchemaDTO } from './any.js'
import { getAnyOfSchemaDTO } from './anyOf.js'
import { createSchemaDTOContext } from './context.js'
import type { SchemaDTOContext } from './context.js'
import { getItemSchemaDTO } from './item.js'
import { getListSchemaDTO } from './list.js'
import { getMapSchemaDTO } from './map.js'
import { getPrimitiveSchemaDTO } from './primitive.js'
import { getRecordSchemaDTO } from './record.js'
import { getSetSchemaDTO } from './set.js'
import { getDefaultsDTO } from './utils.js'

export const getSchemaDTO = (schema: Schema, context?: SchemaDTOContext): ISchemaDTO => {
  if (context === undefined) {
    const rootContext = createSchemaDTOContext()
    const dto = getSchemaDTO(schema, rootContext)
    if ('type' in dto && dto.type === 'item' && Object.keys(rootContext.definitions).length > 0) {
      dto.$defs = rootContext.definitions
    }
    return dto
  }
  /**
   * @debt feature "handle defaults, links & validators"
   */
  switch (schema.type) {
    case 'lazy': {
      schema.check()
      const target = schema.resolve()
      let id = context.ids.get(target)
      if (id === undefined) {
        id = 'schema' + context.ids.size
        context.ids.set(target, id)
        context.definitions[id] = getSchemaDTO(target, context)
      }
      const { required, hidden, key, savedAs } = schema.props
      return {
        $ref: '#/$defs/' + id,
        ...(required !== undefined ? { required } : {}),
        ...(hidden !== undefined ? { hidden } : {}),
        ...(key !== undefined ? { key } : {}),
        ...(savedAs !== undefined ? { savedAs } : {}),
        ...getDefaultsDTO(schema)
      }
    }
    case 'any':
      return getAnySchemaDTO(schema)
    case 'null':
    case 'boolean':
    case 'number':
    case 'string':
    case 'binary':
      return getPrimitiveSchemaDTO(schema)
    case 'set':
      return getSetSchemaDTO(schema)
    case 'list':
      return getListSchemaDTO(schema, context)
    case 'map':
      return getMapSchemaDTO(schema, context)
    case 'record':
      return getRecordSchemaDTO(schema, context)
    case 'anyOf':
      return getAnyOfSchemaDTO(schema, context)
    case 'item':
      return getItemSchemaDTO(schema, context)
  }
}
