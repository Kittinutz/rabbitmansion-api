import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersService } from './user.service';
import { PostsService } from './post.service';
import { PrismaService } from './prisma.service';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';

@Module({
  imports: [],
  controllers: [AppController, RoomController],
  providers: [
    AppService,
    UsersService,
    PostsService,
    PrismaService,
    RoomService,
  ],
})
export class AppModule {}
