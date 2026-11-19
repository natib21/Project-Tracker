import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { MembershipRole } from '../role.enum';

export class AddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(MembershipRole)
  @IsNotEmpty()
  role: MembershipRole;
}
