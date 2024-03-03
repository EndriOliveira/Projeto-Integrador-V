import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RefreshToken } from '@prisma/client';
import { httpErrors } from '../../shared/errors/http-errors';
import { GetRefreshToken } from '../auth/decorator/get-refreshToken.decorator';
import { NewAccessTokenResponseDto } from './dto/response/newAccessToken.response.dto';
import refreshTokenService from './refreshToken.service';

@Controller('refresh-token')
@ApiTags('Refresh Token')
export class RefreshTokenController {
  @Post('/new-access-token')
  @UseGuards(AuthGuard('jwt-refresh-token'))
  @ApiSecurity('JWT-refresh')
  @ApiResponse({
    status: 201,
    description: 'New access token generated successfully',
    type: NewAccessTokenResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async createNewAccessToken(
    @GetRefreshToken() refreshToken: RefreshToken,
  ): Promise<NewAccessTokenResponseDto> {
    return await refreshTokenService.createNewAccessToken(refreshToken);
  }
}
