import { describe, expect, it, vi } from 'vitest'

import { $APPEND, $SET, $append, $set } from '~/entity/actions/update/symbols/index.js'
import { parseUpdateExtension } from '~/entity/actions/update/updateItemParams/extension/attribute.js'
import { parseUpdateAttributesExtension } from '~/entity/actions/updateAttributes/updateAttributesParams/extension/attribute.js'
import { lazy as rootLazy, s } from '~/index.js'

import { SchemaDTO } from '../actions/dto/index.js'
import type { ItemSchemaDTO } from '../actions/dto/index.js'
import { Finder } from '../actions/finder/index.js'
import { Formatter } from '../actions/format/index.js'
import { fromSchemaDTO } from '../actions/fromDTO/index.js'
import { JSONSchemer } from '../actions/jsonSchemer/index.js'
import { Parser } from '../actions/parse/index.js'
import { ConditionParser } from '../actions/parseCondition/index.js'
import { PathParser } from '../actions/parsePaths/index.js'
import { ZodSchemer } from '../actions/zodSchemer/index.js'
import { anyOf, item, lazy, list, map, record, string } from '../index.js'
import type { Schema } from '../index.js'

const recursiveComment = () => {
  const text = string()
  const comment: Schema = map({ text, replies: list(lazy((): Schema => comment)) })
  return comment
}
const value = {
  text: 'hello',
  replies: [{ text: 'reply', replies: [{ text: 'deep', replies: [] }] }]
}

