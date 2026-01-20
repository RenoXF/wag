import {
  type AuthenticationCreds,
  BufferJSON,
  initAuthCreds,
  proto,
  type SignalDataSet,
  type SignalDataTypeMap,
  type SignalKeyStore,
} from 'baileys';
import { Database } from 'bun:sqlite';

export interface IStorage {
  state: {
    creds: AuthenticationCreds;
    keys: SignalKeyStore;
  };
  saveCreds: () => void;
  clearCreds: () => void;
}

export const useSqliteAuthState = (sql: Database): IStorage => {
  const read = (key: string) => {
    const query = sql.query(
      `SELECT value FROM sessions WHERE key = $key LIMIT 1`,
    );
    const res = query.get({ $key: key }) as { value: string } | undefined;
    query.finalize();

    if (res?.value) {
      const deserialized = JSON.parse(res.value, BufferJSON.reviver);

      return deserialized;
    }

    return null;
  };

  const write = (key: string, value: unknown) => {
    const serialized = JSON.stringify(value, BufferJSON.replacer);
    const query =
      sql.query(`INSERT INTO sessions (key, value) VALUES ($key, $value)
      ON CONFLICT(key) DO UPDATE SET value = $value`);

    query.run({ $key: key, $value: serialized });
    query.finalize();
  };

  const remove = (key: string) => {
    const query = sql.query(`DELETE FROM sessions WHERE key = $key`);

    query.run({ $key: key });
    query.finalize();
  };

  const clear = () => {
    const query = sql.query(`DELETE FROM sessions`);
    query.run();
    query.finalize();
  };

  const creds: AuthenticationCreds = read('creds') || initAuthCreds();

  const keys: SignalKeyStore = {
    get: (type, ids) => {
      const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
      for (const id of ids) {
        let value: unknown = read(`${type}-${id}`);
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.create(value);
        }

        data[id] = value as SignalDataTypeMap[typeof type];
      }

      return data;
    },
    set: (data: SignalDataSet) => {
      for (const category in data) {
        for (const id in data[category as keyof SignalDataTypeMap]) {
          const value = data[category as keyof SignalDataTypeMap]?.[id];
          const name = `${category}-${id}`;
          if (value) {
            write(name, value);
          } else {
            remove(name);
          }
        }
      }
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds: () => {
      return write('creds', creds);
    },
    clearCreds: () => {
      return clear();
    },
  };
};
