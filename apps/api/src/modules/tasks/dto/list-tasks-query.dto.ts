import { IsIn, IsOptional } from 'class-validator';

export class ListTasksQueryDto {
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';
}
