import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { VerifiedUserGuard } from '../common/guards/verified-user.guard';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(VerifiedUserGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  list(@Req() request: Record<string, any>) {
    return this.transactionsService.listForUser(request.user.id);
  }
}
