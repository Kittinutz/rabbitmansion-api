import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';

@Module({
  imports: [],
  controllers: [AppController, RoomController],
  providers: [AppService, PrismaService, RoomService],
})
export class AppModule {}
