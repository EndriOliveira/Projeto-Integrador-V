import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
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
import { CreateUserDto } from './dto/request/createUser.dto';
import { FindUsersQueryDto } from './dto/request/findUsersQuery.dto';
import { UpdateUserDto } from './dto/request/updateUserDto';
import { CreateUserResponseDto } from './dto/response/createUser.response.dto';
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

  @Post('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Registered successfully',
    type: CreateUserResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiConflictResponse(httpErrors.conflictError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @GetUser() user: User,
    @Body() createUserDto: CreateUserDto,
  ): Promise<CreateUserResponseDto> {
    return await userService.createUser(user, createUserDto);
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
  @ApiBody({ type: UpdateUserDto })
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
