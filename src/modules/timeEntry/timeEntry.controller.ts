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
import { CreateManualTimeEntryDto } from './dto/request/createManualTimeEntry.dto';
import { CreateTimeEntryDto } from './dto/request/createTimeEntry.dto';
import { DeleteTimeEntryDto } from './dto/request/deleteTimeEntry.dto';
import { FindTimeEntriesQueryDto } from './dto/request/findTimeEntriesQuery.dto';
import { SyncTimeEntriesDto } from './dto/request/syncTimeEntries.dto';
import { UpdateTimeEntryDto } from './dto/request/updateTimeEntry.dto';
import { FindTimeEntriesResponseDto } from './dto/response/findTimeEntries.response.dto';
import { SyncTimeEntriesResponseDto } from './dto/response/syncTimeEntries.response.dto';
import { TimeEntryResponseDto } from './dto/response/timeEntry.response.dto';
import timeEntryService from './timeEntry.service';

@Controller('time-entries')
@ApiTags('Time Entries')
export class TimeEntryController {
  @Post('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Time entry created successfully',
    type: TimeEntryResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async createTimeEntry(
    @GetUser() user: User,
    @Body() createTimeEntryDto: CreateTimeEntryDto,
  ): Promise<TimeEntryResponseDto> {
    return await timeEntryService.createTimeEntry(user, createTimeEntryDto);
  }

  @Post('/manual')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiBody({ type: CreateManualTimeEntryDto })
  @ApiResponse({
    status: 201,
    description: 'Manual time entry created successfully',
    type: TimeEntryResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async createManualTimeEntry(
    @GetUser() user: User,
    @Body() createManualTimeEntryDto: CreateManualTimeEntryDto,
  ): Promise<TimeEntryResponseDto> {
    return await timeEntryService.createManualTimeEntry(
      user,
      createManualTimeEntryDto,
    );
  }

  @Post('/sync')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Time entries synced successfully',
    type: SyncTimeEntriesResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.CREATED)
  async syncTimeEntries(
    @GetUser() user: User,
    @Body() syncTimeEntriesDto: SyncTimeEntriesDto,
  ): Promise<SyncTimeEntriesResponseDto> {
    return await timeEntryService.syncTimeEntries(user, syncTimeEntriesDto);
  }

  @Get('/')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Time entries found successfully',
    type: FindTimeEntriesResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async listTimeEntries(
    @GetUser() user: User,
    @Query() query: FindTimeEntriesQueryDto,
  ): Promise<FindTimeEntriesResponseDto> {
    return await timeEntryService.listTimeEntries(user, query);
  }

  // RH altera qualquer marcação; os demais perfis só as próprias (ver service).
  @Patch('/:id')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Time entry updated successfully',
    type: TimeEntryResponseDto,
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.OK)
  async updateTimeEntry(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() updateTimeEntryDto: UpdateTimeEntryDto,
  ): Promise<TimeEntryResponseDto> {
    return await timeEntryService.updateTimeEntry(id, user, updateTimeEntryDto);
  }

  @Delete('/:id')
  @UseGuards(AuthGuard())
  @ApiSecurity('JWT-auth')
  @ApiResponse({
    status: 204,
    description: 'Time entry deleted successfully',
  })
  @ApiBadRequestResponse(httpErrors.badRequestError)
  @ApiForbiddenResponse(httpErrors.forbiddenError)
  @ApiNotFoundResponse(httpErrors.notFoundError)
  @ApiUnauthorizedResponse(httpErrors.unauthorizedError)
  @ApiInternalServerErrorResponse(httpErrors.internalServerError)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTimeEntry(
    @Param('id') id: string,
    @GetUser() user: User,
    @Body() deleteTimeEntryDto: DeleteTimeEntryDto,
  ): Promise<void> {
    await timeEntryService.deleteTimeEntry(id, user, deleteTimeEntryDto);
  }
}