describe('lazy schemas', () => {
  it('exports lazy from the package root and schema namespace', () => {
    expect(rootLazy).toBe(lazy)
    expect(s.lazy).toBe(lazy)
  })

  it('defers and caches resolution, including when frozen by a parent', () => {
    const target = string()
    const thunk = vi.fn(() => target)
    const schema = lazy(thunk)
    const parent = list(schema)
    expect(schema.type).toBe('lazy')
    expect(thunk).not.toHaveBeenCalled()
    parent.check()
    expect(schema.resolve()).toBe(target)
    expect(schema.resolve()).toBe(target)
    expect(thunk).toHaveBeenCalledTimes(1)
    expect(schema.checked).toBe(true)
  })

  it.each([undefined, null, 3, {}, { type: 'map' }])('rejects invalid resolution %j', result => {
    const thunk = vi.fn(() => result as Schema)
    const schema = lazy(thunk)
    expect(() => schema.check('comment')).toThrow(
      expect.objectContaining({ code: 'schema.lazy.invalidResolution', path: 'comment' })
    )
    expect(() => schema.check('comment')).toThrow()
    expect(thunk).toHaveBeenCalledTimes(1)
    expect(schema.checked).toBe(false)
  })

  it('rejects lazy-only cycles', () => {
    const schema: Schema = lazy((): Schema => schema)
    expect(() => schema.check()).toThrow(
      expect.objectContaining({ code: 'schema.lazy.invalidResolution' })
    )
  })

  it('checks, parses and formats recursive data with precise error paths', () => {
    const schema = recursiveComment()
    schema.check()
    expect(new Parser(schema).parse(value)).toEqual(value)
    expect(new Formatter(schema).format(value)).toEqual(value)
    const invalid = { text: 'hello', replies: [{ text: 123, replies: [] }] }
    expect(() => new Parser(schema).parse(invalid)).toThrow(
      expect.objectContaining({ path: 'replies[0].text' })
    )
    expect(() => new Formatter(schema).format(invalid)).toThrow(
      expect.objectContaining({ path: 'replies[0].text' })
    )
  })

  it('keeps optional/default/validator overrides and cloning', () => {
    const target = string()
    const schema = lazy(() => target)
      .optional()
      .savedAs('t')
      .default('default')
      .validate(v => v !== 'bad')
    expect(new Parser(schema).parse(undefined)).toBe('default')
    expect(() => new Parser(schema).parse('bad')).toThrow()
    expect(new Parser(schema.clone({ putDefault: 'next' })).parse(undefined)).toBe('next')
    expect(target.props).toEqual({})
    expect(new Parser(lazy(() => string()).optional()).parse(undefined)).toBeUndefined()
  })

  it('finds nested paths and applies renamed attributes', () => {
    const node: Schema = map({
      text: string().savedAs('t'),
      replies: list(lazy((): Schema => node))
    })
    const found = new Finder(node).search('replies[0].replies[1].text')
    expect(found).toHaveLength(1)
    expect(found[0]?.schema.type).toBe('string')
    expect(new Finder(node).search('replies[0].missing')).toEqual([])
  })

  it('supports projection and condition paths through recursive children', () => {
    const node: Schema = map({
      text: string().savedAs('t'),
      replies: list(lazy((): Schema => node))
    })
    expect(new PathParser(node).transform(['replies[0].text'])).toEqual(['replies[0].t'])
    expect(new ConditionParser(node).transform({ attr: 'replies[0].text', eq: 'hello' })).toEqual({
      attr: 'replies[0].t',
      eq: 'hello'
    })
  })

  it('validates update extensions through lazy containers in both update modes', () => {
    for (const parseExtension of [parseUpdateExtension, parseUpdateAttributesExtension]) {
      const schema = lazy(() => list(lazy(() => string())))
      const update = $append(['hello'])
      expect(new Parser(schema).parse(update, { mode: 'update', parseExtension })).toEqual({
        [$APPEND]: ['hello']
      })
      expect(() =>
        new Parser(schema).parse($append([123]), { mode: 'update', parseExtension })
      ).toThrow()
    }
    const schema = lazy(() => recursiveComment())
    expect(
      new Parser(schema).parse($set(value), {
        mode: 'update',
        parseExtension: parseUpdateExtension
      })
    ).toEqual({ [$SET]: value })
  })

  it('supports an item target and lazy discriminated union elements', () => {
    expect(new Parser(lazy(() => item({ text: string() }))).parse({ text: 'hello' })).toEqual({
      text: 'hello'
    })
    const schema = anyOf(
      lazy(() => map({ kind: string().enum('a'), text: string() })),
      lazy(() => map({ kind: string().enum('b') }))
    ).discriminate('kind')
    schema.check()
    expect(new ZodSchemer(schema).parser().safeParse({ kind: 'a', text: 'hello' }).success).toBe(
      true
    )
    expect(new ZodSchemer(schema).formatter().safeParse({ kind: 'b' }).success).toBe(true)
    expect(new Parser(schema).parse({ kind: 'a', text: 'hello' })).toEqual({
      kind: 'a',
      text: 'hello'
    })
  })

  it('round-trips recursive DTOs through JSON with untyped references and root definitions', () => {
    const schema = item({ comment: lazy(() => recursiveComment()) })
    const dto = new SchemaDTO(schema).toJSON()
    expect(dto.attributes.comment).toEqual({ $ref: '#/$defs/schema0' })
    expect(dto.$defs).toBeDefined()
    expect(JSON.stringify(dto)).not.toContain('"type":"lazy"')
    const rebuilt = fromSchemaDTO(JSON.parse(JSON.stringify(dto)) as ItemSchemaDTO)
    rebuilt.check()
    expect(new Parser(rebuilt).parse({ comment: value })).toEqual({ comment: value })
    expect(() => new Parser(rebuilt).parse({ comment: { text: 123, replies: [] } })).toThrow()
  })

  it('threads DTO definitions through maps, lists, records and unions', () => {
    const leaf = string()
    const schema = item({
      nested: map({
        rows: list(
          record(
            string(),
            anyOf(
              lazy(() => leaf),
              map({ text: lazy(() => leaf) })
            )
          )
        )
      })
    })
    const dto = new SchemaDTO(schema).toJSON()
    expect(Object.keys(dto.$defs ?? {})).toHaveLength(1)
    const rebuilt = fromSchemaDTO(JSON.parse(JSON.stringify(dto)) as ItemSchemaDTO)
    const input = { nested: { rows: [{ a: 'hello', b: { text: 'world' } }] } }
    expect(new Parser(rebuilt).parse(input)).toEqual(input)
  })

  it('supports mutually recursive definitions and per-reference props', () => {
    const left: Schema = map({ right: lazy((): Schema => right).optional() })
    const right: Schema = map({ left: lazy((): Schema => left).optional() })
    const schema = item({ root: lazy(() => left).savedAs('r') })
    const dto = new SchemaDTO(schema).toJSON()
    expect(dto.attributes.root).toEqual({ $ref: '#/$defs/schema0', savedAs: 'r' })
    const rebuilt = fromSchemaDTO(JSON.parse(JSON.stringify(dto)) as ItemSchemaDTO)
    rebuilt.check()
    expect(new Parser(rebuilt).parse({ root: { right: { left: {} } } })).toEqual({
      r: { right: { left: {} } }
    })
  })

  it('restores reference defaults and keeps shared target identity', () => {
    const target = string()
    const source = item({
      first: lazy(() => target).default('hello'),
      second: lazy(() => target).optional()
    })
    const dto = new SchemaDTO(source).toJSON()
    const rebuilt = fromSchemaDTO(JSON.parse(JSON.stringify(dto)) as ItemSchemaDTO)
    expect(new Parser(rebuilt).parse({})).toEqual({ first: 'hello' })
    const first = rebuilt.attributes.first
    const second = rebuilt.attributes.second
    if (first?.type !== 'lazy' || second?.type !== 'lazy')
      throw new Error('Expected lazy references')
    expect(first.resolve()).toBe(second.resolve())
  })

  it('throws immediately for unknown references at any depth, including definitions', () => {
    const dto: ItemSchemaDTO = {
      type: 'item',
      attributes: {
        nested: {
          type: 'list',
          elements: { type: 'map', attributes: { bad: { $ref: '#/$defs/missing' } } }
        }
      }
    }
    expect(() => fromSchemaDTO(dto)).toThrow(
      expect.objectContaining({ code: 'schema.dto.unknownReference' })
    )
    expect(() =>
      fromSchemaDTO({
        type: 'item',
        attributes: {},
        $defs: { unused: { $ref: '#/$defs/missing' } }
      })
    ).toThrow()
  })

  it('generates finite JSON Schema and recursive Zod parsers/formatters', () => {
    const schema = recursiveComment()
    const json = new JSONSchemer(schema).formattedValueSchema()
    expect(json).toHaveProperty('$defs')
    expect(JSON.stringify(json)).toContain('$ref')
    const zod = new ZodSchemer(schema)
    expect(zod.parser().safeParse(value).success).toBe(true)
    expect(zod.formatter().safeParse(value).success).toBe(true)
    expect(
      zod.parser().safeParse({ text: 'hello', replies: [{ text: 123, replies: [] }] }).success
    ).toBe(false)
  })
})
