import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.oursys-dev.site',
      'https://oursys-dev.site',
      'https://oursys-dev.site/api',
      'https://api.oursys-dev.site' ,
    ], // Allow both frontend and backend
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(
    process.env.PORT ? parseInt(process.env.PORT) : 3001,
    '0.0.0.0',
  );
  console.log('Server listening on', await app.getUrl());
}
bootstrap();

