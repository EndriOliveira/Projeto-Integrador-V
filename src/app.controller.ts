import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessageResponseDto } from './shared/dto/message.response.dto';

@Controller()
@ApiTags('Api')
export class AppController {
  @Get('/ok')
  @ApiResponse({
    status: 200,
    description: 'Server is up and running!',
    type: MessageResponseDto,
  })
  getHello(): MessageResponseDto {
    return {
      message: 'Hello, world!',
    };
  }
}
