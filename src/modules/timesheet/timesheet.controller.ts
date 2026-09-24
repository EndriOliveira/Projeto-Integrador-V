import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { Role } from '@prisma/client';
import { Roles } from '../../shared/decorator/roles.decorator';
import { httpErrors } from '../../shared/errors/http-errors';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PaidHoursQueryDto } from './dto/request/paidHoursQuery.dto';
import { UpsertPaidHoursDto } from './dto/request/upsertPaidHours.dto';
import { UpsertWorkDayDto } from './dto/request/upsertWorkDay.dto';
import { WorkDayQueryDto } from './dto/request/workDayQuery.dto';
import { PaidHoursResponseDto } from './dto/response/paidHours.response.dto';
import { WorkDayResponseDto } from './dto/response/workDay.response.dto';
import timesheetService from './timesheet.service';

// Dados complementares do relatório de ponto, mantidos pelo RH: apontamento
// do dia (cliente, projeto, periculosidade, RDO) e horas pagas por mês.
@Controller('timesheet')
@ApiTags('Timesheet')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(Role.RH)
@ApiSecurity('JWT-auth')
export class TimesheetController {
  @Get('/work-days')
  @ApiResponse({
    status: 200,
    description: 'Work days found successfully',
    type: [WorkDayResponseDto],
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async listWorkDays(
    @Query() query: WorkDayQueryDto,
  ): Promise<WorkDayResponseDto[]> {
    return await timesheetService.listWorkDays(query);
  }

  @Put('/work-days')
  @ApiResponse({
    status: 200,
    description: 'Work day saved successfully',
    type: WorkDayResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async upsertWorkDay(
    @Body() upsertWorkDayDto: UpsertWorkDayDto,
  ): Promise<WorkDayResponseDto> {
    return await timesheetService.upsertWorkDay(upsertWorkDayDto);
  }

  @Get('/paid-hours')
  @ApiResponse({
    status: 200,
    description: 'Paid hours found successfully',
    type: [PaidHoursResponseDto],
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async listPaidHours(
    @Query() query: PaidHoursQueryDto,
  ): Promise<PaidHoursResponseDto[]> {
    return await timesheetService.listPaidHours(query);
  }

  @Put('/paid-hours')
  @ApiResponse({
    status: 200,
    description: 'Paid hours saved successfully',
    type: PaidHoursResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async upsertPaidHours(
    @Body() upsertPaidHoursDto: UpsertPaidHoursDto,
  ): Promise<PaidHoursResponseDto> {
    return await timesheetService.upsertPaidHours(upsertPaidHoursDto);
  }
}
