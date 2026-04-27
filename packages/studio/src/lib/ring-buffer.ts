export class RingBuffer {
  private chunks: Buffer[] = [];
  private totalSize = 0;
  private readonly capacityBytes: number;

  constructor(capacityBytes: number = 256 * 1024) {
    this.capacityBytes = capacityBytes;
  }

  push(chunk: Buffer): void {
    this.totalSize += chunk.length;
    this.chunks.push(chunk);
    while (this.totalSize > this.capacityBytes && this.chunks.length > 0) {
      const oldest = this.chunks.shift()!;
      this.totalSize -= oldest.length;
    }
  }

  read(): Buffer {
    return Buffer.concat(this.chunks);
  }

  size(): number {
    return this.totalSize;
  }
}