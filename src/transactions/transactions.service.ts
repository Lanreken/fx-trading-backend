import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { requireUuid } from '../common/utils/validation';
import { TransactionEntity } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionsRepository: Repository<TransactionEntity>,
  ) {}

  async listForUser(userIdInput: unknown) {
    const userId = requireUuid(userIdInput, 'userId');
    return this.transactionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
