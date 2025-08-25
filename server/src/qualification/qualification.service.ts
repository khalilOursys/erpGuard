import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateQualificationDto } from './dto/create-qualification.dto';
import { UpdateQualificationDto } from './dto/update-qualification.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class QualificationService {
  constructor(private prisma: PrismaService) {}

  async create(createQualificationDto: CreateQualificationDto) {
    // Check if code already exists
    const existingQualification =
      await this.prisma.guardQualification.findUnique({
        where: { code: createQualificationDto.code },
      });

    if (existingQualification) {
      throw new BadRequestException(
        `Qualification with code '${createQualificationDto.code}' already exists`,
      );
    }

    return this.prisma.guardQualification.create({
      data: createQualificationDto,
    });
  }

  async findAll(companyId: number, page: number, limit: number) {
    const skip = page * limit;
    const where = companyId > 0 ? { companyId } : {};

    const [qualifications, total] = await Promise.all([
      this.prisma.guardQualification.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              relations: true,
              missionRequirements: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.guardQualification.count({ where }),
    ]);

    return {
      data: qualifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const qualification = await this.prisma.guardQualification.findUnique({
      where: { id },
      include: {
        relations: {
          include: {
            guard: {
              include: {
                company: true,
              },
            },
          },
        },
        missionRequirements: {
          include: {
            mission: true,
          },
        },
        company: true,
      },
    });

    if (!qualification) {
      throw new NotFoundException(`Qualification with ID ${id} not found`);
    }

    return qualification;
  }

  async update(id: number, updateQualificationDto: UpdateQualificationDto) {
    await this.findOne(id); // Verify qualification exists

    // If updating code, check for duplicates
    if (updateQualificationDto.code) {
      const existingQualification =
        await this.prisma.guardQualification.findUnique({
          where: { code: updateQualificationDto.code },
        });

      if (existingQualification && existingQualification.id !== id) {
        throw new BadRequestException(
          `Qualification with code '${updateQualificationDto.code}' already exists`,
        );
      }
    }

    return this.prisma.guardQualification.update({
      where: { id },
      data: updateQualificationDto,
      include: {
        relations: {
          include: {
            guard: true,
          },
        },
        missionRequirements: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Verify qualification exists

    // Check if qualification is in use
    const usageCount = await this.prisma.guardQualificationRel.count({
      where: { qualificationId: id },
    });

    const missionUsageCount = await this.prisma.missionRequirement.count({
      where: { qualificationId: id },
    });

    if (usageCount > 0 || missionUsageCount > 0) {
      throw new BadRequestException(
        `Cannot delete qualification. It is used by ${usageCount} guards and ${missionUsageCount} mission requirements.`,
      );
    }

    return this.prisma.guardQualification.delete({
      where: { id },
    });
  }
}
