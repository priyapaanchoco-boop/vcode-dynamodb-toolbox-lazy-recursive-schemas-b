import type { z } from 'zod'

import { lazy, list, map, string } from '~/index.js'

import { ZodSchemer } from '../actions/zodSchemer/index.js'
import type {
  DecodedValue,
  FormattedValue,
  InputValue,
  LazySchema,
  ListSchema,
  MapSchema,
  Paths,
  StringSchema,
  TransformedValue,
  ValidValue
} from '../index.js'

interface CommentSchema
  extends MapSchema<
    {
      text: StringSchema<{}>
      replies: ListSchema<LazySchema<CommentSchema, {}>, {}>
    },
    {}
  > {}
const text = string()
const replies = list(lazy((): CommentSchema => comment))
const comment: CommentSchema = map({ text, replies })
const valid: InputValue<typeof comment> = {
  text: 'hello',
  replies: [{ text: 'reply', replies: [] }]
}
// @ts-expect-error Nested replies retain their text type.
const invalid: InputValue<typeof comment> = { text: 'hello', replies: [{ text: 123, replies: [] }] }
const checked: ValidValue<typeof comment> = valid
const formatted: FormattedValue<typeof comment> = checked
void invalid
void formatted

const transformed: TransformedValue<typeof comment> = valid
const decoded: DecodedValue<typeof comment> = valid
// @ts-expect-error Required reply fields remain required.
const missing: ValidValue<typeof comment> = { text: 'hello', replies: [{ replies: [] }] }
const badFormatted: FormattedValue<typeof comment> = {
  text: 'hello',
  // @ts-expect-error Formatted nested replies retain their text type.
  replies: [{ text: false, replies: [] }]
}
const badTransformed: TransformedValue<typeof comment> = {
  text: 'hello',
  // @ts-expect-error Transformed nested replies retain their text type.
  replies: [{ text: false, replies: [] }]
}
const badDecoded: DecodedValue<typeof comment> = {
  text: 'hello',
  // @ts-expect-error Decoded nested replies retain their text type.
  replies: [{ text: false, replies: [] }]
}
void transformed
void decoded
void missing
void badFormatted
void badTransformed
void badDecoded

const nestedPath: Paths<typeof comment> = '.replies[0].replies[1].text'
// @ts-expect-error Paths are checked through the initial lazy expansions.
const badPath: Paths<typeof comment> = '.replies[0].missing'
void nestedPath
void badPath

const renamed = lazy(() => map({ text: string().savedAs('t') }))
const zodParser = new ZodSchemer(renamed).parser()
const zodPlainParser = new ZodSchemer(renamed).parser({ transform: false })
const zodFormatter = new ZodSchemer(renamed).formatter()
const encoded: z.output<typeof zodParser> = { t: 'hello' }
const plain: z.output<typeof zodPlainParser> = { text: 'hello' }
const decodedOutput: z.output<typeof zodFormatter> = { text: 'hello' }
// @ts-expect-error Zod output follows renamed fields after transformation.
const wrongEncoded: z.output<typeof zodParser> = { text: 'hello' }
// @ts-expect-error Disabling transformation preserves the original field names.
const wrongPlain: z.output<typeof zodPlainParser> = { t: 'hello' }
void encoded
void plain
void decodedOutput
void wrongEncoded
void wrongPlain
