import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {UsersService} from '../users/users.service';
import { RightsService } from '../modules/speech/rights.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);
  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly rights: RightsService,
  ) {}

  async onModuleInit() {
    try {
      const seed = (this.config.get<string>('SEED_SUPERADMIN') ?? 'true').toLowerCase() !== 'false';
      if (!seed) return;

      const username = this.config.get<string>('ADMIN_USERNAME') || 'admin';
      const email = this.config.get<string>('ADMIN_EMAIL') || 'admin@example.com';
      const password = this.config.get<string>('ADMIN_PASSWORD') || 'secret';

      // exists?
      const existing = await this.users.findByUsername(username);
      if (existing) {
        this.logger.log(`Superadmin '${username}' existiert bereits`);
        // Ensure rights are admin
        await this.rights.update(String(existing._id), { role: 'admin' });
        return;
      }

      await this.users.register({ username, email, password });
      this.logger.log(`Superadmin '${username}' erzeugt`);

      // Default Rechte: admin
      const createdUser = await this.users.findByUsername(username);
      if (createdUser?._id) {
        await this.rights.update(String(createdUser._id), { role: 'admin' });
      } else {
        this.logger.warn(`Konnte ID für neu erstellten Superadmin '${username}' nicht ermitteln – Rechte nicht gesetzt`);
      }
      this.logger.log('Admin-Rechte gesetzt');
    } catch (e) {
      this.logger.error('Bootstrap (Superadmin-Seeding) fehlgeschlagen', e);
    }
  }
}
