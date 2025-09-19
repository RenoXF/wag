import type { AuthenticationCreds, Contact, GroupMetadata, GroupParticipant, proto, WAMessage } from 'baileys';
import type { IMessage } from '../models';

export interface IDatabaseService {
  contacts: IContactsRepository;
  groups: IGroupsRepository;
  messages: IMessagesRepository;
  sessions: ISessionsRepository;
  runMigration(): Promise<void>;
}

export interface IContactsRepository {
  upsert(deviceId: string, data: Contact): Promise<void>;
  update(deviceId: string, data: Partial<Contact>): Promise<void>;
  getAll(deviceId: string): Promise<Contact[]>;
  clear(deviceId: string): Promise<void>;
}

export interface IGroupsRepository {
  upsert(id: string, deviceId: string, data: Partial<GroupMetadata>): Promise<void>;
  get(id: string, deviceId: string): Promise<{ data: GroupMetadata }[]>;
  addParticipants(
    id: string,
    deviceId: string,
    participants: GroupParticipant[],
  ): Promise<void>;
  removeParticipants(
    id: string,
    deviceId: string,
    participants: string[],
  ): Promise<void>;
  getAll(deviceId: string): Promise<{ data: GroupMetadata}[]>;
  clear(deviceId: string): Promise<void>;
}

export interface IMessagesRepository {
  upsert(id: string,
    deviceId: string,
    remoteJid: string,
    fromMe: boolean,
    type: string,
    device: string,
    isRealMsg: boolean,
    text: string | null,
    data: object): Promise<void>;
  updateMessage(
    id: string,
    remoteJid: string,
    deviceId: string,
    text: string | null,
    message: object,
  ): Promise<void>;
  addReactions(
    id: string,
    remoteJid: string,
    deviceId: string,
    reaction: object,
    reactions: object,
  ): Promise<void>;
  get(id: string, remoteJid: string, deviceId: string): Promise<{data: WAMessage }[]>;
  getAll(device_id: string, fromMe: boolean, realMessage: boolean, limit: number, page: number): Promise<IMessage[]>;
  clear(deviceId: string): Promise<void>;
}

export interface ISessionsRepository {
  upsert(id: string, deviceId: string, data: unknown): Promise<void>;
  delete(id: string, deviceId: string): Promise<void>;
  clear(deviceId: string): Promise<void>;
  get(id: string, deviceId: string): Promise<{ data: AuthenticationCreds }[]>;
}
