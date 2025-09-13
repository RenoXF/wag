import {t} from 'elysia'

export namespace ConnectionModel {
  export const Default = t.Object({
    deviceId: t.String({
      minLength: 1,
    }),
  })

  export const Start = t.Object({
    deviceId: t.String({
      minLength: 1,
    }),
    webhookUrl: t.Nullable(t.Optional(t.String({
      format: 'uri'
    }))),
  })

  export type Default = typeof Default.static
  export type Start = typeof Start.static
}
