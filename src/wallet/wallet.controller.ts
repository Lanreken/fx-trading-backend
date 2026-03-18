import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { VerifiedUserGuard } from '../common/guards/verified-user.guard';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(VerifiedUserGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@Req() request: Record<string, any>) {
    return this.walletService.getWallet(request.user.id);
  }

  @Post('fund')
  fund(@Req() request: Record<string, any>, @Body() payload: Record<string, unknown>) {
    return this.walletService.fundWallet(request.user.id, payload);
  }

  @Post('convert')
  convert(@Req() request: Record<string, any>, @Body() payload: Record<string, unknown>) {
    return this.walletService.convertCurrency(request.user.id, payload, TransactionType.CONVERSION);
  }

  @Post('trade')
  trade(@Req() request: Record<string, any>, @Body() payload: Record<string, unknown>) {
    return this.walletService.convertCurrency(request.user.id, payload, TransactionType.TRADE);
  }

  @Post('transfer')
  transfer(@Req() request: Record<string, any>, @Body() payload: Record<string, unknown>) {
    return this.walletService.transfer(request.user.id, payload);
  }
}
