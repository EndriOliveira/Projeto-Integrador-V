import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { CreateScheduleDto } from './dto/request/createSchedule.dto';
import { UpdateScheduleDto } from './dto/request/updateSchedule.dto';
import { CreateScheduleResponseDto } from './dto/response/createSchedule.response.dto';
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
    @Body() createScheduleDto: CreateScheduleDto,
  ): Promise<CreateScheduleResponseDto> {
    return await scheduleService.createSchedule(user, createScheduleDto);
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
}
