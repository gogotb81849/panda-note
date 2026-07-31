export class CreateDiaryBlockDto {
  diaryId: number;
  sortOrder?: number;
  blockType?: 'diary' | 'todo' | 'memo' | 'image' | 'file' | 'link';
  content: string;
  todoStatus?: string;
  todoDueDate?: string;
  metaJson?: string;
  scheduleId?: number;
}
