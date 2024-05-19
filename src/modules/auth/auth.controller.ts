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
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RefreshToken, User } from '@prisma/client';
import { MessageResponseDto } from '../../shared/dto/message.response.dto';
import { httpErrors } from '../../shared/errors/http-errors';
import { authService } from './auth.service';
import { GetRefreshToken } from './decorator/get-refreshToken.decorator';
import { GetUser } from './decorator/get-user.decorator';
import { ChangePasswordDto } from './dto/request/changePassword.dto';
import { CredentialsDto } from './dto/request/credentials.dto';
import { ForgotPasswordDto } from './dto/request/forgotPassword.dto';
import { ResetPasswordDto } from './dto/request/resetPassword.dto';
import { ChangePasswordResponseDto } from './dto/response/changePassword.response.dto';
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
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async me(@GetUser() user: User): Promise<MeResponseDto> {
    return await authService.me(user);
  }

  @Post('/sign-in')
  @ApiBody({ type: CredentialsDto })
  @ApiResponse({
    status: 200,
    description: 'Logged in successfully',
    type: SignInResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
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
    type: MessageResponseDto,
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
    type: MessageResponseDto,
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
  @UseGuards(AuthGuard('jwt-refresh-token'))
  @ApiSecurity('JWT-refresh')
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetRefreshToken() refreshToken: RefreshToken,
  ): Promise<MessageResponseDto> {
    return await authService.logout(refreshToken);
  }

  @Put('/change-password')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: ChangePasswordResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return await authService.changePassword(user.id, changePasswordDto);
  }
}
