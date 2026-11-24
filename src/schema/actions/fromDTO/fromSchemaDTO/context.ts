import { DynamoDBToolboxError } from '~/errors/index.js'
import type { ISchemaDTO } from '~/schema/actions/dto/index.js'
import type { Schema } from '~/schema/index.js'

export interface FromSchemaDTOContext {
  definitions: Record<string, ISchemaDTO>
  schemas: Map<string, Schema>
}
export const referenceId = (ref: string, context: FromSchemaDTOContext): string => {
  const id = ref.startsWith('#/$defs/') ? ref.slice('#/$defs/'.length) : ''
  if (!Object.prototype.hasOwnProperty.call(context.definitions, id)) {
    throw new DynamoDBToolboxError('schema.dto.unknownReference', {
      message: 'Unknown schema reference: ' + ref,
      payload: { ref }
    })
  }
  return id
}

export const validateReferences = (dto: ISchemaDTO, context: FromSchemaDTOContext): void => {
  if ('$ref' in dto) {
    referenceId(dto.$ref, context)
    return
  }
  switch (dto.type) {
    case 'item':
    case 'map':
      Object.values(dto.attributes).forEach(child => validateReferences(child, context))
      break
    case 'anyOf':
      dto.elements.forEach(child => validateReferences(child, context))
      break
    case 'record':
      validateReferences(dto.keys, context)
      validateReferences(dto.elements, context)
      break
    case 'list':
    case 'set':
      validateReferences(dto.elements, context)
  }
}
