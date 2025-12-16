import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import {User} from './entities';

@Injectable()
export class AppUsersService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async create(dto: CreateUserDto): Promise<User> {
    return this.register(dto);
  }

  async register(dto: CreateUserDto): Promise<User> {
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
      password: passwordHash
    } as unknown as User);
    const saved = await this.userRepo.save(user);
    // Don't return passwordHash
    const { password: _, ...result } = saved;
    return result as User;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const byEmail = await this.findByEmail(identifier);
    if (byEmail) return byEmail;
    return this.findByUsername(identifier);
  }

  async validateLogin(identifier: string, password: string): Promise<User | null> {
    const user = await this.findByIdentifier(identifier);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    // Don't return passwordHash
    const { password: _, ...result } = user;
    return result as User;
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepo.find();
    // Remove passwordHash from all users
    return users.map(({ password: _, ...user }) => user as User);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    // Remove passwordHash
    const { password: _, ...result } = user;
    return result as User;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, dto);
    const updated = await this.userRepo.save(user);

    // Remove passwordHash
    const { password: _, ...result } = updated;
    return result as User;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
