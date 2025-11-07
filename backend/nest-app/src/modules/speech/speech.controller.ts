import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
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

@ApiTags('speech')
@Controller('api/speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);

  constructor(
    private readonly speechService: SpeechService,
    private readonly rightsService: RightsService,
    private readonly terminalsService: TerminalsService,
  ) {}

  // ============ Human Input Endpoints ============

  @Post('input')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new human input record' })
  @ApiResponse({ status: 201, description: 'Input created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient rights' })
  async createInput(@Body() createDto: CreateHumanInputDto, @Req() req: any) {
    // Check if user has permission to use speech input
    await this.rightsService.checkPermission(createDto.userId, 'speech.use');

    // Update terminal activity if provided
    if (createDto.terminalId) {
      await this.terminalsService.updateActivity(createDto.terminalId);
    }

    const input = await this.speechService.create(createDto);
    this.logger.log(`Created input from user ${createDto.userId}`);
    
    return {
      success: true,
      data: input,
      message: 'Speech input recorded successfully',
    };
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
  async registerTerminal(@Body() terminalData: any) {
    const terminal = await this.terminalsService.registerTerminal(terminalData);
    
    return {
      success: true,
      data: terminal,
      message: 'Terminal registered successfully',
    };
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
