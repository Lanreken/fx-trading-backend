import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { requireEmail, requireString } from '../common/utils/validation';
import { MailService } from '../mail/mail.service';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  async register(payload: Record<string, unknown>) {
    const firstName = requireString(payload.firstName, 'firstName');
    const lastName = requireString(payload.lastName, 'lastName');
    const email = requireEmail(payload.email);
    const password = requireString(payload.password, 'password');

    if (password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with that email already exists');
    }

    const otpCode = this.generateOtp();
    const passwordHash = await bcrypt.hash(password, 10);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = this.usersRepository.create({
      firstName,
      lastName,
      email,
      passwordHash,
      otpCode,
      otpExpiresAt,
      isVerified: false,
    });

    const savedUser = await this.usersRepository.save(user);
    await this.mailService.sendOtpEmail(savedUser.email, otpCode);

    return {
      message: 'Registration successful. Check your email for the OTP.',
      userId: savedUser.id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      email: savedUser.email,
      otpExpiresAt: savedUser.otpExpiresAt,
    };
  }

  async verifyOtp(payload: Record<string, unknown>) {
    const email = requireEmail(payload.email);
    const otp = requireString(payload.otp, 'otp');
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      return {
        message: 'User is already verified',
        userId: user.id,
      };
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('No active OTP found for user');
    }

    if (user.otpCode !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP has expired');
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await this.usersRepository.save(user);

    return {
      message: 'User verified successfully',
      userId: user.id,
    };
  }

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
