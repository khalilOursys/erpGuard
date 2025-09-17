import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class MissionsService {
  constructor(private prisma: PrismaService) {}

  async create(createMissionDto: CreateMissionDto) {
    const { requirements, startDate, endDate, ...missionData } =
      createMissionDto;

    return this.prisma.mission.create({
      data: {
        ...missionData,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        requirements: requirements?.length
          ? {
              create: requirements.map((req) => ({
                serviceId: req.serviceId,
                requiredCount: req.requiredCount,
                basePay: req.basePay,
                extraPay: req.extraPay,
                clientPrice: req.clientPrice,
              })),
            }
          : undefined,
      },
      include: { requirements: true },
    });
  }

  async findAll(
    companyId: number,
    contractId?: number, // Made optional since it's not always provided
    page: number = 0, // Added default values
    limit: number = 10, // Added default values
  ) {
    const skip = page * limit;

    // Build where clause
    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (contractId) {
      where.contractId = contractId;
    }

    const [missions, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        skip,
        take: limit,
        include: {
          requirements: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mission.count({ where }), // Use the same where clause
    ]);

    return {
      data: missions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, companyId: number) {
    const mission = await this.prisma.mission.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        requirements: {
          include: {
            service: true, // Include service details
          },
        },
        contract: true,
        manager: true,
        location: true,
      },
    });

    if (!mission) {
      throw new NotFoundException(`Mission with ID ${id} not found`);
    }

    return mission;
  }

  async update(id: number, updateMissionDto: UpdateMissionDto) {
    const { requirements, startDate, endDate, ...missionData } =
      updateMissionDto;

    // First check if mission exists
    const existingMission = await this.prisma.mission.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingMission) {
      throw new NotFoundException(`Mission with ID ${id} not found`);
    }

    // Handle requirements update
    if (requirements !== undefined) {
      // First delete existing requirements
      await this.prisma.missionServiceRequirement.deleteMany({
        where: { missionId: id },
      });
    }

    return this.prisma.mission.update({
      where: { id },
      data: {
        ...missionData,
        ...(startDate && { startDate: new Date(startDate) }), // Only update if provided
        ...(endDate && { endDate: new Date(endDate) }), // Only update if provided
        requirements: requirements?.length
          ? {
              create: requirements.map((req) => ({
                serviceId: req.serviceId,
                requiredCount: req.requiredCount,
                basePay: req.basePay,
                extraPay: req.extraPay,
                clientPrice: req.clientPrice,
              })),
            }
          : requirements === null
            ? { deleteMany: {} }
            : undefined, // Handle empty requirements
      },
      include: {
        requirements: true,
      },
    });
  }

  async remove(id: number, companyId: number) {
    // Verify mission exists and belongs to company
    const mission = await this.findOne(id, companyId);

    return this.prisma.mission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getMissionRequirements(id: number, companyId: number) {
    // Verify mission exists and belongs to company
    const mission = await this.findOne(id, companyId);

    return this.prisma.missionServiceRequirement.findMany({
      where: { missionId: id },
      include: {
        service: true,
      },
    });
  }
}
