import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { PolicyService } from './policy.service';

@Module({
  providers: [KnowledgeService, PolicyService],
  exports: [KnowledgeService, PolicyService],
})
export class KnowledgeModule {}
