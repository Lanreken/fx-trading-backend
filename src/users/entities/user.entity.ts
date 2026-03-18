import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionEntity } from '../../transactions/entities/transaction.entity';
import { WalletBalance } from '../../wallet/entities/wallet-balance.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otpCode: string | null;

  @Column({ type: 'datetime', nullable: true })
  otpExpiresAt: Date | null;

  @OneToMany(() => WalletBalance, (walletBalance) => walletBalance.user)
  walletBalances: WalletBalance[];

  @OneToMany(() => TransactionEntity, (transaction) => transaction.user)
  transactions: TransactionEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
