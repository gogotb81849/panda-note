#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    
    ships = await db.ship.find_many(
        where={'teamCode': 'team2'},
        select={
            'cnShipName': True,
            'currentStatus': True,
            'currentLocation': True,
            'etaPort': True,
            'eta': True,
            'cargoStatus': True,
            'departurePort': True,
            'dynamicSource': True,
            'dynamicUpdatedAt': True,
        },
        order={'cnShipName': 'asc'}
    )
    
    print('=== 船舶状态数据分析 ===')
    print(f'共 {len(ships)} 艘船')
    print()
    
    for ship in ships:
        print(f'【{ship.cnShipName}】')
        print(f'  currentStatus: {repr(ship.currentStatus)}')
        print(f'  currentLocation: {repr(ship.currentLocation)}')
        print(f'  etaPort: {repr(ship.etaPort)}')
        print(f'  eta: {repr(ship.eta)}')
        print(f'  cargoStatus: {repr(ship.cargoStatus)}')
        print(f'  departurePort: {repr(ship.departurePort)}')
        print(f'  dynamicSource: {repr(ship.dynamicSource)}')
        print()
    
    await db.disconnect()

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())