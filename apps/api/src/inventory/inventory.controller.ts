import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/types/auth-user.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMovementDto } from './dto/create-movement.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('movements')
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  movements(@CurrentUser() user: AuthUser) {
    return this.inventoryService.movements(user);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Registrar movimiento de inventario' })
  createMovement(@CurrentUser() user: AuthUser, @Body() dto: CreateMovementDto) {
    return this.inventoryService.createMovement(user, dto);
  }
}