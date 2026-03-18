import { Controller, Get, Query } from '@nestjs/common';
import { FxRatesService } from './fx-rates.service';

@Controller('fx')
export class FxController {
  constructor(private readonly fxRatesService: FxRatesService) {}

  @Get('rates')
  getRates(@Query('base') base?: string, @Query('symbols') symbols?: string) {
    return this.fxRatesService.getRates(base ?? 'NGN', symbols);
  }
}
