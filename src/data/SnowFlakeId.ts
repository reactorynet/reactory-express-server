import { ObjectId } from "mongodb";

const DEFAULT_DATA_CENTER_ID = parseInt(process.env.REACTORY_DATA_CENTER_ID) || 1;
const DEFAULT_WORKER_ID = parseInt(process.env.REACTORY_WORKER_ID) || 1;
const DEFAULT_EPOCH = parseInt(process.env.REACTORY_WORKER_EPOCH) || 1609459200000;

class SnowflakeIdGenerator {
  private epoch: number;
  private datacenterIdBits: number;
  private workerIdBits: number;
  private sequenceBits: number;

  private maxDatacenterId: number;
  private maxWorkerId: number;
  private maxSequence: number;

  private workerIdShift: number;
  private datacenterIdShift: number;
  private timestampLeftShift: number;

  private datacenterId: number;
  private workerId: number;
  private sequence: number;
  private lastTimestamp: number;

  constructor(datacenterId: number = DEFAULT_DATA_CENTER_ID, workerId: number = DEFAULT_WORKER_ID) {
      this.epoch = 1609459200000; // Custom epoch (January 1, 2021)
      this.datacenterIdBits = 5;
      this.workerIdBits = 5;
      this.sequenceBits = 12;

      this.maxDatacenterId = -1 ^ (-1 << this.datacenterIdBits);
      this.maxWorkerId = -1 ^ (-1 << this.workerIdBits);
      this.maxSequence = -1 ^ (-1 << this.sequenceBits);

      this.workerIdShift = this.sequenceBits;
      this.datacenterIdShift = this.sequenceBits + this.workerIdBits;
      this.timestampLeftShift = this.sequenceBits + this.workerIdBits + this.datacenterIdBits;

      if (datacenterId > this.maxDatacenterId || datacenterId < 0) {
          throw new Error('Datacenter ID out of range');
      }
      if (workerId > this.maxWorkerId || workerId < 0) {
          throw new Error('Worker ID out of range');
      }

      this.datacenterId = datacenterId;
      this.workerId = workerId;
      this.sequence = 0;
      this.lastTimestamp = -1;
  }

  private currentTime(): number {
      return Date.now();
  }

  private waitNextMillis(lastTimestamp: number): number {
      let timestamp = this.currentTime();
      while (timestamp <= lastTimestamp) {
          timestamp = this.currentTime();
      }
      return timestamp;
  }

  public nextId(): bigint {
      let timestamp = this.currentTime();

      if (timestamp < this.lastTimestamp) {
          throw new Error('Clock moved backwards. Refusing to generate id');
      }

      if (timestamp === this.lastTimestamp) {
          this.sequence = (this.sequence + 1) & this.maxSequence;
          if (this.sequence === 0) {
              timestamp = this.waitNextMillis(this.lastTimestamp);
          }
      } else {
          this.sequence = 0;
      }

      this.lastTimestamp = timestamp;

      return BigInt(((timestamp - this.epoch) << this.timestampLeftShift) |
                    (this.datacenterId << this.datacenterIdShift) |
                    (this.workerId << this.workerIdShift) |
                    this.sequence);
  }

  public generateObjectId(): ObjectId {
      const nextId = this.nextId();
      return this.snowflakeIdToObjectId(nextId);
  }

  private snowflakeIdToObjectId(snowflakeId: bigint): ObjectId {
      // Extract parts from the Snowflake ID
      const timestamp = Number(snowflakeId >> BigInt(this.timestampLeftShift)) + this.epoch;
      const machineId = Number((snowflakeId >> BigInt(this.workerIdShift)) & BigInt(0x1FFFF));
      const processId = 0; // Simplified, you might want to use an actual process ID
      const counter = Number(snowflakeId & BigInt(0xFFF));

      // Convert to buffers
      const timestampBuffer = Buffer.alloc(4);
      timestampBuffer.writeUInt32BE(Math.floor(timestamp / 1000), 0); // Convert to seconds

      const machineIdBuffer = Buffer.alloc(3);
      machineIdBuffer.writeUIntBE(machineId, 0, 3);

      const processIdBuffer = Buffer.alloc(2);
      processIdBuffer.writeUInt16BE(processId, 0);

      const counterBuffer = Buffer.alloc(3);
      counterBuffer.writeUIntBE(counter, 0, 3);

      // Combine buffers to form the ObjectId
      return new ObjectId(Buffer.concat([
        timestampBuffer, 
        machineIdBuffer, 
        processIdBuffer, 
        counterBuffer]).toString('hex'));
  }

  public extractComponents(id: bigint) {
    const timestamp = Number(id >> BigInt(this.timestampLeftShift)) + this.epoch;
    const datacenterId = Number((id >> BigInt(this.datacenterIdShift)) & BigInt(0x1F));
    const workerId = Number((id >> BigInt(this.workerIdShift)) & BigInt(0x1F));

    return {
        date: new Date(timestamp),
        datacenterId: datacenterId,
        workerId: workerId
    };
  }
}


