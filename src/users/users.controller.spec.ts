import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    register: jest.fn(),
    verifyOtp: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('delegates register requests to the service', async () => {
    usersService.register.mockResolvedValue({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });

    await expect(
      controller.register({
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        password: 'password123',
      }),
    ).resolves.toEqual({ userId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(usersService.register).toHaveBeenCalledWith({
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@example.com',
      password: 'password123',
    });
  });

  it('delegates verification requests to the service', async () => {
    usersService.verifyOtp.mockResolvedValue({ message: 'User verified successfully' });

    await expect(
      controller.verify({ email: 'demo@example.com', otp: '123456' }),
    ).resolves.toEqual({ message: 'User verified successfully' });
    expect(usersService.verifyOtp).toHaveBeenCalledWith({
      email: 'demo@example.com',
      otp: '123456',
    });
  });
});
