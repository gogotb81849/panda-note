import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ShipNoteService } from './ship-note.service';
import { ShipNote } from '@prisma/client';

@Controller('ship-notes')
export class ShipNoteController {
  constructor(private shipNoteService: ShipNoteService) {}

  @Get()
  async getAll(): Promise<ShipNote[]> {
    return this.shipNoteService.getAll();
  }

  @Get('ship/:shipId')
  async getByShipId(
    @Param('shipId') shipId: string,
    @Query('keyword') keyword?: string,
    @Query('tag') tag?: string,
    @Query('sortBy') sortBy?: 'time' | 'star' | 'custom',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<ShipNote[]> {
    return this.shipNoteService.findByShipId(parseInt(shipId), { keyword, tag, sortBy, sortOrder });
  }

  @Get('ship/:shipId/tags')
  async getTagsByShipId(@Param('shipId') shipId: string): Promise<string[]> {
    return this.shipNoteService.getTagsByShipId(parseInt(shipId));
  }

  @Get('ship/:shipId/ai-analysis')
  async getAIAnalysis(@Param('shipId') shipId: string) {
    return this.shipNoteService.analyzeShipNotes(parseInt(shipId));
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ShipNote | null> {
    return this.shipNoteService.findById(parseInt(id));
  }

  @Post()
  async create(@Body() body: { shipId: number; userId: number; content: string; source?: string; tags?: string[] }): Promise<ShipNote> {
    return this.shipNoteService.create(body.shipId, body.userId, body.content, body.source, body.tags);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { content?: string; tags?: string[]; starLevel?: number; isPinned?: boolean; sortOrder?: number },
  ): Promise<ShipNote> {
    return this.shipNoteService.update(parseInt(id), body);
  }

  @Put(':id/pin')
  async setPinned(@Param('id') id: string, @Body() body: { isPinned: boolean }): Promise<ShipNote> {
    return this.shipNoteService.setPinned(parseInt(id), body.isPinned);
  }

  @Put(':id/star')
  async setStar(@Param('id') id: string, @Body() body: { starLevel: number }): Promise<ShipNote> {
    return this.shipNoteService.setStar(parseInt(id), body.starLevel);
  }

  @Put(':id/move')
  async moveOrder(
    @Param('id') id: string,
    @Body() body: { direction: 'up' | 'down' | 'top' | 'bottom'; shipId: number },
  ): Promise<ShipNote> {
    return this.shipNoteService.moveOrder(parseInt(id), body.direction, body.shipId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ShipNote> {
    return this.shipNoteService.delete(parseInt(id));
  }
}
