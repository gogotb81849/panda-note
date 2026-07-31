import { CreateDiaryBlockDto } from './create-diary-block.dto';

export type UpdateDiaryBlockDto = Partial<CreateDiaryBlockDto> & {
  // 用户手动修改了类型，用于记录自学习日志
  userManuallyChangedType?: boolean;
};
