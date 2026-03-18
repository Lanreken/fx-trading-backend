import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Currency } from '../../common/enums/currency.enum';
import { User } from '../../users/entities/user.entity';

@Entity('wallet_balances')
@Unique(['userId', 'currency'])
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.walletBalances, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 3 })
  currency: Currency;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  balance: string;
}
