import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Currency } from '../common/enums/currency.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { FxRatesService } from '../fx/fx-rates.service';
import { User } from '../users/entities/user.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { WalletBalance } from './entities/wallet-balance.entity';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  const senderUserId = '550e8400-e29b-41d4-a716-446655440000';
  const recipientUserId = '550e8400-e29b-41d4-a716-446655440001';
  const walletBalanceRepository = {
    find: jest.fn(),
  };
  const transactionRepository = {};
  const fxRatesService = {
    getRate: jest.fn(),
  } as unknown as FxRatesService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns wallet balances', async () => {
    walletBalanceRepository.find.mockResolvedValue([
      { currency: Currency.NGN, balance: '1000.00000000' },
    ]);

    const service = new WalletService(
      walletBalanceRepository as any,
      transactionRepository as any,
      {} as DataSource,
      fxRatesService,
    );

    await expect(service.getWallet(senderUserId)).resolves.toEqual({
      userId: senderUserId,
      balances: [{ currency: Currency.NGN, balance: 1000 }],
    });
  });

  it('rejects non-ngn cross pairs', async () => {
    const service = new WalletService(
      walletBalanceRepository as any,
      transactionRepository as any,
      {} as DataSource,
      fxRatesService,
    );

    await expect(
      service.convertCurrency(
        senderUserId,
        { fromCurrency: 'USD', toCurrency: 'EUR', amount: 10 },
        TransactionType.CONVERSION,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects transfer when recipient does not exist', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const dataSource = {
      transaction: jest.fn(async (callback: (manager: any) => Promise<unknown>) => callback(manager)),
    } as unknown as DataSource;

    const service = new WalletService(
      walletBalanceRepository as any,
      transactionRepository as any,
      dataSource,
      fxRatesService,
    );

    await expect(
      service.transfer(senderUserId, {
        recipientUserId,
        currency: 'NGN',
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.findOne).toHaveBeenCalledWith(User, { where: { id: recipientUserId } });
  });
});
