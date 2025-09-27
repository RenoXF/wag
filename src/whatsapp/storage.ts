import {
	type AuthenticationCreds,
	initAuthCreds,
	proto,
	type SignalDataSet,
	type SignalDataTypeMap,
	type SignalKeyStore,
} from 'baileys';
import {
	ContactTable,
	GroupTable,
	MessageTable,
	SessionTable,
} from '../database/models';

export interface IStorage {
	state: {
		creds: AuthenticationCreds;
		keys: SignalKeyStore;
	};
	saveCreds: () => Promise<any>;
	clearCreds: () => Promise<any>;
}

export const useStorage = async (deviceId: string): Promise<IStorage> => {
	const creds: AuthenticationCreds =
		(await SessionTable.get('creds', deviceId)) || initAuthCreds();

	const keys: SignalKeyStore = {
		get: async (type, ids) => {
			const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
			await Promise.all(
				ids.map(async (id) => {
					let value: unknown = await SessionTable.get(
						`${type}-${id}`,
						deviceId,
					);
					if (type === 'app-state-sync-key' && value) {
						value = proto.Message.AppStateSyncKeyData.create(value);
					}

					data[id] = value as SignalDataTypeMap[typeof type];
				}),
			);

			return data;
		},
		set: async (data: SignalDataSet) => {
			const tasks: Promise<void>[] = [];
			for (const category in data) {
				for (const id in data[category as keyof SignalDataTypeMap]) {
					const value = data[category as keyof SignalDataTypeMap]?.[id];
					const name = `${category}-${id}`;
					tasks.push(
						value
							? SessionTable.upsert(name, deviceId, value)
							: SessionTable.delete(name, deviceId),
					);
				}
			}

			await Promise.all(tasks);
		},
	};

	return {
		state: {
			creds,
			keys,
		},
		saveCreds: async () => {
			return SessionTable.upsert('creds', deviceId, creds);
		},
		clearCreds: async () => {
      await Promise.all([
        SessionTable.clear(deviceId),
        ContactTable.clear(deviceId),
        MessageTable.clear(deviceId),
        GroupTable.clear(deviceId),
      ]);
		},
	};
};
