import { Module } from '@nestjs/common';
import { SanlvRuleController } from './sanlv-rule.controller';
import { SanlvRuleService } from './sanlv-rule.service';

@Module({
  controllers: [SanlvRuleController],
  providers: [SanlvRuleService],
})
export class SanlvRuleModule {}
