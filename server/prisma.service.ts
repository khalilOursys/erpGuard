// src/prisma.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';  // If using for env

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 5;  // Configurable; set to 0 for no retry
  private readonly retryDelay = 5000;  // 5s, matches your logs

  constructor(private configService?: ConfigService) {  // Optional if injecting ConfigService
    super();  // Or pass options: super({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      // Optional: Override URL here if env not loading right (temp debug)
      // const url = this.configService?.get('DATABASE_URL') || process.env.DATABASE_URL;
      // await this.$connect({ datasources: { db: { url } } });
      await this.$connect();
      this.logger.log('Prisma connected successfully');
    } catch (error) {
      this.logger.error(`Prisma connection attempt ${attempt}`);
      if (attempt < this.maxRetries) {
        this.logger.log(`Retrying in ${this.retryDelay}ms...`);
        setTimeout(() => this.connectWithRetry(attempt + 1), this.retryDelay);
      } else {
        this.logger.error('Max retries exceeded. Prisma connection failed permanently.');
        // Optional: throw error to crash app, or continue (for graceful degradation)
        // throw error;
      }
    }
  }

  // Add this for cleanup (best practice)
  async onModuleDestroy() {
    await this.$disconnect();
  }
}