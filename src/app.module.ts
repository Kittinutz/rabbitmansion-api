import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prima/prisma.service';
import { MinioService } from './minio/minio.service';
import { FileController } from './file/file.controller';
import { RoomService } from './room/room.service';
import { RoomController } from './room/room.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController, FileController, RoomController],
  providers: [AppService, PrismaService, MinioService, RoomService],
})
export class AppModule {}
