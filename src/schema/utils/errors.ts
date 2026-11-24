import type { ErrorBlueprint } from '~/errors/blueprint.js'

type InvalidPropErrorBlueprint = ErrorBlueprint<{
  code: 'schema.invalidProp'
  hasPath: true
  payload: {
    propName: string
    expected?: unknown
    received: unknown
  }
}>

export type SharedSchemaErrorBlueprint =
  | InvalidPropErrorBlueprint
  | ErrorBlueprint<{
      code: 'schema.lazy.invalidResolution'
      hasPath: true
      payload: { received: unknown }
    }>
  | ErrorBlueprint<{
      code: 'schema.dto.unknownReference'
      hasPath: false
      payload: { ref: string }
    }>
