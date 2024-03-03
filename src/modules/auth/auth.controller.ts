import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { MessageResponseDto } from '../../shared/dto/message.response.dto';
import { httpErrors } from '../../shared/errors/http-errors';
import { authService } from './auth.service';
import { GetUser } from './decorator/get-user.decorator';
import { ChangePasswordDto } from './dto/request/changePassword.dto';
import { CreateUserDto } from './dto/request/createUser.dto';
import { CredentialsDto } from './dto/request/credentials.dto';
import { ForgotPasswordDto } from './dto/request/forgotPassword.dto';
import { ResetPasswordDto } from './dto/request/resetPassword.dto';
import { CreateUserResponseDto } from './dto/response/createUser.response.dto';
import { MeResponseDto } from './dto/response/me.response.dto';
import { SignInResponseDto } from './dto/response/signIn.response.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  @Get('/me')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User Found Successfully',
    type: MeResponseDto,
  })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @HttpCode(HttpStatus.OK)
  async me(@GetUser() user: User): Promise<MeResponseDto> {
    return user;
  }

  @Post('/sign-up')
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'Registered successfully',
    type: CreateUserResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiConflictResponse(httpErrors.conflictError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async signUp(
    @Body() createUserDto: CreateUserDto,
  ): Promise<CreateUserResponseDto> {
    return await authService.createUser(createUserDto);
  }

  @Post('/sign-in')
  @ApiBody({ type: CredentialsDto })
  @ApiResponse({
    status: 200,
    description: 'Logged in successfully',
    type: SignInResponseDto,
  })
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() credentialsDto: CredentialsDto,
  ): Promise<SignInResponseDto> {
    return await authService.signIn(credentialsDto);
  }

  @Post('/forgot-password')
  @ApiResponse({
    status: 200,
    description: 'Code generated successfully',
    schema: {
      example: {
        message: 'string',
      },
    },
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return await authService.forgotPassword(forgotPasswordDto);
  }

  @Post('/reset-password')
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        message: 'string',
      },
    },
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return await authService.resetPassword(resetPasswordDto);
  }

  @Post('/logout')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-refresh')
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        message: 'string',
      },
    },
  })
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async logout(@GetUser() user: User): Promise<MessageResponseDto> {
    return await authService.logout(user.id);
  }

  @Put('/change-password')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
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
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<User> {
    return await authService.changePassword(user.id, changePasswordDto);
  }
}
