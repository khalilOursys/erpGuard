import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class MissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a mission. Validate that the contract exists and belongs to company,
   * and that site (if provided) belongs to the same contract/client.
   */
  async create(companyId: number, dto: CreateMissionDto, actorUserId?: number) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id: dto.contractId },
    });
    if (!contract || contract.companyId !== companyId)
      throw new BadRequestException('Contract not found');

    if (dto.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: dto.siteId },
      });
      if (!site) throw new BadRequestException('Site not found');
      // ensure site belongs to the same client as contract
      if (site.clientId !== contract.clientId)
        throw new BadRequestException(
          'Site does not belong to contract client',
        );
    }

    // Determine managerId: prefer explicit DTO, then actor, then contract.submittedById
    const resolvedManagerId =
      dto.managerId ?? actorUserId ?? contract.submittedById;
    if (!resolvedManagerId) {
      // Prisma requires a non-null managerId. Fail fast so caller provides a manager.
      throw new BadRequestException(
        'managerId is required (provide managerId or call as an authenticated user)',
      );
    }

    const mission = await this.prisma.mission.create({
      data: {
        contractId: dto.contractId,
        siteId: dto.siteId ?? null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        requiredPersonnel: dto.requiredPersonnel ?? 0,
        extraPersonnelSlots: 0,
        managerId: resolvedManagerId,
        companyId,
      },
    });

    return mission;
  }

  /**
   * Find missions with pagination, search and filters.
   */
  async findAll(companyId: number, options: any = {}) {
    const {
      page = 1,
      pageSize = 25,
      search = '',
      siteId,
      startFrom,
      startTo,
      deletedOnly = false,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = options;

    const where: any = { companyId };
    if (search) {
      where.OR = [
        {
          contract: {
            contractNumber: { contains: search, mode: 'insensitive' },
          },
        },
        {
          contract: {
            client: { name: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }
    if (typeof siteId !== 'undefined') where.siteId = siteId;
    if (startFrom || startTo) {
      where.startDate = {};
      if (startFrom) where.startDate.gte = new Date(startFrom);
      if (startTo) where.startDate.lte = new Date(startTo);
    }
    if (deletedOnly === true) where.isDeleted = true;
    else where.isDeleted = false;

    // Whitelist sortBy for security (add more fields if needed, e.g., 'endDate', 'requiredPersonnel')
    const allowedSortFields = [
      'startDate',
      'endDate',
      'createdAt',
      'requiredPersonnel',
    ];
    const effectiveSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'startDate';
    const effectiveSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const total = await this.prisma.mission.count({ where });
    const items = await this.prisma.mission.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [effectiveSortBy]: effectiveSortOrder },
      include: {
        contract: {
          select: {
            id: true,
            contractNumber: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        requirements: true,
        assignments: { include: { personnel: true } },
        manager: {
          select: {
            id: true,
            displayname: true,
          },
        },
      },
    });

    return { total, page, pageSize, data: items };
  }

  async findOne(companyId: number, id: number) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: {
        contract: { include: { client: true } },
        site: true,
        requirements: { include: { service: true } },
        assignments: { include: { personnel: true, paymentRecords: true } },
      },
    });
    if (!mission || mission.companyId !== companyId)
      throw new NotFoundException('Mission not found');
    return mission;
  }

  async update(companyId: number, id: number, dto: UpdateMissionDto) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission || mission.companyId !== companyId)
      throw new NotFoundException('Mission not found');
    if (mission.isDeleted)
      throw new BadRequestException('Cannot update deleted mission');

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.mission.update({
      where: { id },
      data,
    });

    return updated;
  }

  async remove(companyId: number, id: number) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission || mission.companyId !== companyId)
      throw new NotFoundException('Mission not found');

    if (mission.isDeleted) return { id: mission.id, isDeleted: true };

    const updated = await this.prisma.mission.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
      select: { id: true, isDeleted: true },
    });

    return updated;
  }

  async restore(companyId: number, id: number) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission || mission.companyId !== companyId)
      throw new NotFoundException('Mission not found');

    if (!mission.isDeleted) return { id: mission.id, isDeleted: false };

    const updated = await this.prisma.mission.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      select: { id: true, isDeleted: true },
    });

    return updated;
  }

  /**
   * Create an assignment for a mission.
   */
  async addAssignment(
    companyId: number,
    missionId: number,
    dto: CreateAssignmentDto,
    actorUserId?: number,
  ) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });
    if (!mission || mission.companyId !== companyId)
      throw new NotFoundException('Mission not found');

    const personnel = await this.prisma.personnel.findUnique({
      where: { id: dto.personnelId },
    });
    if (!personnel || personnel.companyId !== companyId)
      throw new BadRequestException('Personnel not found');

    // Create the assignment
    const assignment = await this.prisma.missionAssignment.create({
      data: {
        missionId,
        personnelId: dto.personnelId,
        post: dto.post ?? null,
        role: dto.role ?? null,
        isReplacement: dto.isReplacement ?? false,
      },
    });

    // If isReplacement is false, create default attendance records
    if (!dto.isReplacement) {
      await this.createDefaultAttendanceRecords(
        assignment.id,
        mission,
        dto.personnelId,
      );
    }

    return assignment;
  }

  private async createDefaultAttendanceRecords(
    assignmentId: number,
    mission: any,
    personnelId: number,
  ) {
    const startDate = new Date(mission.startDate);
    const endDate = new Date(mission.endDate);

    // Generate all dates between start and end date
    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Create attendance records for each date
    const attendancePromises = dates.map((date) =>
      this.prisma.attendance.create({
        data: {
          assignmentId,
          personnelId,
          date: date,
          status: 'PRESENT', // Default status
          // checkIn and checkOut can be null initially
          // replacementForId and replacementType remain null for default records
        },
      }),
    );

    await Promise.all(attendancePromises);
  }

  async listAssignments(companyId: number, missionId: number) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });
    if (!mission || mission.companyId !== companyId)
      throw new NotFoundException('Mission not found');

    const items = await this.prisma.missionAssignment.findMany({
      where: { missionId },
      include: { personnel: true, attendances: true },
    });

    return items;
  }

  async getMissionByIdContract(contractId: number) {
    return this.prisma.mission.findMany({
      where: { contractId, deletedAt: null },
      include: {
        contract: { include: { client: true } },
        site: true,
        requirements: { include: { service: true } },
        assignments: { include: { personnel: true, paymentRecords: true } },
      },
    });
  }
}
