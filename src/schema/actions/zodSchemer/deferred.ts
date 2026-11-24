import type { z } from 'zod'

import type {
  DecodedValue,
  FormattedValue,
  InputValue,
  Schema,
  TransformedValue,
  ValidValue
} from '~/schema/index.js'

import type { ZodFormatterOptions } from './formatter/types.js'
import type { ZodParserOptions } from './parser/types.js'

// A deferred schema exposes value types without eagerly expanding the recursive Zod graph.
export type DeferredZodParser<S extends Schema, OPTIONS extends ZodParserOptions> = z.ZodType<
  OPTIONS extends { transform: false } ? ValidValue<S, OPTIONS> : TransformedValue<S, OPTIONS>,
  z.ZodTypeDef,
  OPTIONS extends { fill: false } ? ValidValue<S, OPTIONS> : InputValue<S, OPTIONS>
>
export type DeferredZodFormatter<S extends Schema, OPTIONS extends ZodFormatterOptions> = z.ZodType<
  OPTIONS extends { format: false } ? DecodedValue<S, OPTIONS> : FormattedValue<S, OPTIONS>,
  z.ZodTypeDef,
  OPTIONS extends { transform: false } ? DecodedValue<S, OPTIONS> : TransformedValue<S>
>
