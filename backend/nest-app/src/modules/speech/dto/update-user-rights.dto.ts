import { PartialType } from '@nestjs/mapped-types';
import { CreateUserRightsDto } from './create-user-rights.dto';

export class UpdateUserRightsDto extends PartialType(CreateUserRightsDto) {}
