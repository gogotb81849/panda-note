import { Module } from '@nestjs/common';
import { ShipNoteController } from './ship-note.controller';
import { ShipNoteService } from './ship-note.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ShipNoteController],
  providers: [ShipNoteService, PrismaService],
})
export class ShipNoteModule {}
