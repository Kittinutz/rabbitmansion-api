import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScbController } from './scb.controller';
import { ScbService } from './scb.service';
import { PrismaService } from '../../prima/prisma.service';
import scbConfig from './config/scb.config';

@Module({
  imports: [
    ConfigModule.forFeature(scbConfig),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [ScbController],
  providers: [ScbService, PrismaService],
  exports: [ScbService],
})
export class ScbModule {}
