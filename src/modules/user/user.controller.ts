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
import { FindUsersQueryDto } from './dto/request/findUsersQuery.dto';
import { UpdateUserDto } from './dto/request/updateUserDto';
import { FindUserResponseDto } from './dto/response/findUser.response.dto';
import { FindUsersResponseDto } from './dto/response/findUsers.response.dto';
import { UpdateUserResponseDto } from './dto/response/updateUser.response.dto';
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
    type: FindUserResponseDto,
  })
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getUserBySlug(@Param('id') id: string): Promise<FindUserResponseDto> {
    return await userService.getUserById(id);
  }

  @Get('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Users Found Successfully',
    type: FindUsersResponseDto,
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
    type: UpdateUserResponseDto,
  })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiConflictResponse(httpErrors.conflictError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async editUser(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    return await userService.editUser(user.id, updateUserDto);
  }
}
