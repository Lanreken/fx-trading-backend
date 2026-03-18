import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailService } from '../mail/mail.service';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const usersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mailService = {
    sendOtpEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('registers a new user and sends an OTP email', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.create.mockImplementation((payload: Record<string, unknown>) => payload);
    usersRepository.save.mockImplementation(async (payload: Record<string, unknown>) => ({
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...payload,
    }));

    const result = await service.register({
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@example.com',
      password: 'password123',
    });

    expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.firstName).toBe('Demo');
    expect(result.lastName).toBe('User');
    expect(result.email).toBe('demo@example.com');
    expect(usersRepository.save).toHaveBeenCalled();
    expect(mailService.sendOtpEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate email registration', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'demo@example.com',
    });

    await expect(
      service.register({
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
