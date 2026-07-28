import os
import sys
import json

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from prisma import Prisma

async def main():
    prisma = Prisma()
    await prisma.connect()
    
    template = await prisma.publishTemplate.find_first(
        where={'id': 27},
        include={'category': True}
    )
    
    if template:
        print("模板数据:")
        print(f"ID: {template.id}")
        print(f"Title: {template.title}")
        print(f"TemplateType: {template.templateType}")
        print(f"Items: {json.dumps(template.items, ensure_ascii=False, indent=2)[:2000]}")
        
        if template.items and isinstance(template.items, list):
            for i, item in enumerate(template.items):
                print(f"\n字段 {i}:")
                print(f"  name: {item.get('name')}")
                print(f"  label: {item.get('label')}")
                print(f"  type: {item.get('type')}")
                print(f"  required: {item.get('required')}")
                print(f"  showWhen: {item.get('showWhen')}")
                print(f"  showWhen类型: {type(item.get('showWhen'))}")
    else:
        print("模板未找到")
    
    await prisma.disconnect()

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())