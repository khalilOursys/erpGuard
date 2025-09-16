import { Injectable } from '@nestjs/common';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}
  async findAll() {
    return this.prisma.city.findMany({});
  }
}
