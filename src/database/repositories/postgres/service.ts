import type { SQL, TransactionSQL } from "bun";
import { BaseDatabaseService } from "../base.service";
import { PostgresContactsRepository } from "./contacts.repository";
import { PostgresGroupsRepository } from "./groups.repository";
import type { IContactsRepository, IDevicesRepository, IGroupsRepository, IMessagesRepository, ISessionsRepository } from "../interfaces";
import { PostgresMessagesRepository } from "./messages.repository";
import { PostgresSessionRepository } from "./sessions.repository";
import { PostgresDevicesRepository } from "./devices.repository";

export class PostgresDatabaseService extends BaseDatabaseService {

  public override contacts: IContactsRepository;
  public override devices: IDevicesRepository;
  public override groups: IGroupsRepository;
  public override messages: IMessagesRepository;
  public override sessions: ISessionsRepository;

  constructor(db: SQL) {
    super(db);
    this.contacts = new PostgresContactsRepository(db);
    this.devices = new PostgresDevicesRepository(db);
    this.groups = new PostgresGroupsRepository(db);
    this.messages = new PostgresMessagesRepository(db);
    this.sessions = new PostgresSessionRepository(db);
  }
  protected async runMigrationQueries(tx: TransactionSQL): Promise<void> {
    await tx`CREATE TABLE IF NOT EXISTS "devices" (
      "id" varchar(26) NOT NULL PRIMARY KEY,
      "name" text,
      "description" text,
      "browser" text,
      "os" text,
      "version" text,
      "connection_state" text DEFAULT 'close',
      "webhook_url" text,
      "qr_string" text,
      "pair_code" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`;

    await tx`CREATE TABLE IF NOT EXISTS "contacts" (
      "id" text NOT NULL,
      "device_id" varchar(26) NOT NULL,
      "lid" text,
      "phone_number" text,
      "img_url" text,
      "name" text,
      "notify" text,
      "status" text,
      "verified_name" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

      CONSTRAINT "contacts_id_device_id_pkey" PRIMARY KEY ("id", "device_id")
    );`;

    await tx`CREATE TABLE IF NOT EXISTS "sessions" (
      "id" text NOT NULL,
      "device_id" varchar(26) NOT NULL,
      "data" jsonb NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

      CONSTRAINT "sessions_id_device_id_pkey" PRIMARY KEY ("id", "device_id")
    );`;

    await tx`CREATE TABLE IF NOT EXISTS "conversations" (
      "id" text NOT NULL,
      "device_id" varchar(26) NOT NULL,
      "data" jsonb NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

      CONSTRAINT "conversations_id_device_id_pkey" PRIMARY KEY ("id", "device_id")
    );`;

    await tx`CREATE TABLE IF NOT EXISTS "groups" (
      "id" text NOT NULL,
      "device_id" varchar(26) NOT NULL,
      "data" jsonb NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

      CONSTRAINT "groups_id_device_id_pkey" PRIMARY KEY ("id", "device_id")
    );`;

    await tx`CREATE TABLE IF NOT EXISTS "messages" (
      "id" text NOT NULL,
      "remote_jid" text NOT NULL,
      "from_me" boolean NOT NULL,
      "is_real_message" boolean DEFAULT true,
      "type" text NOT NULL,
      "device" text NOT NULL,
      "device_id" varchar(26) NOT NULL,
      "data" jsonb NOT NULL,
      "text" text,
      "media" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

      CONSTRAINT "messages_id_device_id_pkey" PRIMARY KEY ("id", "device_id")
    );`;
  }
}
