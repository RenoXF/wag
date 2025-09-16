import PQueue from 'p-queue';

class Queue {
  private queue = new Map<string, PQueue>();

  public add(id: string) {
    if (!this.queue.has(id)) {
      this.queue.set(id, new PQueue({ concurrency: 1 }));
    }
    return this.queue.get(id)!;
  }

  public delete(id: string) {
    this.queue.delete(id);
  }

  public get(id: string) {
    return this.queue.get(id);
  }
}

export const queue = new Queue();
