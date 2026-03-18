import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FxController } from './fx.controller';
import { FxRatesService } from './fx-rates.service';

@Module({
  imports: [ConfigModule],
  controllers: [FxController],
  providers: [FxRatesService],
  exports: [FxRatesService],
})
export class FxModule {}
