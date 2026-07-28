import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  async onModuleInit() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 5,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(`Redis 重连失败 ${times} 次，停止重试`);
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.logger.log('Redis 连接成功');
      });

      this.client.on('error', (error) => {
        this.logger.warn(`Redis 连接错误: ${error.message}`);
      });
    } catch (error) {
      this.logger.warn('Redis 初始化失败，应用将继续运行但缓存功能不可用:', error.message);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // 忽略Redis错误
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // 忽略Redis错误
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, seconds, value);
    } catch {
      // 忽略Redis错误
    }
  }
}