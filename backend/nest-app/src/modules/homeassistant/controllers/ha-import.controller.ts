import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { HaImportService } from '../services/ha-import.service';
import { HaSnapshot } from '../schemas/ha-snapshot.schema';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Express } from 'express';

// Ensure uploads directory exists at module load (Multer writes before handler runs)
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@ApiTags('HomeAssistant Import')
@Controller('api/homeassistant/import')
export class HaImportController {
  constructor(private readonly importService: HaImportService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file', {
    dest: UPLOAD_DIR,
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'application/json') {
        return cb(new Error('Only JSON files are allowed'), false);
      }
      cb(null, true);
    }
  }))
  @ApiOperation({ summary: 'Import HomeAssistant data from JSON file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Import successful' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async importFile(@UploadedFile() file: Express.Multer.File): Promise<HaSnapshot> {
    // Ensure uploads directory exists (defensive)
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    if (!file) {
      throw new Error('No file uploaded');
    }

    try {
      const snapshot = await this.importService.importFromFile(file.path);
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return snapshot;
    } catch (error) {
      // Clean up uploaded file on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  @Post('json')
  @ApiOperation({ summary: 'Import HomeAssistant data from JSON body' })
  @ApiResponse({ status: 201, description: 'Import successful' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async importJson(@Body() data: any): Promise<HaSnapshot> {
    // Save to temporary file
    const tempPath = path.join(UPLOAD_DIR, `temp-${Date.now()}.json`);

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    fs.writeFileSync(tempPath, JSON.stringify(data));

    try {
      const snapshot = await this.importService.importFromFile(tempPath);
      // Clean up temp file
      fs.unlinkSync(tempPath);
      return snapshot;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Get all import snapshots' })
  @ApiResponse({ status: 200, description: 'List of snapshots' })
  async getSnapshots(): Promise<HaSnapshot[]> {
    return await this.importService.getAllSnapshots();
  }

  @Get('snapshots/:id')
  @ApiOperation({ summary: 'Get specific snapshot details' })
  @ApiResponse({ status: 200, description: 'Snapshot details' })
  @ApiResponse({ status: 404, description: 'Snapshot not found' })
  async getSnapshot(@Param('id') id: string): Promise<HaSnapshot> {
    return await this.importService.getSnapshot(id);
  }
}
