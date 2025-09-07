import { IsArray, ArrayNotEmpty, ArrayUnique, IsString } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  permissions: string[];
}
