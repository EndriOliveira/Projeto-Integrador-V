import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
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
import { HourBalanceQueryDto } from './dto/request/hourBalanceQuery.dto';
import { HourBalanceResponseDto } from './dto/response/hourBalance.response.dto';
import hourBalanceService from './hourBalance.service';

@Controller('hour-balance')
@ApiTags('Hour Balance')
@UseGuards(AuthGuard())
@ApiSecurity('JWT-auth')
export class HourBalanceController {
  @Get('/me')
  @ApiResponse({
    status: 200,
    description: 'Hour balance found successfully',
    type: HourBalanceResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getMyBalance(
    @GetUser() user: User,
    @Query() query: HourBalanceQueryDto,
  ): Promise<HourBalanceResponseDto> {
    return await hourBalanceService.getBalance(user, user.id, query);
  }

  @Get('/:userId')
  @ApiResponse({
    status: 200,
    description: 'Hour balance found successfully',
    type: HourBalanceResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getBalance(
    @GetUser() user: User,
    @Param('userId') userId: string,
    @Query() query: HourBalanceQueryDto,
  ): Promise<HourBalanceResponseDto> {
    return await hourBalanceService.getBalance(user, userId, query);
  }
}
