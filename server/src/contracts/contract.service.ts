import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractService {
  constructor(private prisma: PrismaService) {}

  private generateContractNumber(companyId: number) {
    return `CON-${companyId}-${Date.now()}`;
  }

  async create(
    companyId: number,
    dto: CreateContractDto,
    actorUserId?: number,
  ) {
    // Validate client ownership
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });
    if (!client || client.companyId !== companyId)
      throw new BadRequestException('Client not found');

    // Validate sites belong to that client
    if (dto.sites && dto.sites.length > 0) {
      const siteIds = dto.sites.map((s) => s.siteId);
      const sites = await this.prisma.site.findMany({
        where: { id: { in: siteIds } },
      });
      if (sites.length !== new Set(siteIds).size) {
        throw new BadRequestException('One or more sites not found');
      }
      // ensure all sites belong to client
      for (const s of sites) {
        if (s.clientId !== dto.clientId)
          throw new BadRequestException('Site does not belong to client');
      }
    }

    // validate services existence (contract-level & site-level)
    const serviceIds: number[] = [];
    if (dto.serviceRates)
      dto.serviceRates.forEach((sr) => serviceIds.push(sr.serviceId));
    if (dto.sites) {
      dto.sites.forEach((s) =>
        s.services?.forEach((ss) => serviceIds.push(ss.serviceId)),
      );
    }
    if (serviceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: { id: { in: serviceIds }, companyId },
      });
      if (services.length !== new Set(serviceIds).size) {
        throw new BadRequestException(
          'One or more services not found or not owned by your company',
        );
      }
    }

    const contractNumber =
      dto.contractNumber ?? this.generateContractNumber(companyId);

    // Create contract and nested data in transaction
    return this.prisma.$transaction(async (tx) => {
      // create contract
      const contract = await tx.clientContract.create({
        data: {
          contractNumber,
          clientId: dto.clientId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          companyId,
          status: 'DRAFT',
        },
      });

      // create contract-level service rates (ClientContractService)
      if (dto.serviceRates && dto.serviceRates.length > 0) {
        const createRates = dto.serviceRates.map((r) => ({
          clientContractId: contract.id,
          serviceId: r.serviceId,
          basePay: r.basePay ?? 0,
          extraPay: r.extraPay ?? 0,
          clientPrice: r.clientPrice ?? 0,
          createdAt: new Date(),
        }));
        await tx.clientContractService.createMany({
          data: createRates,
          skipDuplicates: true,
        });
      }

      // create per-site contract entries and per-site services
      if (dto.sites && dto.sites.length > 0) {
        for (const s of dto.sites) {
          const createdSite = await tx.clientContractSite.create({
            data: {
              clientContractId: contract.id,
              siteId: s.siteId,
              startDate: new Date(s.startDate),
              endDate: new Date(s.endDate),
            },
          });

          if (s.services && s.services.length > 0) {
            const siteServices = s.services.map((ss) => ({
              contractSiteId: createdSite.id,
              serviceId: ss.serviceId,
              requiredCount: ss.requiredCount ?? 1,
              basePay: ss.basePay ?? 0,
              extraPay: ss.extraPay ?? 0,
              clientPrice: ss.clientPrice ?? 0,
              createdAt: new Date(),
            }));
            await tx.clientContractSiteService.createMany({
              data: siteServices,
              skipDuplicates: true,
            });
          }
        }
      }

      // return created contract with relations
      return tx.clientContract.findUnique({
        where: { id: contract.id },
        include: {
          serviceRates: true,
          sites: {
            include: {
              services: true,
            },
          },
          client: true,
        },
      });
    });
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateContractDto,
    actorUserId?: number,
  ) {
    // Fetch existing contract to validate
    const existing = await this.prisma.clientContract.findUnique({
      where: { id },
      include: {
        client: true,
        serviceRates: true,
        sites: { include: { services: true } },
      },
    });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Contract not found');
    }
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only draft contracts can be updated');
    }

    // Validate client if changing
    let clientId = existing.clientId;
    if (dto.clientId && dto.clientId !== existing.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
      });
      if (!client || client.companyId !== companyId) {
        throw new BadRequestException('Client not found');
      }
      clientId = dto.clientId;
    }

    // Validate sites if provided
    if (dto.sites && dto.sites.length > 0) {
      const siteIds = dto.sites.map((s) => s.siteId);
      const sites = await this.prisma.site.findMany({
        where: { id: { in: siteIds } },
      });
      if (sites.length !== new Set(siteIds).size) {
        throw new BadRequestException('One or more sites not found');
      }
      for (const s of sites) {
        if (s.clientId !== clientId) {
          throw new BadRequestException('Site does not belong to client');
        }
      }
    }

    // Validate services (contract-level & site-level)
    const serviceIds: number[] = [];
    if (dto.serviceRates) {
      dto.serviceRates.forEach((sr) => serviceIds.push(sr.serviceId));
    }
    if (dto.sites) {
      dto.sites.forEach((s) =>
        s.services?.forEach((ss) => serviceIds.push(ss.serviceId)),
      );
    }
    if (serviceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: { id: { in: serviceIds }, companyId },
      });
      if (services.length !== new Set(serviceIds).size) {
        throw new BadRequestException(
          'One or more services not found or not owned by your company',
        );
      }
    }

    // Update in transaction
    return this.prisma.$transaction(async (tx) => {
      // Update top-level contract fields (only if provided in DTO)
      const updateData: any = {};
      if (dto.contractNumber) updateData.contractNumber = dto.contractNumber;
      if (dto.clientId) updateData.clientId = dto.clientId;
      if (dto.startDate) updateData.startDate = new Date(dto.startDate);
      if (dto.endDate) updateData.endDate = new Date(dto.endDate);

      const contract = await tx.clientContract.update({
        where: { id },
        data: updateData,
      });

      // Delete existing nested data
      // First, delete site services (child of sites)
      await tx.clientContractSiteService.deleteMany({
        where: { contractSite: { clientContractId: id } },
      });
      // Then, delete sites
      await tx.clientContractSite.deleteMany({
        where: { clientContractId: id },
      });
      // Delete contract-level service rates
      await tx.clientContractService.deleteMany({
        where: { clientContractId: id },
      });

      // Recreate contract-level service rates if provided
      if (dto.serviceRates && dto.serviceRates.length > 0) {
        const createRates = dto.serviceRates.map((r) => ({
          clientContractId: id,
          serviceId: r.serviceId,
          basePay: r.basePay ?? 0,
          extraPay: r.extraPay ?? 0,
          clientPrice: r.clientPrice ?? 0,
          createdAt: new Date(),
        }));
        await tx.clientContractService.createMany({
          data: createRates,
          skipDuplicates: true,
        });
      }

      // Recreate sites and their services if provided
      if (dto.sites && dto.sites.length > 0) {
        for (const s of dto.sites) {
          const createdSite = await tx.clientContractSite.create({
            data: {
              clientContractId: id,
              siteId: s.siteId,
              startDate: new Date(s.startDate),
              endDate: new Date(s.endDate),
            },
          });

          if (s.services && s.services.length > 0) {
            const siteServices = s.services.map((ss) => ({
              contractSiteId: createdSite.id,
              serviceId: ss.serviceId,
              requiredCount: ss.requiredCount ?? 1,
              basePay: ss.basePay ?? 0,
              extraPay: ss.extraPay ?? 0,
              clientPrice: ss.clientPrice ?? 0,
              createdAt: new Date(),
            }));
            await tx.clientContractSiteService.createMany({
              data: siteServices,
              skipDuplicates: true,
            });
          }
        }
      }

      // Return updated contract with relations (use tx for consistency)
      return tx.clientContract.findUnique({
        where: { id },
        include: {
          serviceRates: true,
          sites: {
            include: {
              services: true,
            },
          },
          client: true,
        },
      });
    });
  }

  async findAll(
    companyId: number,
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
    } = {},
  ) {
    const { page = 1, pageSize = 25, search = '', status } = query;

    const where: any = { companyId };
    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) where.status = status;

    const total = await this.prisma.clientContract.count({ where });
    const items = await this.prisma.clientContract.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        file: true,
        serviceRates: true,
        sites: { include: { services: true } },
        submittedBy: {
          select: { id: true, displayname: true, identifier: true },
        },
        confirmedBy: {
          select: { id: true, displayname: true, identifier: true },
        },
      },
    });

    return { total, page, pageSize, data: items };
  }

  async findOne(companyId: number, id: number, withDeleted = false) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id },
      include: {
        client: true,
        serviceRates: true,
        sites: {
          include: {
            services: { include: { service: true } },
            site: true,
          },
        },
        file: true,
        submittedBy: {
          select: { id: true, displayname: true, identifier: true },
        },
        confirmedBy: {
          select: { id: true, displayname: true, identifier: true },
        },
      },
    });
    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');
    return contract;
  }
  /**
   * Return missions belonging to a contract (tenant-safe).
   * Supports basic pagination via page & pageSize.
   */
  async getMissionsForContract(
    companyId: number,
    contractId: number,
    options: { page?: number; pageSize?: number } = {},
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;

    // ensure contract exists and belongs to company
    const contract = await this.prisma.clientContract.findUnique({
      where: { id: contractId },
    });
    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');

    const where = { contractId, companyId };

    const total = await this.prisma.mission.count({ where });
    const data = await this.prisma.mission.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { startDate: 'desc' },
      include: {
        requirements: { include: { service: true } },
        assignments: { include: { personnel: true } },
        site: true,
        contract: { select: { id: true, contractNumber: true } },
      },
    });

    return { total, page, pageSize, data };
  }

  async submitForReview(companyId: number, id: number, actorUserId: number) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id },
    });
    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');

    if (contract.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT contracts can be submitted');
    }

    // Use transaction: update contract, find approvers and create notifications
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clientContract.update({
        where: { id },
        data: {
          status: 'SUBMITTED_FOR_REVIEW',
          submittedById: actorUserId,
          submittedAt: new Date(),
        },
      });

      // find roles that have the permission 'contracts.confirm'
      const rolePerms = await tx.rolePermission.findMany({
        where: { permission: { name: 'contracts.confirm' } },
        select: { roleName: true },
      });
      const roles = rolePerms.map((r) => r.roleName);

      // build 'OR' conditions for users who are either in those roles OR have the userPermission
      const orConditions: any[] = [];
      if (roles.length > 0) orConditions.push({ role: { in: roles } });
      orConditions.push({
        userPermissions: {
          some: { permission: { name: 'contracts.confirm' } },
        },
      });

      const approvers = await tx.user.findMany({
        where: {
          companyId,
          isDeleted: false,
          OR: orConditions,
        },
        select: { id: true, displayname: true, identifier: true },
      });

      if (approvers && approvers.length > 0) {
        const notifData = approvers.map((u) => ({
          userId: u.id,
          message: `Contract ${updated.contractNumber} submitted for review`,
          channel: 'IN_APP',
          metadata: {
            contractId: updated.id,
            contractNumber: updated.contractNumber,
          },
          createdAt: new Date(),
        }));
        // Prisma's createMany for JSON fields: convert metadata to JSON if provider needs it
        // createMany with metadata requires it to be serializable; Prisma will accept object
        await tx.notification.createMany({
          data: notifData as any,
          skipDuplicates: true,
        });
      }

      return updated;
    });
  }

  /**
   * Confirm contract => create missions
   */
  async confirm(companyId: number, id: number, confirmerUserId: number) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id },
      include: {
        sites: {
          include: { services: true, site: true },
        },
        serviceRates: true,
        client: true,
      },
    });

    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');
    if (contract.status !== 'SUBMITTED_FOR_REVIEW') {
      throw new BadRequestException(
        'Only submitted contracts can be confirmed',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update contract status
      await tx.clientContract.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedById: confirmerUserId,
          confirmedAt: new Date(),
        },
      });

      const missionsCreated: any[] = [];

      // For each contract site, create one mission
      for (const cSite of contract.sites) {
        // compute requiredPersonnel as sum of requiredCount
        const requiredPersonnel = (cSite.services || []).reduce(
          (acc, s) => acc + (s.requiredCount || 0),
          0,
        );

        // choose manager: submittedById if exists, else confirmer
        const managerId = contract.submittedById ?? confirmerUserId;

        const mission = await tx.mission.create({
          data: {
            contractId: contract.id,
            siteId: cSite.siteId,
            startDate: contract.startDate,
            endDate: contract.endDate,
            requiredPersonnel: requiredPersonnel || 0,
            extraPersonnelSlots: 0,
            managerId,
            companyId: contract.companyId,
          },
        });

        // create MissionServiceRequirement rows from cSite.services.
        for (const s of cSite.services || []) {
          // find contract-level service rate to fallback if needed
          const contractLevel = (contract.serviceRates || []).find(
            (r) => r.serviceId === s.serviceId,
          );

          const basePay = s.basePay ?? contractLevel?.basePay ?? 0;
          const extraPay = s.extraPay ?? contractLevel?.extraPay ?? 0;
          const clientPrice = s.clientPrice ?? contractLevel?.clientPrice ?? 0;

          await tx.missionServiceRequirement.create({
            data: {
              missionId: mission.id,
              serviceId: s.serviceId,
              requiredCount: s.requiredCount ?? 1,
              basePay,
              extraPay,
              clientPrice,
            },
          });
        }

        missionsCreated.push(mission);
      }

      return {
        message: 'Contract confirmed',
        missionsCount: missionsCreated.length,
        missions: missionsCreated,
      };
    });
  }

  async reject(
    companyId: number,
    id: number,
    confirmerUserId: number,
    reason?: string,
  ) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id },
    });
    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');
    if (contract.status !== 'SUBMITTED_FOR_REVIEW') {
      throw new BadRequestException('Only submitted contracts can be rejected');
    }

    // Update status
    const updated = await this.prisma.clientContract.update({
      where: { id },
      data: {
        status: 'REJECTED',
        confirmedById: confirmerUserId,
        confirmedAt: new Date(),
      },
    });

    // Optionally record rejection reason in AuditLog
    if (reason) {
      await this.prisma.auditLog.create({
        data: {
          userId: confirmerUserId,
          action: 'REJECT',
          entity: 'ClientContract',
          entityId: id,
          timestamp: new Date(),
          // omit previousData because Prisma JSON input types may not accept `null`
          newData: { reason },
        },
      });
    }

    return updated;
  }
  async attachFile(
    companyId: number,
    contractId: number,
    fileId: number,
    actorUserId: number,
  ) {
    if (!actorUserId) throw new BadRequestException('Actor user id required');

    const contract = await this.prisma.clientContract.findUnique({
      where: { id: contractId },
    });
    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');

    // ensure file exists
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new BadRequestException('File not found');

    const updated = await this.prisma.clientContract.update({
      where: { id: contractId },
      data: { fileId },
    });

    // audit log (userId must be a number)
    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'UPLOAD_FILE',
        entity: 'ClientContract',
        entityId: contractId,
        timestamp: new Date(),
        newData: { fileId },
      },
    });

    return updated;
  }
}
