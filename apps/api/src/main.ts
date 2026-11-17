import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  // Trust proxy for secure cookies behind reverse proxy
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cookie parser
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // CORS (for development)
  if (process.env.NODE_ENV === 'development') {
    app.enableCors({
      origin: 'http://localhost:5173',
      credentials: true,
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}

bootstrap();
