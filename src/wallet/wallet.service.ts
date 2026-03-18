import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import {
  requireCurrency,
  requirePositiveAmount,
  requireString,
  requireUuid,
} from '../common/utils/validation';
import { FxRatesService } from '../fx/fx-rates.service';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { WalletBalance } from './entities/wallet-balance.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly fxRatesService: FxRatesService,
  ) {}

  async getWallet(userIdInput: unknown) {
    const userId = requireUuid(userIdInput, 'userId');
    const balances = await this.walletBalanceRepository.find({
      where: { userId },
      order: { currency: 'ASC' },
    });

    return {
      userId,
      balances: balances.map((balance) => ({
        currency: balance.currency,
        balance: Number(balance.balance),
      })),
    };
  }

  async fundWallet(userIdInput: unknown, payload: Record<string, unknown>) {
    const userId = requireUuid(userIdInput, 'userId');
    const currency = requireCurrency(payload.currency ?? Currency.NGN, 'currency');
    const amount = requirePositiveAmount(payload.amount);
    const idempotencyKey = this.optionalString(payload.idempotencyKey);

    return this.dataSource.transaction(async (manager) => {
      const existingTransaction = await this.findExistingIdempotentTransaction(
        manager,
        userId,
        idempotencyKey,
      );
      if (existingTransaction) {
        return existingTransaction;
      }

      const wallet = await this.getOrCreateLockedBalance(manager, userId, currency);
      const currentBalance = Number(wallet.balance);
      wallet.balance = this.toDbAmount(currentBalance + amount);
      await manager.save(wallet);

      const transaction = manager.create(TransactionEntity, {
        userId,
        type: TransactionType.FUNDING,
        status: TransactionStatus.SUCCESS,
        fromCurrency: currency,
        toCurrency: currency,
        amount: this.toDbAmount(amount),
        convertedAmount: this.toDbAmount(amount),
        rateUsed: this.toDbRate(1),
        reference: this.generateReference('fund'),
        idempotencyKey,
        metadata: { source: 'manual-funding' },
      });

      return manager.save(transaction);
    });
  }

  async convertCurrency(
    userIdInput: unknown,
    payload: Record<string, unknown>,
    type: TransactionType,
  ) {
    const userId = requireUuid(userIdInput, 'userId');
    const fromCurrency = requireCurrency(payload.fromCurrency, 'fromCurrency');
    const toCurrency = requireCurrency(payload.toCurrency, 'toCurrency');
    const amount = requirePositiveAmount(payload.amount);
    const idempotencyKey = this.optionalString(payload.idempotencyKey);

    if (fromCurrency === toCurrency) {
      throw new BadRequestException('fromCurrency and toCurrency must be different');
    }

    const isNairaPair = fromCurrency === Currency.NGN || toCurrency === Currency.NGN;
    if (!isNairaPair) {
      throw new BadRequestException('Only NGN pairs are supported for conversions and trades');
    }

    const rate = await this.fxRatesService.getRate(fromCurrency, toCurrency);
    const convertedAmount = this.roundAmount(amount * rate);

    return this.dataSource.transaction(async (manager) => {
      const existingTransaction = await this.findExistingIdempotentTransaction(
        manager,
        userId,
        idempotencyKey,
      );
      if (existingTransaction) {
        return existingTransaction;
      }

      const sourceWallet = await this.getOrCreateLockedBalance(manager, userId, fromCurrency);
      const targetWallet = await this.getOrCreateLockedBalance(manager, userId, toCurrency);

      const sourceBalance = Number(sourceWallet.balance);
      if (sourceBalance < amount) {
        throw new BadRequestException(
          `Insufficient balance in ${fromCurrency}. Available balance is ${sourceBalance}`,
        );
      }

      sourceWallet.balance = this.toDbAmount(sourceBalance - amount);
      targetWallet.balance = this.toDbAmount(Number(targetWallet.balance) + convertedAmount);

      await manager.save([sourceWallet, targetWallet]);

      const transaction = manager.create(TransactionEntity, {
        userId,
        type,
        status: TransactionStatus.SUCCESS,
        fromCurrency,
        toCurrency,
        amount: this.toDbAmount(amount),
        convertedAmount: this.toDbAmount(convertedAmount),
        rateUsed: this.toDbRate(rate),
        reference: this.generateReference(type.toLowerCase()),
        idempotencyKey,
        metadata: {
          pair: `${fromCurrency}/${toCurrency}`,
        },
      });

      return manager.save(transaction);
    });
  }

  async transfer(userIdInput: unknown, payload: Record<string, unknown>) {
    const senderId = requireUuid(userIdInput, 'userId');
    const recipientUserId = requireUuid(payload.recipientUserId, 'recipientUserId');
    const currency = requireCurrency(payload.currency, 'currency');
    const amount = requirePositiveAmount(payload.amount);
    const idempotencyKey = this.optionalString(payload.idempotencyKey);

    if (senderId === recipientUserId) {
      throw new BadRequestException('Cannot transfer to the same user');
    }

    return this.dataSource.transaction(async (manager) => {
      const existingTransaction = await this.findExistingIdempotentTransaction(
        manager,
        senderId,
        idempotencyKey,
      );
      if (existingTransaction) {
        return existingTransaction;
      }

      const recipient = await manager.findOne(User, { where: { id: recipientUserId } });
      if (!recipient) {
        throw new NotFoundException('Recipient user not found');
      }

      if (!recipient.isVerified) {
        throw new BadRequestException('Recipient user must be verified');
      }

      const senderWallet = await this.getOrCreateLockedBalance(manager, senderId, currency);
      const recipientWallet = await this.getOrCreateLockedBalance(manager, recipientUserId, currency);

      const senderBalance = Number(senderWallet.balance);
      if (senderBalance < amount) {
        throw new BadRequestException(
          `Insufficient balance in ${currency}. Available balance is ${senderBalance}`,
        );
      }

      senderWallet.balance = this.toDbAmount(senderBalance - amount);
      recipientWallet.balance = this.toDbAmount(Number(recipientWallet.balance) + amount);

      await manager.save([senderWallet, recipientWallet]);

      const senderTransaction = manager.create(TransactionEntity, {
        userId: senderId,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.SUCCESS,
        fromCurrency: currency,
        toCurrency: currency,
        amount: this.toDbAmount(amount),
        convertedAmount: this.toDbAmount(amount),
        rateUsed: this.toDbRate(1),
        reference: this.generateReference('transfer'),
        idempotencyKey,
        metadata: {
          direction: 'debit',
          recipientUserId,
        },
      });

      const recipientTransaction = manager.create(TransactionEntity, {
        userId: recipientUserId,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.SUCCESS,
        fromCurrency: currency,
        toCurrency: currency,
        amount: this.toDbAmount(amount),
        convertedAmount: this.toDbAmount(amount),
        rateUsed: this.toDbRate(1),
        reference: this.generateReference('transfer-credit'),
        idempotencyKey: null,
        metadata: {
          direction: 'credit',
          senderUserId: senderId,
        },
      });

      await manager.save([senderTransaction, recipientTransaction]);
      return senderTransaction;
    });
  }

  private async getOrCreateLockedBalance(
    manager: EntityManager,
    userId: string,
    currency: Currency,
  ): Promise<WalletBalance> {
    let wallet = await manager.findOne(WalletBalance, {
      where: { userId, currency },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      wallet = manager.create(WalletBalance, {
        userId,
        currency,
        balance: this.toDbAmount(0),
      });
      wallet = await manager.save(wallet);
    }

    return wallet;
  }

  private async findExistingIdempotentTransaction(
    manager: EntityManager,
    userId: string,
    idempotencyKey: string | null,
  ) {
    if (!idempotencyKey) {
      return null;
    }

    return manager.findOne(TransactionEntity, {
      where: { userId, idempotencyKey },
    });
  }

  private generateReference(prefix: string): string {
    return `TXN-${prefix.toUpperCase()}-${randomUUID().split('-')[0].toUpperCase()}`;
  }

  private optionalString(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return requireString(value, 'idempotencyKey');
  }

  private roundAmount(value: number): number {
    return Math.round(value * 100000000) / 100000000;
  }

  private toDbAmount(value: number): string {
    return this.roundAmount(value).toFixed(8);
  }

  private toDbRate(value: number): string {
    return value.toFixed(10);
  }
}
