import {
  Body,
  Controller,
  Delete,
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
import { FindSchedulesQueryDto } from './dto/request/getSchedulesQuery.dto';
import { UpdateScheduleDto } from './dto/request/updateSchedule.dto';
import { CreateScheduleResponseDto } from './dto/response/createSchedule.response.dto';
import { GetScheduleResponseDto } from './dto/response/getSchedule.response.dto';
import { GetSchedulesResponseDto } from './dto/response/getSchedules.response.dto';
import { UpdateScheduleResponseDto } from './dto/response/updateSchedule.response.dto';
import scheduleService from './schedule.service';

@Controller('schedule')
@ApiTags('Schedule')
export class ScheduleController {
  @Post('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'New schedule created successfully',
    type: CreateScheduleResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(
    @GetUser() user: User,
  ): Promise<CreateScheduleResponseDto> {
    return await scheduleService.createSchedule(user);
  }

  @Put('/:id')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Schedule updated successfully',
    type: UpdateScheduleResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async updateSchedule(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ): Promise<UpdateScheduleResponseDto> {
    return await scheduleService.updateSchedule(id, user, updateScheduleDto);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 204,
    description: 'Schedule deleted successfully',
  })
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    return await scheduleService.deleteSchedule(user, id);
  }

  @Get('/user/:userId')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Schedules found successfully',
    type: GetSchedulesResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async listSchedulesByUser(
    @Param('userId') userId: string,
    @Query() query: FindSchedulesQueryDto,
  ): Promise<GetSchedulesResponseDto> {
    return await scheduleService.listSchedulesByUser(userId, query);
  }

  @Get('/:id')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Schedule found successfully',
    type: GetScheduleResponseDto,
  })
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async getSchedule(@Param('id') id: string): Promise<GetScheduleResponseDto> {
    return await scheduleService.getSchedule(id);
  }
}
