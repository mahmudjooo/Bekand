import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListPatientsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  q?: string; // ism/telefon/email bo'yicha qidiruv

  @IsOptional()
  @IsString()
  gender?: string; // oddiy string filtr

  @IsOptional()
  @IsString()
  sort?: 'newest' | 'oldest'; // default newest
}
