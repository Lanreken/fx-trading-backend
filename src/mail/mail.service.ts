import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendOtpEmail(email: string, otpCode: string): Promise<void> {
    this.logger.log(`OTP for ${email}: ${otpCode}`);
  }
}
