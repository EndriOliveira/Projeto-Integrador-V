import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { httpErrors } from '../../shared/errors/http-errors';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { PushTokenDto } from './dto/request/pushToken.dto';
import { NotificationListResponseDto } from './dto/response/notification.response.dto';
import notificationService from './notification.service';

@Controller('notifications')
@ApiTags('Notifications')
export class NotificationController {
  @Get('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Latest notifications of the logged user',
    type: NotificationListResponseDto,
  })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async listNotifications(
    @GetUser() user: User,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationListResponseDto> {
    return await notificationService.listNotifications(
      user,
      unreadOnly === 'true',
    );
  }

  @Patch('/read-all')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({ status: 204, description: 'All notifications marked as read' })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@GetUser() user: User): Promise<void> {
    await notificationService.markAsRead(user);
  }

  @Patch('/:id/read')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({ status: 204, description: 'Notification marked as read' })
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await notificationService.markAsRead(user, id);
  }

  @Post('/push-token')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiBody({ type: PushTokenDto })
  @ApiResponse({ status: 204, description: 'Push token registered' })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerPushToken(
    @GetUser() user: User,
    @Body() pushTokenDto: PushTokenDto,
  ): Promise<void> {
    await notificationService.registerPushToken(user, pushTokenDto);
  }

  @Delete('/push-token')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiBody({ type: PushTokenDto })
  @ApiResponse({ status: 204, description: 'Push token removed' })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePushToken(
    @GetUser() user: User,
    @Body() pushTokenDto: PushTokenDto,
  ): Promise<void> {
    await notificationService.removePushToken(user, pushTokenDto);
  }
}
