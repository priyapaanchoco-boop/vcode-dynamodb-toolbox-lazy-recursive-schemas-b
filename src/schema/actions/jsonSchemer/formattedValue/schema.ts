import type {
  AnyOfSchema,
  AnySchema,
  ItemSchema,
  ListSchema,
  MapSchema,
  PrimitiveSchema,
  RecordSchema,
  Schema,
  SetSchema
} from '~/schema/index.js'
import type { LazySchema } from '~/schema/lazy/index.js'
import { resolveLazySchema } from '~/schema/lazy/schema.js'

import type { FormattedAnyOfJSONSchema } from './anyOf.js'
import { getFormattedAnyOfJSONSchema } from './anyOf.js'
import type { JSONSchemaContext } from './context.js'
import type { FormattedItemJSONSchema } from './item.js'
import { getFormattedItemJSONSchema } from './item.js'
import type { FormattedListJSONSchema } from './list.js'
import { getFormattedListJSONSchema } from './list.js'
import type { FormattedMapJSONSchema } from './map.js'
import { getFormattedMapJSONSchema } from './map.js'
import type { FormattedPrimitiveJSONSchema } from './primitive.js'
import { getFormattedPrimitiveJSONSchema } from './primitive.js'
import type { FormattedRecordJSONSchema } from './record.js'
import { getFormattedRecordJSONSchema } from './record.js'
import type { FormattedSetJSONSchema } from './set.js'
import { getFormattedSetJSONSchema } from './set.js'

export type FormattedValueJSONSchema<SCHEMA extends Schema> = Schema extends SCHEMA
  ? Record<string, unknown>
  :
      | (SCHEMA extends LazySchema ? { $ref: string } : never)
      | (SCHEMA extends AnySchema ? {} : never)
      | (SCHEMA extends PrimitiveSchema ? FormattedPrimitiveJSONSchema<SCHEMA> : never)
      | (SCHEMA extends SetSchema ? FormattedSetJSONSchema<SCHEMA> : never)
      | (SCHEMA extends ListSchema ? FormattedListJSONSchema<SCHEMA> : never)
      | (SCHEMA extends MapSchema ? FormattedMapJSONSchema<SCHEMA> : never)
      | (SCHEMA extends RecordSchema ? FormattedRecordJSONSchema<SCHEMA> : never)
      | (SCHEMA extends AnyOfSchema ? FormattedAnyOfJSONSchema<SCHEMA> : never)
      | (SCHEMA extends ItemSchema ? FormattedItemJSONSchema<SCHEMA> : never)

export const getFormattedValueJSONSchema = <SCHEMA extends Schema>(
  schema: SCHEMA,
  context?: JSONSchemaContext
): FormattedValueJSONSchema<SCHEMA> => {
  if (context === undefined) {
    const rootContext: JSONSchemaContext = { ids: new Map(), definitions: {} }
    const result = getFormattedValueJSONSchema(schema, rootContext)
    return Object.keys(rootContext.definitions).length === 0
      ? result
      : { ...result, $defs: rootContext.definitions }
  }
  type RESPONSE = FormattedValueJSONSchema<SCHEMA>

  switch (schema.type) {
    case 'lazy': {
      schema.check()
      let id = context.ids.get(schema)
      if (id === undefined) {
        id = 'schema' + context.ids.size
        context.ids.set(schema, id)
        context.definitions[id] = getFormattedValueJSONSchema(resolveLazySchema(schema), context)
      }
      return { $ref: '#/$defs/' + id } as RESPONSE
    }
    case 'any':
      return {} as RESPONSE
    case 'null':
    case 'boolean':
    case 'number':
    case 'string':
    case 'binary':
      return getFormattedPrimitiveJSONSchema(schema) as RESPONSE
    case 'set':
      return getFormattedSetJSONSchema(schema) as RESPONSE
    case 'list':
      return getFormattedListJSONSchema(schema, context) as RESPONSE
    case 'map':
      return getFormattedMapJSONSchema(schema, context) as RESPONSE
    case 'record':
      return getFormattedRecordJSONSchema(schema, context) as RESPONSE
    case 'anyOf':
      return getFormattedAnyOfJSONSchema(schema, context) as RESPONSE
    case 'item':
      return getFormattedItemJSONSchema(schema, context) as RESPONSE
  }
}
