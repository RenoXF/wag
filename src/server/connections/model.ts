import { t } from 'elysia';

export namespace ConnectionModel {
	export const Default = t.Object({
		deviceId: t.String({
			minLength: 1,
		}),
	});
	export type Default = typeof Default.static;

	export const Start = t.Object({
		...Default.properties,
		webhookUrl: t.Optional(t.Nullable(
			t.Optional(
				t.String({
					format: 'uri',
				}),
			),
		)),
    name: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
    description: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
    browser: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
    os: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
    version: t.Optional(t.Nullable(t.String({ minLength: 1 }))),
	});
	export type Start = typeof Start.static;
}
