import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcryptjs';
import { TeamCode, UserRole, ScheduleStatus, Priority } from '@prisma/client';

@Injectable()
export class DataImportService {
  constructor(private prisma: PrismaService) {}

  async importFromExcel(type: string, fileBuffer: Buffer, duplicateStrategy: string = 'skip') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new BadRequestException('Excel 文件中没有工作表');
    }

    const rows = this.parseWorksheet(worksheet);
    if (rows.length === 0) {
      throw new BadRequestException('Excel 文件中没有数据');
    }

    if (type === 'users') {
      return this.importUsers(rows, duplicateStrategy);
    } else if (type === 'schedules') {
      return this.importSchedules(rows, duplicateStrategy);
    } else {
      throw new BadRequestException('不支持的导入类型');
    }
  }

  private parseWorksheet(worksheet: ExcelJS.Worksheet): any[] {
    const rows: any[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          const header = String(cell.value || '').trim().replace(/\*/g, '');
          headers.push(header);
        });
      } else {
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          if (colNumber <= headers.length && headers[colNumber - 1]) {
            rowData[headers[colNumber - 1]] = cell.value;
          }
        });
        rows.push(rowData);
      }
    });

    return rows;
  }

  private async importUsers(rows: any[], duplicateStrategy: string) {
    const result = { total: rows.length, successCount: 0, skippedCount: 0, failedCount: 0, errors: [] as string[] };
    const validRoles = ['admin', 'shore_crew_supervisor', 'ship_political_instructor', 'ship_crew'];
    const validTeamCodes = ['team1', 'team2', 'team3'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel 行号（含表头）

      try {
        const username = String(row['用户名'] || '').trim();
        const password = String(row['密码'] || '').trim();
        const realName = String(row['真实姓名'] || '').trim();
        const teamCode = String(row['团队'] || '').trim();
        const role = String(row['角色'] || '').trim();

        // 验证必填字段
        if (!username) throw new BadRequestException('用户名不能为空');
        if (!password) throw new BadRequestException('密码不能为空');
        if (!realName) throw new BadRequestException('真实姓名不能为空');
        if (!teamCode) throw new BadRequestException('团队不能为空');
        if (!role) throw new BadRequestException('角色不能为空');

        // 验证角色
        if (!validRoles.includes(role)) {
          throw new BadRequestException(`无效角色: ${role}，有效值: ${validRoles.join(', ')}`);
        }

        // 验证团队
        if (!validTeamCodes.includes(teamCode)) {
          throw new BadRequestException(`无效团队: ${teamCode}，有效值: ${validTeamCodes.join(', ')}`);
        }

        // 检查用户名是否已存在
        const existingUser = await this.prisma.user.findUnique({ where: { username } });
        if (existingUser) {
          if (duplicateStrategy === 'skip') {
            result.skippedCount++;
            continue;
          } else if (duplicateStrategy === 'error') {
            throw new BadRequestException(`用户名 ${username} 已存在`);
          } else if (duplicateStrategy === 'overwrite') {
            // 更新现有用户
            const hashedPassword = await bcrypt.hash(password, 10);
            await this.prisma.user.update({
              where: { username },
              data: {
                password: hashedPassword,
                realName,
                teamCode: teamCode as TeamCode,
                role: role as UserRole,
              },
            });
            result.successCount++;
            continue;
          }
        }

        // 创建新用户
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.prisma.user.create({
          data: {
            username,
            password: hashedPassword,
            realName,
            teamCode: teamCode as TeamCode,
            role: role as UserRole,
          },
        });
        result.successCount++;
      } catch (error: any) {
        result.failedCount++;
        result.errors.push(`第 ${rowNum} 行: ${error.message}`);
      }
    }

    return { ...result, success: result.failedCount === 0 };
  }

  private async importSchedules(rows: any[], duplicateStrategy: string) {
    const result = { total: rows.length, successCount: 0, skippedCount: 0, failedCount: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const date = row['日期'];
        const firstType = String(row['一级分类'] || '').trim();
        const secondType = String(row['二级分类'] || '').trim();
        const title = String(row['标题'] || '').trim();
        const description = String(row['描述'] || '').trim();
        const status = String(row['状态'] || 'pending').trim();
        const priority = String(row['优先级'] || 'normal').trim();

        if (!date) throw new BadRequestException('日期不能为空');
        if (!firstType) throw new BadRequestException('一级分类不能为空');
        if (!secondType) throw new BadRequestException('二级分类不能为空');

        // 解析日期
        let recordDate: Date;
        if (date instanceof Date) {
          recordDate = date;
        } else {
          recordDate = new Date(String(date));
          if (isNaN(recordDate.getTime())) {
            throw new BadRequestException(`无效日期格式: ${date}`);
          }
        }

        // 检查重复（基于日期+一级分类+二级分类+标题）
        if (duplicateStrategy !== 'overwrite') {
          const existing = await this.prisma.schedule.findFirst({
            where: {
              recordDate,
              firstType,
              secondType,
              title: title || null,
            },
          });
          if (existing) {
            if (duplicateStrategy === 'skip') {
              result.skippedCount++;
              continue;
            } else if (duplicateStrategy === 'error') {
              throw new BadRequestException(`记录已存在: ${firstType} - ${secondType} - ${title}`);
            }
          }
        }

        await this.prisma.schedule.create({
          data: {
            recordDate,
            firstType,
            secondType,
            title: title || null,
            description: description || null,
            finishStatus: status as ScheduleStatus,
            priority: priority as Priority,
            teamCode: 'team2' as TeamCode,
            createdById: 1, // 默认用户ID，可根据需要调整
          },
        });
        result.successCount++;
      } catch (error: any) {
        result.failedCount++;
        result.errors.push(`第 ${rowNum} 行: ${error.message}`);
      }
    }

    return { ...result, success: result.failedCount === 0 };
  }
}
