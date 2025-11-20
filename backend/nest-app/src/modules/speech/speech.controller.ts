import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  Logger,
  InternalServerErrorException,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SpeechService } from './speech.service';
import { RightsService } from './rights.service';
import { TerminalsService } from './terminals.service';
import { CreateHumanInputDto } from './dto/create-human-input.dto';
import { UpdateHumanInputDto } from './dto/update-human-input.dto';
import { CreateAppTerminalDto } from './dto/create-app-terminal.dto';
import { UpdateAppTerminalDto } from './dto/update-app-terminal.dto';
import { CreateUserRightsDto } from './dto/create-user-rights.dto';
import { UpdateUserRightsDto } from './dto/update-user-rights.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { STTProviderService } from './stt/stt.provider';
import { AudioConverterService } from './stt/audio-converter.service';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@ApiTags('speech')
@Controller('api/speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);

  constructor(
    private readonly speechService: SpeechService,
    private readonly rightsService: RightsService,
    private readonly terminalsService: TerminalsService,
    private readonly sttProvider: STTProviderService,
    private readonly audioConverter: AudioConverterService,
  ) {}

  // ============ Human Input Endpoints ============

  @Post('input')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new human input record' })
  @ApiResponse({ status: 201, description: 'Input created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient rights' })
  async createInput(@Body() createDto: CreateHumanInputDto, @Req() req: Request) {
    // Rechteprüfung optional: über ENV steuerbar (Default: AUS)
    if (process.env.SPEECH_RIGHTS_ENABLED === 'true') {
      await this.rightsService.checkPermission(createDto.userId, 'speech.use');
    }

    // Terminal aus Cookie auflösen, falls nicht im DTO enthalten
    const cookieName = 'rb_terminal_id';
    const cookieTerminalId = (req as any)?.cookies?.[cookieName] as string | undefined;
    let publicTerminalIdForActivity: string | null = null;
    if (!createDto.terminalId && cookieTerminalId) {
      try {
        const termDoc = await this.terminalsService.findByTerminalId(cookieTerminalId);
        if (termDoc?._id) {
          createDto.terminalId = String(termDoc._id);
          publicTerminalIdForActivity = termDoc.terminalId;
        }
      } catch { /* Terminal nicht gefunden – ignorieren */ }
    }

    // Terminal-Aktivität aktualisieren (Public-ID bevorzugt)
    try {
      if (publicTerminalIdForActivity) {
        await this.terminalsService.updateActivity(publicTerminalIdForActivity);
      } else if (cookieTerminalId) {
        await this.terminalsService.updateActivity(cookieTerminalId);
      }
    } catch (e) {
      this.logger.warn('updateActivity failed', (e as any)?.message || e);
    }

    const input = await this.speechService.create(createDto);
    this.logger.log(`Created input from user ${createDto.userId}`);

    return {
      success: true,
      data: input,
      message: 'Speech input recorded successfully',
    };
  }

  @Get('terminals/me')
  @ApiOperation({ summary: 'Get terminal bound to current cookie (rb_terminal_id)' })
  async getMyTerminal(@Req() req: Request) {
    const cookieName = 'rb_terminal_id';
    const cookieTerminalId = (req as any)?.cookies?.[cookieName] as string | undefined;
    if (!cookieTerminalId) {
      return {
        success: false,
        data: null,
        message: 'No terminal cookie present',
      };
    }

    try {
      const terminal = await this.terminalsService.findByTerminalId(cookieTerminalId);
      return { success: true, data: terminal };
    } catch { return { success: false, data: null, message: 'Terminal not found for cookie' }; }
  }

  @Post('terminals/claim')
  @ApiOperation({ summary: 'Bind current device to an existing terminalId (sets cookie)' })
  async claimTerminal(
    @Body('terminalId') terminalId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!terminalId) {
      throw new BadRequestException('terminalId is required');
    }
    const existing = await this.terminalsService.findByTerminalId(terminalId);
    const isProd = (process.env.NODE_ENV === 'production');
    const cookieName = 'rb_terminal_id';

    // In development we allow cross-site cookies by setting SameSite=None so browsers accept
    // the cookie when frontend and backend run on different origins (e.g. 4301 -> 3001).
    // Note: modern browsers require SameSite=None to be paired with 'Secure' in production/HTTPS.
    const cookieOptions: any = {
      httpOnly: true,
      sameSite: isProd ? 'lax' : 'none',
      secure: isProd, // keep secure in production
      maxAge: 365 * 24 * 60 * 60 * 1000,
    };

    res.cookie(cookieName, existing.terminalId, cookieOptions);
    await this.terminalsService.updateActivity(existing.terminalId);
    return { success: true, data: existing, message: 'Terminal claimed for this device' };
  }

  @Post('terminals/unclaim')
  @ApiOperation({ summary: 'Unbind current device from terminal (clears cookie)' })
  async unclaimTerminal(
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = 'rb_terminal_id';
    const isProd = (process.env.NODE_ENV === 'production');
    const clearOptions: any = {
      httpOnly: true,
      sameSite: isProd ? 'lax' : 'none',
      secure: isProd,
    };
    res.clearCookie(cookieName, clearOptions);
    return { success: true, message: 'Terminal unclaimed for this device' };
  }

  @Get('inputs')
  @ApiOperation({ summary: 'Get all human inputs with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'terminalId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'inputType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async getInputs(
    @Query('userId') userId?: string,
    @Query('terminalId') terminalId?: string,
    @Query('status') status?: string,
    @Query('inputType') inputType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const filters = { userId, terminalId, status, inputType, startDate, endDate };
    const options = { limit, skip };

    const inputs = await this.speechService.findAll(filters, options);

    return {
      success: true,
      data: inputs,
      count: inputs.length,
    };
  }

  @Get('inputs/latest')
  @ApiOperation({ summary: 'Get latest human inputs' })
  @ApiQuery({ name: 'count', required: false, type: Number })
  async getLatestInputs(@Query('count') count: number = 10) {
    const inputs = await this.speechService.findLatest(count);

    return {
      success: true,
      data: inputs,
      count: inputs.length,
    };
  }

  @Get('inputs/user/:userId')
  @ApiOperation({ summary: 'Get inputs by user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserInputs(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const inputs = await this.speechService.findByUser(userId, { limit, skip });

    return {
      success: true,
      data: inputs,
      count: inputs.length,
    };
  }

  @Get('inputs/:id')
  @ApiOperation({ summary: 'Get a specific human input by ID' })
  @ApiParam({ name: 'id', description: 'Input ID' })
  async getInput(@Param('id') id: string) {
    const input = await this.speechService.findOne(id);

    return {
      success: true,
      data: input,
    };
  }

  // ============ Speech-to-Text (STT) Endpoints ============

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio', {
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB max
    },
    storage: memoryStorage(),
    fileFilter: (req, file, callback) => {
      const allowedMimes = [
        'audio/webm',
        'audio/wav',
        'audio/wave',
        'audio/ogg',
        'audio/mpeg',
        'audio/mp3',
        'audio/x-wav',
        'audio/x-m4a',
      ];

      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`), false);
      }
    },
  }))
  @ApiOperation({ summary: 'Transcribe audio to text using STT providers' })
  @ApiResponse({ status: 200, description: 'Audio transcribed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid audio file or parameters' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 503, description: 'STT service unavailable' })
  async transcribeAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
    @Body('maxDurationMs') maxDurationMs?: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No audio file provided');
      }

      // Vorab: Status prüfen – schneller Fehler statt langer Timeout-Kette
      const providerStatus = await this.sttProvider.getProvidersStatus();
      const anyUp = Object.values(providerStatus).includes(true);
      if (!anyUp) {
        return {
          success: false,
          error: 'stt_unavailable',
          message: 'Kein STT Provider verfügbar',
          providers: providerStatus,
        };
      }

      this.logger.log(`Received audio for transcription: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

      const maxDuration = maxDurationMs ? Number.parseInt(maxDurationMs, 10) : 30000;
      const validation = await this.audioConverter.validateAudio(
        file.buffer,
        file.mimetype,
        maxDuration,
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.error || 'Invalid audio file');
      }

      // Transcribe audio
      const result = await this.sttProvider.transcribe(
        file.buffer,
        file.mimetype,
        language,
        maxDuration,
      );

      return {
        success: true,
        data: {
          provider: result.provider,
          transcript: result.transcript,
          confidence: result.confidence,
          durationMs: result.durationMs,
          language: result.language || language || 'de-DE',
          audioDurationMs: validation.duration,
        },
      };
    } catch (error) {
      const msg = (error as any)?.message || '';

      // Spezielle Behandlung: Alle Provider down
      if (msg.includes('All STT providers failed')) {
        const status = await this.sttProvider.getProvidersStatus().catch(() => ({}));
        this.logger.warn('STT unavailable for request');
        return {
          success: false,
          error: 'stt_unavailable',
          message: 'Alle STT Provider nicht verfügbar',
          providers: status,
        };
      }

      if (error instanceof BadRequestException) {
        throw error; // unverändert weiterreichen
      }

      this.logger.error(`Transcription failed: ${msg}`, (error as any)?.stack);

      // Service temporär nicht erreichbar / Timeout
      if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('unavailable')) {
        return {
          success: false,
          error: 'stt_timeout',
          message: 'STT Dienst vorübergehend nicht erreichbar',
        };
      }

      return {
        success: false,
        error: 'stt_failure',
        message: msg || 'Transcription failed',
      };
    }
  }

  @Get('transcribe/status')
  @ApiOperation({ summary: 'Get STT providers status' })
  @ApiResponse({ status: 200, description: 'Provider status retrieved' })
  async getTranscribeStatus() {
    const status = await this.sttProvider.getProvidersStatus();

    return {
      success: true,
      data: {
        providers: status,
        config: {
          primary: process.env.STT_PRIMARY || 'vosk',
          secondary: process.env.STT_SECONDARY || 'whisper',
          language: process.env.STT_LANG || 'de-DE',
        },
      },
    };
  }

  @Put('inputs/:id')
  @ApiOperation({ summary: 'Update a human input' })
  @ApiParam({ name: 'id', description: 'Input ID' })
  async updateInput(
    @Param('id') id: string,
    @Body() updateDto: UpdateHumanInputDto,
  ) {
    const input = await this.speechService.update(id, updateDto);

    return {
      success: true,
      data: input,
      message: 'Input updated successfully',
    };
  }

  @Delete('inputs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a human input' })
  @ApiParam({ name: 'id', description: 'Input ID' })
  async deleteInput(@Param('id') id: string) {
    await this.speechService.delete(id);
  }

  @Get('inputs/stats')
  @ApiOperation({ summary: 'Get input statistics' })
  @ApiQuery({ name: 'userId', required: false })
  async getInputStats(@Query('userId') userId?: string) {
    const stats = await this.speechService.getStatistics(userId);

    return {
      success: true,
      data: stats,
    };
  }

  // ============ Terminal Management Endpoints ============

  @Post('terminals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new app terminal' })
  async createTerminal(@Body() createDto: CreateAppTerminalDto) {
    const terminal = await this.terminalsService.create(createDto);

    return {
      success: true,
      data: terminal,
      message: 'Terminal created successfully',
    };
  }

  @Post('terminals/register')
  @ApiOperation({ summary: 'Register or update a terminal' })
  async registerTerminal(@Body() terminalData: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const cookieName = 'rb_terminal_id';
      let termId = (req as any)?.cookies?.[cookieName] as string | undefined;
      if (!termId) {
        termId = randomUUID();
        const secure = (process.env.NODE_ENV === 'production');
        res.cookie(cookieName, termId, {
          httpOnly: true,
          sameSite: 'lax',
          secure,
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 Jahr
        });
      } else {
        // Refresh cookie expiration
        const secure = (process.env.NODE_ENV === 'production');
        res.cookie(cookieName, termId, {
          httpOnly: true,
          sameSite: 'lax',
          secure,
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
      }

      const terminal = await this.terminalsService.registerTerminal({
        ...terminalData,
        terminalId: termId,
      });

      return {
        success: true,
        data: terminal,
        message: 'Terminal registered successfully',
      };
    } catch (err: any) {
      this.logger.error('registerTerminal failed', err?.stack || err);
      // Bekannte Nest-HTTP-Exceptions durchreichen, Unbekannte als 500 melden
      if (err && typeof err.getStatus === 'function') throw err;
      throw new InternalServerErrorException(err?.message || 'Failed to claim terminal');
    }
  }

  @Get('terminals')
  @ApiOperation({ summary: 'Get all terminals' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'location', required: false })
  async getTerminals(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
  ) {
    const filters = { type, status, location };
    const terminals = await this.terminalsService.findAll(filters);
    return {
      success: true,
      data: terminals,
      count: terminals.length,
    };
  }

  @Get('terminals/active')
  @ApiOperation({ summary: 'Get active terminals' })
  async getActiveTerminals() {
    const terminals = await this.terminalsService.getActiveTerminals();

    return {
      success: true,
      data: terminals,
      count: terminals.length,
    };
  }

  @Get('terminals/stats')
  @ApiOperation({ summary: 'Get terminal statistics' })
  async getTerminalStats() {
    const stats = await this.terminalsService.getStatistics();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('terminals/:id')
  @ApiOperation({ summary: 'Get a specific terminal' })
  @ApiParam({ name: 'id', description: 'Terminal ID or terminalId' })
  async getTerminal(@Param('id') id: string) {
    const terminal = await this.terminalsService.findOne(id);

    return {
      success: true,
      data: terminal,
    };
  }

  @Put('terminals/:id')
  @ApiOperation({ summary: 'Update a terminal' })
  @ApiParam({ name: 'id', description: 'Terminal ID or terminalId' })
  async updateTerminal(
    @Param('id') id: string,
    @Body() updateDto: UpdateAppTerminalDto,
  ) {
    const terminal = await this.terminalsService.update(id, updateDto);

    return {
      success: true,
      data: terminal,
      message: 'Terminal updated successfully',
    };
  }

  @Put('terminals/:id/status')
  @ApiOperation({ summary: 'Update terminal status' })
  @ApiParam({ name: 'id', description: 'Terminal ID' })
  async updateTerminalStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'inactive' | 'maintenance',
  ) {
    const terminal = await this.terminalsService.setStatus(id, status);

    return {
      success: true,
      data: terminal,
      message: `Terminal status updated to ${status}`,
    };
  }

  @Put('terminals/:id/assign')
  @ApiOperation({ summary: 'Assign user to terminal' })
  @ApiParam({ name: 'id', description: 'Terminal ID' })
  async assignTerminal(
    @Param('id') id: string,
    @Body('userId') userId: string | null,
  ) {
    const terminal = await this.terminalsService.assignUser(id, userId);

    return {
      success: true,
      data: terminal,
      message: userId ? 'Terminal assigned successfully' : 'Terminal unassigned',
    };
  }

  @Delete('terminals/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a terminal' })
  @ApiParam({ name: 'id', description: 'Terminal ID' })
  async deleteTerminal(@Param('id') id: string) {
    await this.terminalsService.delete(id);
  }

  // ============ Rights Management Endpoints ============

  @Post('rights')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create user rights' })
  async createRights(@Body() createDto: CreateUserRightsDto) {
    const rights = await this.rightsService.create(createDto);

    return {
      success: true,
      data: rights,
      message: 'User rights created successfully',
    };
  }

  @Get('rights')
  @ApiOperation({ summary: 'Get all user rights' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getRights(
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const filters = { role, status };
    const rights = await this.rightsService.findAll(filters);

    return {
      success: true,
      data: rights,
      count: rights.length,
    };
  }

  @Get('rights/stats')
  @ApiOperation({ summary: 'Get rights statistics' })
  async getRightsStats() {
    const stats = await this.rightsService.getRoleStatistics();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('rights/user/:userId')
  @ApiOperation({ summary: 'Get rights for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserRights(@Param('userId') userId: string) {
    const rights = await this.rightsService.findByUserId(userId);

    return {
      success: true,
      data: rights,
    };
  }

  @Put('rights/user/:userId')
  @ApiOperation({ summary: 'Update user rights' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async updateRights(
    @Param('userId') userId: string,
    @Body() updateDto: UpdateUserRightsDto,
  ) {
    const rights = await this.rightsService.update(userId, updateDto);

    return {
      success: true,
      data: rights,
      message: 'User rights updated successfully',
    };
  }

  @Put('rights/user/:userId/role')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async assignRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    const rights = await this.rightsService.assignRole(userId, role);

    return {
      success: true,
      data: rights,
      message: `Role ${role} assigned successfully`,
    };
  }

  @Put('rights/user/:userId/permission/grant')
  @ApiOperation({ summary: 'Grant permission to user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async grantPermission(
    @Param('userId') userId: string,
    @Body('permission') permission: string,
  ) {
    const rights = await this.rightsService.grantPermission(userId, permission);

    return {
      success: true,
      data: rights,
      message: `Permission ${permission} granted`,
    };
  }

  @Put('rights/user/:userId/permission/revoke')
  @ApiOperation({ summary: 'Revoke permission from user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async revokePermission(
    @Param('userId') userId: string,
    @Body('permission') permission: string,
  ) {
    const rights = await this.rightsService.revokePermission(userId, permission);

    return {
      success: true,
      data: rights,
      message: `Permission ${permission} revoked`,
    };
  }

  @Put('rights/user/:userId/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async suspendUser(
    @Param('userId') userId: string,
    @Body('reason') reason?: string,
  ) {
    const rights = await this.rightsService.suspendUser(userId, reason);

    return {
      success: true,
      data: rights,
      message: 'User suspended',
    };
  }

  @Put('rights/user/:userId/activate')
  @ApiOperation({ summary: 'Activate user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async activateUser(@Param('userId') userId: string) {
    const rights = await this.rightsService.activateUser(userId);

    return {
      success: true,
      data: rights,
      message: 'User activated',
    };
  }

  @Delete('rights/user/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user rights' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async deleteRights(@Param('userId') userId: string) {
    await this.rightsService.delete(userId);
  }

  @Get('rights/check/:userId/:permission')
  @ApiOperation({ summary: 'Check if user has permission' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'permission', description: 'Permission to check' })
  async checkPermission(
    @Param('userId') userId: string,
    @Param('permission') permission: string,
  ) {
    const hasPermission = await this.rightsService.hasPermission(userId, permission);

    return {
      success: true,
      hasPermission,
    };
  }
}
