import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prima/prisma.service';
import { MinioService } from './minio/minio.service';
import { FileController } from './file/file.controller';
import { RoomService } from './room/room.service';
import { RoomController } from './room/room.controller';
import { RoomTypeController } from './room-type/room-type.controller';
import { RoomTypeService } from './room-type/room-type.service';
import { BookingController } from './booking/booking.controller';
import { BookingService } from './booking/booking.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [
    AppController,
    FileController,
    RoomController,
    RoomTypeController,
    BookingController,
  ],
  providers: [
    AppService,
    PrismaService,
    MinioService,
    RoomService,
    RoomTypeService,
    BookingService,
  ],
})
export class AppModule {}
