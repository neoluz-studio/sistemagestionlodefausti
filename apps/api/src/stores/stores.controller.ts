import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { UpdateCurrentStoreDto } from './dto/update-current-store.dto';
import { StoresService } from './stores.service';

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('api/v1/stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obtener datos del local actual del usuario' })
  current(@CurrentUser() user: AuthUser) {
    return this.storesService.current(user);
  }

  @Patch('current')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar datos del local actual (solo ADMIN)' })
  updateCurrent(@CurrentUser() user: AuthUser, @Body() dto: UpdateCurrentStoreDto) {
    return this.storesService.updateCurrent(user, dto);
  }
}