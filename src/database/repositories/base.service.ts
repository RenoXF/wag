import type { SQL, TransactionSQL } from "bun";
import type { IContactsRepository, IDatabaseService, IDevicesRepository, IGroupsRepository, IMessagesRepository, ISessionsRepository } from "./interfaces";

export abstract class BaseDatabaseService implements IDatabaseService {

  abstract contacts: IContactsRepository;
  abstract devices: IDevicesRepository;
  abstract groups: IGroupsRepository;
  abstract messages: IMessagesRepository;
  abstract sessions: ISessionsRepository;

  constructor(protected db: SQL) {
    //
  }

  public async runMigration(): Promise<void> {
    await this.db.begin(async (tx) => {
      console.log(`Running migrations for ${this.db.options.adapter}...`);
      await this.runMigrationQueries(tx);
    });
    console.log('All tables created successfully');
  }

  protected abstract runMigrationQueries(tx: TransactionSQL): Promise<void>;
}
