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
		page: t.Optional(
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
    id: t.Optional(t.Nullable(t.String())),
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

  export const SendImageMessage = t.Object({
		...Default.properties,
    id: t.Optional(t.Nullable(t.String())),
    image: t.File({
      title: 'Image file to send',
      description: 'The image file to be sent',
      mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
    }),
		caption: t.Optional(t.Nullable(t.String({
			maxLength: 4096,
		}))),
    fileName: t.Optional(t.String({
      description: 'Custom file name for the image',
      maxLength: 100,
    })),
		recipient: t.String({
			minLength: 1,
			examples: [
				'456789765@g.us',
				'123456789@c.us',
				'6289522323@s.whatsapp.net',
			],
		}),
	});
	export type SendImageMessage = typeof SendImageMessage.static;

  export const SendVideoMessage = t.Object({
		...Default.properties,
    id: t.Optional(t.Nullable(t.String())),
    video: t.File({
      title: 'Video file to send',
      description: 'The video file to be sent',
      mimeTypes: ['video/mp4', 'video/3gp', 'video/avi', 'video/mkv'],
      maxSize: 50 * 1024 * 1024, // 50MB
    }),
		caption: t.Optional(t.Nullable(t.String({
      maxLength: 4096,
    }))),
    fileName: t.Optional(t.String({
      description: 'Custom file name for the video',
      maxLength: 100,
    })),
		recipient: t.String({
			minLength: 1,
			examples: [
				'456789765@g.us',
				'123456789@c.us',
				'6289522323@s.whatsapp.net',
			],
		}),
	});
	export type SendVideoMessage = typeof SendVideoMessage.static;

  export const SendDocumentMessage = t.Object({
		...Default.properties,
    id: t.Optional(t.Nullable(t.String())),
    document: t.File({
      title: 'Document file to send',
      description: 'The document file to be sent',
      maxSize: 50 * 1024 * 1024, // 50MB
    }),
		caption: t.Optional(t.Nullable(t.String({
      maxLength: 4096,
    }))),
    fileName: t.Optional(t.String({
      description: 'Custom file name for the document',
      maxLength: 100,
    })),
		recipient: t.String({
			minLength: 1,
			examples: [
				'456789765@g.us',
				'123456789@c.us',
				'6289522323@s.whatsapp.net',
			],
		}),
	});
	export type SendDocumentMessage = typeof SendDocumentMessage.static;
}
