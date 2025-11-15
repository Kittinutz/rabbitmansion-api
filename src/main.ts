import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  // Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Rabbit Mansion Hotel API')
    .setDescription(
      'Comprehensive hotel management system API for admin dashboard operations',
    )
    .setVersion('1.0')
    .addTag('rooms', 'Room management operations')
    .addTag('bookings', 'Booking and reservation management')
    .addTag('guests', 'Guest management operations')
    .addTag('services', 'Hotel services management')
    .addTag('payments', 'Payment processing operations')
    .addTag('analytics', 'Analytics and reporting')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Rabbit Mansion Hotel API',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
  });

  await app.listen(3000, '0.0.0.0');
  console.log(`🏨 Hotel Management API is running on: http://localhost:3000`);
  console.log(`📚 Swagger API Documentation: http://localhost:3000/api`);
}
bootstrap();
