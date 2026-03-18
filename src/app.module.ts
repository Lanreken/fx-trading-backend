import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { FxModule } from './fx/fx.module';
import { TransactionEntity } from './transactions/entities/transaction.entity';
import { TransactionsModule } from './transactions/transactions.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { WalletBalance } from './wallet/entities/wallet-balance.entity';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<number>('DB_PORT') ?? 3306),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [User, WalletBalance, TransactionEntity],
        dropSchema: configService.get<string>('DB_DROP_SCHEMA') === 'true',
        synchronize: configService.get<string>('DB_SYNCHRONIZE') !== 'false',
        ssl:
          configService.get<string>('DB_SSL') === 'false'
            ? undefined
            : { rejectUnauthorized: false },
      }),
    }),
    UsersModule,
    WalletModule,
    FxModule,
    TransactionsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
