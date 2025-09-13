import {t} from 'elysia'

export namespace MessageModel {
  export const GetAll = t.Object({
    deviceId: t.String({
      minLength: 1,
    }),
    fromMe: t.Optional(t.Nullable(t.Boolean({
      default: true,
    }))),
    realMessage: t.Optional(t.Nullable(t.Boolean({
      default: true,
    }))),
    limit: t.Optional(t.Nullable(t.Number({
      default: 100,
      minimum: 1,
      maximum: 1000,
    }))),
    perPage: t.Optional(t.Nullable(t.Number({
      default: 1,
      minimum: 1,
    }))),
  })

  export type GetAll = typeof GetAll.static
}
