import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Request,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as ExcelJS from 'exceljs';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') roleFilter?: string,
    @Query('teamCode') teamFilter?: string,
  ) {
    const currentUser = req.user;
    return this.accountService.findAll(currentUser, page, limit, search, roleFilter, teamFilter);
  }

  @Get('roles')
  async getRoles(@Request() req) {
    return this.accountService.getAvailableRoles(req.user);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.accountService.findOne(req.user, id);
  }

  @Post()
  async create(@Request() req, @Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(req.user, createAccountDto);
  }

  @Put(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountService.update(req.user, id, updateAccountDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.accountService.remove(req.user, id);
  }

  @Post(':id/reset-password')
  async resetPassword(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.accountService.resetPassword(req.user, id, resetPasswordDto);
  }

  @Post('lookup')
  async lookupByStaffId(@Body('staffId') staffId: string) {
    return this.accountService.lookupByStaffId(staffId);
  }

  @Post('batch-import')
  @UseInterceptors(FileInterceptor('file'))
  async batchImport(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new ForbiddenException('请上传文件');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new ForbiddenException('仅支持 Excel 文件 (.xlsx, .xls)');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new ForbiddenException('Excel 文件为空');
    }

    // 读取数据（跳过标题行）
    const importData: Array<{
      username: string;
      realName: string;
      teamCode: string;
      role: string;
      password?: string;
      staffId?: string;
      idCardLast6?: string;
    }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过标题行

      const username = row.getCell(1).value?.toString()?.trim();
      const realName = row.getCell(2).value?.toString()?.trim();
      const teamCode = row.getCell(3).value?.toString()?.trim();
      const role = row.getCell(4).value?.toString()?.trim();
      const password = row.getCell(5).value?.toString()?.trim();
      const staffId = row.getCell(6).value?.toString()?.trim();
      const idCardLast6 = row.getCell(7).value?.toString()?.trim();

      if (username || realName) {
        importData.push({
          username,
          realName,
          teamCode,
          role,
          password: password || undefined,
          staffId: staffId || undefined,
          idCardLast6: idCardLast6 || undefined,
        });
      }
    });

    if (importData.length === 0) {
      throw new ForbiddenException('Excel 文件中没有有效数据');
    }

    return this.accountService.batchImport(req.user, importData);
  }

  @Post('change-password')
  async changeOwnPassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new ForbiddenException('无效的token，请重新登录');
    }
    return this.accountService.changeOwnPassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );
  }
}
