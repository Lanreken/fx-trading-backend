import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Currency } from '../../common/enums/currency.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.transactions, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 32 })
  type: TransactionType;

  @Column({ type: 'varchar', length: 32 })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 3, nullable: true })
  fromCurrency: Currency | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  toCurrency: Currency | null;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  convertedAmount: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  rateUsed: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  reference: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
