import { Elysia } from 'elysia';
import { WaStore } from '../../whatsapp';
import { GroupModel } from './model';
import { Group } from './service';

export const groups = new Elysia({
	prefix: '/groups',
	detail: {
		summary: 'Groups Management',
		description: 'Endpoints to manage WhatsApp groups',
		tags: ['Groups'],
	},
})
	.get(
		'/',
		async ({ query }) => {
			const data = await Group.getAll({ deviceId: query.deviceId });

			return {
				data,
			};
		},
		{
			query: GroupModel.index,
			detail: {
				summary: 'Get all groups for a specific device',
				description:
					'Retrieve a list of all WhatsApp groups associated with the specified device ID.',
			},
		},
	)
	.post(
		'/refresh',
		async ({ body, set }) => {
			const whatsapp = WaStore.get(body.deviceId);

			if (!whatsapp) {
				set.status = 404;
				return {
					error: 'Device not found',
				};
			}

			const res = await whatsapp.refreshGroupMetadata();

			if (res) {
				return { success: true };
			} else {
				set.status = 500;

				return {
					error: 'Failed to refresh group metadata, please try again later',
				};
			}
		},
		{
			body: GroupModel.index,
			detail: {
				summary: 'Refresh group metadata',
				description:
					'Trigger a refresh of the group metadata for the specified device ID. This updates the local cache with the latest group information from WhatsApp servers. Rate limited to 1 request per minute per device to avoid overloading the WhatsApp servers.',
			},
		},
	);
