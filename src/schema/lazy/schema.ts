import { DynamoDBToolboxError } from '~/errors/index.js'

import type { Schema, SchemaProps } from '../types/index.js'
import { checkSchemaProps } from '../utils/checkSchemaProps.js'

const resolutions = new WeakMap<LazySchema, unknown>()
const checking = new WeakSet<LazySchema>()
const schemaTypes = new Set([
  'any',
  'null',
  'boolean',
  'number',
  'string',
  'binary',
  'set',
  'list',
  'map',
  'record',
  'anyOf',
  'item',
  'lazy'
])

export class LazySchema<TARGET extends Schema = Schema, PROPS extends SchemaProps = SchemaProps> {
  readonly type = 'lazy'
  constructor(
    readonly thunk: () => TARGET,
    readonly props: PROPS
  ) {}

  resolve(): TARGET {
    if (!resolutions.has(this)) resolutions.set(this, this.thunk())
    return resolutions.get(this) as TARGET
  }

  get checked(): boolean {
    return Object.isFrozen(this.props)
  }

  check(path?: string): void {
    if (this.checked || checking.has(this)) return
    checkSchemaProps(this.props, path)
    const target: unknown = this.resolve()
    if (
      typeof target !== 'object' ||
      target === null ||
      !('type' in target) ||
      !schemaTypes.has(String(target.type)) ||
      !('check' in target) ||
      typeof target.check !== 'function' ||
      !('props' in target) ||
      typeof target.props !== 'object' ||
      target.props === null
    ) {
      throw new DynamoDBToolboxError('schema.lazy.invalidResolution', {
        message: 'Lazy schema thunk must return a schema.',
        path,
        payload: { received: target }
      })
    }
    checking.add(this)
    try {
      // Reject lazy-only cycles, but allow cycles through maps, lists and other containers.
      resolveLazySchema(this, path)
      target.check(path)
      Object.freeze(this.props)
    } finally {
      checking.delete(this)
    }
  }
}

type WithProps<T extends Schema, P extends SchemaProps> = T extends Schema
  ? Omit<T, 'props'> & { props: Omit<T['props'], keyof P> & P }
  : never
export type ResolveLazySchema<S extends LazySchema> = Extract<
  WithProps<ReturnType<S['resolve']>, S['props']>,
  Schema
>

/** Resolve a lazy chain, preserving target-specific props and occurrence overrides. */
export const resolveLazySchema = (schema: Schema, path?: string): Schema => {
  const seen = new Set<Schema>()
  let props: SchemaProps = {}
  while (schema.type === 'lazy') {
    if (seen.has(schema))
      throw new DynamoDBToolboxError('schema.lazy.invalidResolution', {
        message: 'Lazy schema must resolve to a concrete schema.',
        path,
        payload: { received: schema }
      })
    seen.add(schema)
    props = { ...schema.props, ...props }
    schema = schema.resolve()
    if (
      typeof schema !== 'object' ||
      schema === null ||
      !schemaTypes.has(schema.type) ||
      typeof schema.check !== 'function'
    ) {
      throw new DynamoDBToolboxError('schema.lazy.invalidResolution', {
        message: 'Lazy schema thunk must return a schema.',
        path,
        payload: { received: schema }
      })
    }
  }
  return Object.assign(Object.create(Object.getPrototypeOf(schema)), schema, {
    props: { ...schema.props, ...props }
  }) as Schema
}
