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
		webhookUrl: t.Nullable(
			t.Optional(
				t.String({
					format: 'uri',
				}),
			),
		),
	});
	export type Start = typeof Start.static;
}
