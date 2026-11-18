import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;
const PG_UNIQUE_VIOLATION = '23505';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isUniqueViolation = (error: any) =>
  error?.code === PG_UNIQUE_VIOLATION || error?.driverError?.code === PG_UNIQUE_VIOLATION;

@Injectable()
export class AuthService {
  // Used when the email is unknown, so login takes about the same time either way
  private readonly dummyHash = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
     console.log(dto,password)
    try {
      const user = await this.userRepository.save(
        this.userRepository.create({
          email: normalizeEmail(dto.email),
          password,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
        }),
      );
      return this.buildAuthResponse(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: normalizeEmail(dto.email) },
    });

    const passwordMatches = await bcrypt.compare(dto.password, user?.password ?? this.dummyHash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async validateUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toPublicUser(user);
  }

  private buildAuthResponse(user: User) {
    return {
      user: this.toPublicUser(user),
      token: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}