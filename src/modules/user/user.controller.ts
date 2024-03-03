import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { httpErrors } from '../../shared/errors/http-errors';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { FindUsersResponseDto } from './dto/findUsers.response.dto';
import { FindUsersQueryDto } from './dto/findUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUserDto';
import userService from './user.service';

@Controller('user')
@ApiTags('User')
export class UserController {
  @Get('/:id')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User Found Successfully',
    schema: {
      example: {
        id: 'string',
        active: 'boolean',
        name: 'string',
        cpf: 'string',
        phone: 'string',
        email: 'string',
        slug: 'string',
        createdAt: 'dateTime',
        updatedAt: 'dateTime',
      },
    },
  })
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getUserBySlug(@Param('id') id: string): Promise<User> {
    return await userService.getUserById(id);
  }

  @Get('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Users Found Successfully',
    schema: {
      example: {
        users: [
          {
            id: 'string',
            active: 'boolean',
            name: 'string',
            cpf: 'string',
            phone: 'string',
            email: 'string',
            slug: 'string',
            createdAt: 'dateTime',
            updatedAt: 'dateTime',
          },
        ],
        total: 'number',
        page: 'number',
        pages: 'number',
      },
    },
  })
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query() query: FindUsersQueryDto,
  ): Promise<FindUsersResponseDto> {
    return await userService.getUsers(query);
  }

  @Put('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User Updated Successfully',
    schema: {
      example: {
        id: 'string',
        active: 'boolean',
        name: 'string',
        cpf: 'string',
        phone: 'string',
        email: 'string',
        slug: 'string',
        createdAt: 'dateTime',
        updatedAt: 'dateTime',
      },
    },
  })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiConflictResponse(httpErrors.conflictError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async editUser(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await userService.editUser(user.id, updateUserDto);
  }
}
