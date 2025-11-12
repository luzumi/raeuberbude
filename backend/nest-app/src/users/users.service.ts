import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<User> {
    return this.register(dto);
  }

  async register(dto: CreateUserDto): Promise<User> {
    const exists = await this.userModel.findOne({ $or: [ { username: dto.username }, { email: dto.email.toLowerCase() } ] });
    if (exists) throw new BadRequestException('User already exists');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = new this.userModel({ username: dto.username, email: dto.email.toLowerCase(), passwordHash });
    const saved = await created.save();
    const obj = saved.toObject();
    delete (obj as any).passwordHash;
    return obj as unknown as User;
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username });
  }
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findByIdentifier(identifier: string): Promise<UserDocument | null> {
    const byEmail = await this.findByEmail(identifier);
    if (byEmail) return byEmail;
    return this.findByUsername(identifier);
  }

  async validateLogin(identifier: string, password: string): Promise<User | null> {
    const user = await this.findByIdentifier(identifier);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const obj = user.toObject();
    delete (obj as any).passwordHash;
    return obj as unknown as User;
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-passwordHash').lean();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-passwordHash').lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const updated = await this.userModel.findByIdAndUpdate(id, dto, { new: true }).lean();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const res = await this.userModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('User not found');
  }
}
