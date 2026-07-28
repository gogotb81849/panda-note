import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FrontendHashService {
  private readonly logger = new Logger(FrontendHashService.name);
  private lastHash: string | null = null;
  private lastHashTime: number = 0;

  getFrontendHash(): { hash: string; timestamp: number } {
    const now = Date.now();
    if (this.lastHash && now - this.lastHashTime < 60000) {
      return { hash: this.lastHash, timestamp: this.lastHashTime };
    }

    let hash = '';
    try {
      const frontendDir = path.join(__dirname, '..', '..', '..', 'frontend');
      
      if (!fs.existsSync(frontendDir)) {
        this.logger.warn(`前端资源目录不存在: ${frontendDir}`);
        return { hash: 'unknown', timestamp: now };
      }

      const files = this.getFiles(frontendDir);
      const content = files.map(f => {
        const filePath = path.join(frontendDir, f);
        const stat = fs.statSync(filePath);
        return `${f}:${stat.size}:${stat.mtime.getTime()}`;
      }).sort().join('\n');

      hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 16);
      this.logger.debug(`前端资源哈希计算完成: ${hash}`);
    } catch (error) {
      this.logger.error('计算前端资源哈希失败:', error.message);
      hash = 'error';
    }

    this.lastHash = hash;
    this.lastHashTime = now;
    return { hash, timestamp: now };
  }

  private getFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat && stat.isDirectory()) {
        results = results.concat(this.getFiles(filePath).map(f => path.join(file, f)));
      } else {
        results.push(file);
      }
    });
    
    return results.filter(f => !f.endsWith('.map') && !f.includes('.git'));
  }
}
