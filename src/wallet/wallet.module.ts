import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerifiedUserGuard } from '../common/guards/verified-user.guard';
import { FxModule } from '../fx/fx.module';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { UsersModule } from '../users/users.module';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([WalletBalance, TransactionEntity]), FxModule, UsersModule],
  controllers: [WalletController],
  providers: [WalletService, VerifiedUserGuard],
  exports: [WalletService, TypeOrmModule],
})
export class WalletModule {}
