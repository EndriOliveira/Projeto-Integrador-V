import { User } from '@prisma/client';

export class FindUsersResponseDto {
  users: User[];
  total: number;
  page: number;
  pages: number;
}
