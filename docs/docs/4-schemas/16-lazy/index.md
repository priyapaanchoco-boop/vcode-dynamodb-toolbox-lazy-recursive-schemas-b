---
title: lazy
sidebar_custom_props:
  code: true
---

# Lazy

Use `lazy(() => schema)` for recursive values such as comments containing replies. The thunk is deferred until resolution and its result is cached per lazy schema instance. `resolve()` returns that same schema on subsequent calls. Construction does not execute the thunk.

`lazy` is available from `dynamodb-toolbox`, `dynamodb-toolbox/schema`, and `dynamodb-toolbox/schema/lazy`, as well as `schema.lazy` and `s.lazy`.

Recursive TypeScript declarations need an explicit schema interface to break the inference cycle:

```ts
import {
  lazy,
  list,
  map,
  string
} from 'dynamodb-toolbox/schema'
import type {
  InputValue,
  LazySchema,
  ListSchema,
  MapSchema,
  StringSchema
} from 'dynamodb-toolbox/schema'

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

type Comment = InputValue<typeof comment>
// { text: string; replies: Comment[] }
```

Runtime parsing and formatting validate every nested value and preserve error paths. Mutual recursion is supported too. Use an empty list or an optional child as a terminating value; lazy schemas describe recursive trees, not cyclic JavaScript objects.

Lazy schemas support the usual required, optional, hidden, savedAs, default, link, validation, clone, and build methods. Properties set on the lazy occurrence override the corresponding target properties without changing the target. Set occurrence properties such as `hidden`, `savedAs`, and `optional` on the lazy wrapper so its parent can read them before resolving it.

Schema checks reject a non-schema thunk result with `schema.lazy.invalidResolution`. A chain containing only lazy schemas must eventually resolve to a concrete schema.

Value types preserve recursive field types. Attribute paths expand through three lazy boundaries and then become open-ended to avoid infinitely expanding TypeScript path unions; runtime path lookup still validates each segment at every depth.

## DTO references

A root item DTO stores schema definitions in `$defs`. Lazy occurrences serialize as plain reference objects, for example `{ $ref: '#/$defs/schema0' }`, with no `type` property. Occurrence overrides are stored alongside `$ref`. References work within maps, lists, records, unions, and other definitions.

`fromSchemaDTO` rebuilds references with a shared definitions context. Unknown references throw `schema.dto.unknownReference`, including references nested within definitions. DTOs can be serialized and restored through JSON.

JSON Schema generation also emits `$defs` and `$ref`, and Zod conversion uses lazy schemas.
