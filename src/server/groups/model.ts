import { t } from 'elysia'

export namespace GroupModel {
  export const index = t.Object({
    deviceId: t.String({
      minLength: 1,
    }),
  })

  export type index = typeof index.static;
}
