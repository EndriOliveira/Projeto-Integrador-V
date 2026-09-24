import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../../shared/decorator/roles.decorator';
import { httpErrors } from '../../shared/errors/http-errors';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { AllReportsQueryDto } from './dto/request/allReportsQuery.dto';
import { ReportQueryDto } from './dto/request/reportQuery.dto';
import reportService from './report.service';

@Controller('reports')
@ApiTags('Report')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(Role.RH)
@ApiSecurity('JWT-auth')
export class ReportController {
  @Get('/timesheet')
  @ApiResponse({
    status: 200,
    description: 'Relatório de ponto gerado com sucesso (arquivo .xlsx)',
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  async getTimesheetReport(
    @GetUser() user: User,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await reportService.generateTimesheetReport(
      user,
      query,
    );
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get('/timesheet/all')
  @ApiResponse({
    status: 200,
    description:
      'Relatórios dos funcionários ativos (perfil Funcionário): .zip com uma pasta e um .xlsx por funcionário',
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  async getAllTimesheetReports(
    @Query() query: AllReportsQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } =
      await reportService.generateAllTimesheetReports(query);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    res.status(HttpStatus.OK).send(buffer);
  }
}
