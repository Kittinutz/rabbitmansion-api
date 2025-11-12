import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { RoomService } from './room.service';
import type { CreateRoomDto, UpdateRoomDto, RoomFilter } from './room.service';
import { RoomType, RoomStatus } from '../generated/prisma';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.createRoom(createRoomDto);
  }

  @Get()
  async getAllRooms(@Query() query: any) {
    const filter: RoomFilter = {};

    if (query.roomType) {
      if (
        !Object.values([
          'DOUBLE_BED',
          'SUPERIOR',
          'STANDARD_OPPOSITE_POOL',
        ]).includes(query.roomType)
      ) {
        throw new BadRequestException('Invalid room type');
      }
      filter.roomType = query.roomType as RoomType;
    }

    if (query.status) {
      if (
        !Object.values([
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
        ]).includes(query.status)
      ) {
        throw new BadRequestException('Invalid room status');
      }
      filter.status = query.status as RoomStatus;
    }

    if (query.floor) {
      const floor = parseInt(query.floor);
      if (isNaN(floor) || floor < 1 || floor > 3) {
        throw new BadRequestException('Floor must be 1, 2, or 3');
      }
      filter.floor = floor;
    }

    if (query.priceMin) {
      const priceMin = parseFloat(query.priceMin);
      if (isNaN(priceMin) || priceMin < 0) {
        throw new BadRequestException(
          'Minimum price must be a positive number',
        );
      }
      filter.priceMin = priceMin;
    }

    if (query.priceMax) {
      const priceMax = parseFloat(query.priceMax);
      if (isNaN(priceMax) || priceMax < 0) {
        throw new BadRequestException(
          'Maximum price must be a positive number',
        );
      }
      filter.priceMax = priceMax;
    }

    return this.roomService.getAllRooms(filter);
  }

  @Get('available')
  async getAvailableRooms() {
    return this.roomService.getAvailableRooms();
  }

  @Get('type/:roomType')
  async getRoomsByType(@Param('roomType') roomType: string) {
    if (
      !Object.values([
        'DOUBLE_BED',
        'SUPERIOR',
        'STANDARD_OPPOSITE_POOL',
      ]).includes(roomType)
    ) {
      throw new BadRequestException('Invalid room type');
    }
    return this.roomService.getRoomsByType(roomType as RoomType);
  }

  @Get('floor/:floor')
  async getRoomsByFloor(@Param('floor', ParseIntPipe) floor: number) {
    if (floor < 1 || floor > 3) {
      throw new BadRequestException('Floor must be 1, 2, or 3');
    }
    return this.roomService.getRoomsByFloor(floor);
  }

  @Get('number/:roomNumber')
  async getRoomByNumber(@Param('roomNumber') roomNumber: string) {
    return this.roomService.getRoomByNumber(roomNumber);
  }

  @Get(':id')
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    return this.roomService.getRoomById(id);
  }

  @Put(':id')
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    if (updateRoomDto.roomType) {
      if (
        !Object.values([
          'DOUBLE_BED',
          'SUPERIOR',
          'STANDARD_OPPOSITE_POOL',
        ]).includes(updateRoomDto.roomType)
      ) {
        throw new BadRequestException('Invalid room type');
      }
    }

    if (updateRoomDto.status) {
      if (
        !Object.values([
          'AVAILABLE',
          'OCCUPIED',
          'MAINTENANCE',
          'OUT_OF_ORDER',
        ]).includes(updateRoomDto.status)
      ) {
        throw new BadRequestException('Invalid room status');
      }
    }

    return this.roomService.updateRoom(id, updateRoomDto);
  }

  @Put(':id/status')
  async updateRoomStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: RoomStatus },
  ) {
    if (
      !Object.values([
        'AVAILABLE',
        'OCCUPIED',
        'MAINTENANCE',
        'OUT_OF_ORDER',
      ]).includes(body.status)
    ) {
      throw new BadRequestException('Invalid room status');
    }
    return this.roomService.updateRoomStatus(id, body.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoom(@Param('id', ParseIntPipe) id: number) {
    await this.roomService.deleteRoom(id);
  }

  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  async initializeAllRooms() {
    return this.roomService.initializeAllRooms();
  }
}
