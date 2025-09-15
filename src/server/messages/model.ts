import { t } from 'elysia';

export namespace MessageModel {
	export const Default = t.Object({
		deviceId: t.String({
			minLength: 1,
		}),
	});
	export type Default = typeof Default.static;

	export const GetAll = t.Object({
		...Default.properties,
		fromMe: t.Optional(
			t.Nullable(
				t.Boolean({
					default: true,
				}),
			),
		),
		realMessage: t.Optional(
			t.Nullable(
				t.Boolean({
					default: true,
				}),
			),
		),
		limit: t.Optional(
			t.Nullable(
				t.Number({
					default: 100,
					minimum: 1,
					maximum: 1000,
				}),
			),
		),
		perPage: t.Optional(
			t.Nullable(
				t.Number({
					default: 1,
					minimum: 1,
				}),
			),
		),
	});
	export type GetAll = typeof GetAll.static;

	export const SendTextMessage = t.Object({
		...Default.properties,
		message: t.String({
			minLength: 1,
			maxLength: 4096,
		}),
		recipient: t.String({
			minLength: 1,
			examples: [
				'456789765@g.us',
				'123456789@c.us',
				'6289522323@s.whatsapp.net',
			],
		}),
	});
	export type SendTextMessage = typeof SendTextMessage.static;
}
