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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DayType, Role } from '@prisma/client';
import { Roles } from '../../shared/decorator/roles.decorator';
import { httpErrors } from '../../shared/errors/http-errors';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateHolidayDto } from './dto/request/createHoliday.dto';
import { UpdateOvertimePolicyDto } from './dto/request/updateOvertimePolicy.dto';
import { HolidayResponseDto } from './dto/response/holiday.response.dto';
import { OvertimePolicyResponseDto } from './dto/response/overtimePolicy.response.dto';
import overtimePolicyService from './overtimePolicy.service';

@Controller('overtime-policies')
@ApiTags('Overtime Policy')
@UseGuards(AuthGuard(), RolesGuard)
@Roles(Role.RH)
@ApiSecurity('JWT-auth')
export class OvertimePolicyController {
  @Get('/')
  @ApiResponse({
    status: 200,
    description: 'Overtime policies found successfully',
    type: [OvertimePolicyResponseDto],
  })
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async listOvertimePolicies(): Promise<OvertimePolicyResponseDto[]> {
    return await overtimePolicyService.listOvertimePolicies();
  }

  @Patch('/:dayType')
  @ApiResponse({
    status: 200,
    description: 'Overtime policy updated successfully',
    type: OvertimePolicyResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async updateOvertimePolicy(
    @Param('dayType') dayType: DayType,
    @Body() updateOvertimePolicyDto: UpdateOvertimePolicyDto,
  ): Promise<OvertimePolicyResponseDto> {
    return await overtimePolicyService.updateOvertimePolicy(
      dayType,
      updateOvertimePolicyDto,
    );
  }

  @Get('/holidays')
  @ApiResponse({
    status: 200,
    description: 'Holidays found successfully',
    type: [HolidayResponseDto],
  })
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async listHolidays(): Promise<HolidayResponseDto[]> {
    return await overtimePolicyService.listHolidays();
  }

  @Post('/holidays')
  @ApiResponse({
    status: 201,
    description: 'Holiday created successfully',
    type: HolidayResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiConflictResponse(httpErrors.conflictError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async createHoliday(
    @Body() createHolidayDto: CreateHolidayDto,
  ): Promise<HolidayResponseDto> {
    return await overtimePolicyService.createHoliday(createHolidayDto);
  }

  @Delete('/holidays/:id')
  @ApiResponse({ status: 204, description: 'Holiday deleted successfully' })
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHoliday(@Param('id') id: string): Promise<void> {
    await overtimePolicyService.deleteHoliday(id);
  }
}
