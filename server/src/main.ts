import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3001);
  console.log('Server listening on', await app.getUrl());
  app.enableCors({
  origin: ['http://localhost:3000'],
  credentials: false,
});
}
bootstrap();


