import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { Role, User } from '@prisma/client';
import { Roles } from '../../shared/decorator/roles.decorator';
import { httpErrors } from '../../shared/errors/http-errors';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { CreateUserDto } from './dto/request/createUser.dto';
import { FindUsersQueryDto } from './dto/request/findUsersQuery.dto';
import { UpdateManagerDto } from './dto/request/updateManager.dto';
import { UpdateUserDto } from './dto/request/updateUserDto';
import { CreateUserResponseDto } from './dto/response/createUser.response.dto';
import { FindUserResponseDto } from './dto/response/findUser.response.dto';
import { FindUsersResponseDto } from './dto/response/findUsers.response.dto';
import { UpdateUserResponseDto } from './dto/response/updateUser.response.dto';
import userService from './user.service';

@Controller('user')
@ApiTags('User')
export class UserController {
  @Get('/managed')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.GESTOR)
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Managed users found successfully',
    type: FindUsersResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getManagedUsers(
    @GetUser() user: User,
    @Query() query: FindUsersQueryDto,
  ): Promise<FindUsersResponseDto> {
    return await userService.getManagedUsers(user, query);
  }

  @Get('/:id')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User Found Successfully',
    type: FindUserResponseDto,
  })
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getUserBySlug(@Param('id') id: string): Promise<FindUserResponseDto> {
    return await userService.getUserById(id);
  }

  @Post('/')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.RH)
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
    @Body() createUserDto: CreateUserDto,
  ): Promise<CreateUserResponseDto> {
    return await userService.createUser(createUserDto);
  }

  @Get('/')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.RH)
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Users Found Successfully',
    type: FindUsersResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query() query: FindUsersQueryDto,
  ): Promise<FindUsersResponseDto> {
    return await userService.getUsers(query);
  }

  @Put('/:id')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.RH)
  @ApiSecurity('JWT-auth')
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User Updated Successfully',
    type: UpdateUserResponseDto,
  })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiConflictResponse(httpErrors.conflictError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async editUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    return await userService.editUser(id, updateUserDto);
  }

  @Patch('/:id/manager')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.RH)
  @ApiSecurity('JWT-auth')
  @ApiBody({ type: UpdateManagerDto })
  @ApiResponse({
    status: 200,
    description: 'Manager associated successfully',
    type: UpdateUserResponseDto,
  })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async updateManager(
    @Param('id') id: string,
    @Body() updateManagerDto: UpdateManagerDto,
  ): Promise<UpdateUserResponseDto> {
    return await userService.updateManager(id, updateManagerDto);
  }

  @Patch('/:id/inactivate')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(Role.RH)
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 204,
    description: 'User Inactivated Successfully',
  })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async inactivateUser(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    await userService.inactivateUser(id, user);
  }
}
