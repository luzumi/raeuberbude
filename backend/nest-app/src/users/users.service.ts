import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    return this.register(dto);
  }

  async register(dto: CreateUserDto): Promise<UserEntity> {
    // Check if user exists (by username OR email)
    const existingUser = await this.userRepo.findOne({
      where: [
        { username: dto.username },
        { email: dto.email.toLowerCase() }
      ]
    });
    if (existingUser) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email.toLowerCase(),
      passwordHash
    });
    const saved = await this.userRepo.save(user);
    // Don't return passwordHash
    const { passwordHash: _, ...result } = saved;
    return result as UserEntity;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByIdentifier(identifier: string): Promise<UserEntity | null> {
    const byEmail = await this.findByEmail(identifier);
    if (byEmail) return byEmail;
    return this.findByUsername(identifier);
  }

  async validateLogin(identifier: string, password: string): Promise<UserEntity | null> {
    const user = await this.findByIdentifier(identifier);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    // Don't return passwordHash
    const { passwordHash: _, ...result } = user;
    return result as UserEntity;
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.userRepo.find();
    // Remove passwordHash from all users
    return users.map(({ passwordHash: _, ...user }) => user as UserEntity);
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    // Remove passwordHash
    const { passwordHash: _, ...result } = user;
    return result as UserEntity;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);

    // Remove passwordHash
    const { passwordHash: _, ...result } = updated;
    return result as UserEntity;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
