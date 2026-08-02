import { Test, TestingModule } from '@nestjs/testing';
import { ShipController } from './ship.controller';
import { ShipService } from './ship.service';
import { TeamCode } from '@prisma/client';

describe('ShipController', () => {
  let controller: ShipController;
  let shipService: ShipService;

  const mockShipService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShipController],
      providers: [{ provide: ShipService, useValue: mockShipService }],
    }).compile();

    controller = module.get<ShipController>(ShipController);
    shipService = module.get<ShipService>(ShipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /ships 应返回船舶数组', async () => {
    const ships = [
      { id: 1, cnShipName: '鲸鱼座' },
      { id: 2, cnShipName: '海豚座' },
    ];
    mockShipService.findAll.mockResolvedValue(ships);

    const req = { user: { teamCode: TeamCode.team2 } };
    const result = await controller.findAll(req);

    expect(result).toEqual(ships);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });

  it('GET /ships/:id 应返回单艘船舶', async () => {
    const ship = { id: 1, cnShipName: '鲸鱼座', status: 'sailing', statusText: '航行中' };
    mockShipService.findOne.mockResolvedValue(ship);

    const result = await controller.findOne('1');

    expect(result).toEqual(ship);
    expect(mockShipService.findOne).toHaveBeenCalledWith(1);
  });

  it('Controller 应以正确参数调用 service', async () => {
    mockShipService.findAll.mockResolvedValue([]);
    const req = { user: { teamCode: TeamCode.team2 } };
    await controller.findAll(req);
    expect(shipService.findAll).toHaveBeenCalledWith(TeamCode.team2);

    mockShipService.findOne.mockResolvedValue(null);
    await controller.findOne('42');
    expect(shipService.findOne).toHaveBeenCalledWith(42);
  });
});
