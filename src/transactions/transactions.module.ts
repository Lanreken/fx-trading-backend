import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerifiedUserGuard } from '../common/guards/verified-user.guard';
import { UsersModule } from '../users/users.module';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionEntity]), UsersModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, VerifiedUserGuard],
  exports: [TypeOrmModule, TransactionsService],
})
export class TransactionsModule {}
