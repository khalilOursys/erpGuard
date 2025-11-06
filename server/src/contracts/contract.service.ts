// src/contracts/contract.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { join, extname } from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class ContractService {
  private readonly uploadDir = join(process.cwd(), 'uploads/contracts');

  constructor(private prisma: PrismaService) {
    fs.mkdir(this.uploadDir, { recursive: true }).catch((e) =>
      console.error('Failed to create upload directory:', e),
    );
  }

  private generateContractNumber(companyId: number) {
    return `CON-${companyId}-${Date.now()}`;
  }

  async create(
    companyId: number,
    dto: CreateContractDto,
    actorUserId?: number,
    file?: Express.Multer.File,
  ) {
    // Add requirement for at least one site
    if (!dto.sites || dto.sites.length < 1) {
      throw new BadRequestException('At least one site is required');
    }

    // Validate contract dates
    const contractStart = new Date(dto.startDate);
    const contractEnd = new Date(dto.endDate);
    if (isNaN(contractStart.getTime()) || isNaN(contractEnd.getTime())) {
      throw new BadRequestException('Invalid contract start or end date');
    }
    if (contractEnd < contractStart) {
      throw new BadRequestException(
        'Contract end date must be after start date',
      );
    }

    // Validate site dates
    for (const site of dto.sites) {
      const siteStart = new Date(site.startDate);
      const siteEnd = new Date(site.endDate);
      if (isNaN(siteStart.getTime()) || isNaN(siteEnd.getTime())) {
        throw new BadRequestException(`Invalid dates for site ${site.siteId}`);
      }
      if (siteEnd < siteStart) {
        throw new BadRequestException(
          `End date must be after start date for site ${site.siteId}`,
        );
      }
      if (siteStart < contractStart || siteEnd > contractEnd) {
        throw new BadRequestException(
          `Dates for site ${site.siteId} must be within contract date range`,
        );
      }
    }

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
      for (const s of sites) {
        if (s.clientId !== dto.clientId)
          throw new BadRequestException('Site does not belong to client');
      }
    }

    // Validate services existence (contract-level & site-level)
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
      dto.contractNumber?.trim() || this.generateContractNumber(companyId);

    // Create contract and nested data in transaction
    let contract = await this.prisma.$transaction(async (tx) => {
      // Create contract
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

      // Create contract-level service rates (ClientContractService)
      if (dto.serviceRates && dto.serviceRates.length > 0) {
        const createRates = dto.serviceRates.map((r) => ({
          clientContractId: contract.id,
          serviceId: r.serviceId,
          basePay: r.basePay ?? 0,
          extraPay: r.extraPay ?? 0,
          clientPrice: r.clientPrice ?? 0,
          createdAt: new Date(),
        }));
      }

      // Create per-site contract entries and per-site services
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

      // Return created contract with relations
      return tx.clientContract.findUnique({
        where: { id: contract.id },
        include: {
          sites: {
            include: {
              services: true,
            },
          },
          client: true,
          file: true,
        },
      });
    });

    if (file) {
      const tempFilePath = file.path;
      try {
        await fs.access(tempFilePath);
        console.log('Create: File access successful');
      } catch (error) {
        console.error('Create: File access failed:', error);
        throw new BadRequestException(
          `Uploaded file not found on server: ${error.message}`,
        );
      }

      const ext = extname(file.originalname);
      const newFilename = `${contract.id}${ext}`;
      const newFilePath = join(this.uploadDir, newFilename);

      try {
        await fs.rename(tempFilePath, newFilePath);
        console.log(`Create: Renamed file to ${newFilePath}`);
        const fileRecord = await this.prisma.file.create({
          data: {
            filename: file.originalname,
            url: `/uploads/contracts/${newFilename}`,
            mimeType: file.mimetype,
            size: file.size,
            uploadedById: actorUserId || null,
          },
        });
        await this.prisma.clientContract.update({
          where: { id: contract.id },
          data: { fileId: fileRecord.id },
        });
        contract = await this.prisma.clientContract.findUnique({
          where: { id: contract.id },
          include: {
            sites: {
              include: {
                services: true,
              },
            },
            client: true,
            file: true,
          },
        });
      } catch (error) {
        console.error('Create: File rename failed:', error);
        throw new BadRequestException(
          `Failed to process uploaded file: ${error.message}`,
        );
      }
    }

    return contract;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateContractDto,
    actorUserId?: number,
    file?: Express.Multer.File,
  ) {
    // Fetch existing contract to validate
    let existing = await this.prisma.clientContract.findUnique({
      where: { id },
      include: {
        client: true,
        sites: { include: { services: true } },
        file: true,
      },
    });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Contract not found');
    }

    // Prevent editing confirmed contracts
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException('Cannot edit confirmed contracts');
    }
    // Compute new contract dates
    const newStart = dto.startDate
      ? new Date(dto.startDate)
      : existing.startDate;
    const newEnd = dto.endDate ? new Date(dto.endDate) : existing.endDate;

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      throw new BadRequestException('Invalid contract start or end date');
    }
    if (newEnd < newStart) {
      throw new BadRequestException(
        'Contract end date must be after start date',
      );
    }

    // Determine sites to validate
    const willUpdateSites = dto.sites !== undefined;
    let sitesToValidate: {
      siteId?: number;
      startDate: string | Date;
      endDate: string | Date;
    }[] = [];

    if (willUpdateSites) {
      if (dto.sites && dto.sites.length < 1) {
        throw new BadRequestException(
          'At least one site is required if updating sites',
        );
      }
      sitesToValidate = dto.sites || [];
    } else if (dto.startDate !== undefined || dto.endDate !== undefined) {
      sitesToValidate = existing.sites.map((s) => ({
        siteId: s.siteId,
        startDate: s.startDate,
        endDate: s.endDate,
      }));
    }

    // Validate site dates if necessary
    for (const site of sitesToValidate) {
      const siteStart = new Date(site.startDate);
      const siteEnd = new Date(site.endDate);
      if (isNaN(siteStart.getTime()) || isNaN(siteEnd.getTime())) {
        throw new BadRequestException(
          `Invalid dates for site ${site.siteId || 'new'}`,
        );
      }
      if (siteEnd < siteStart) {
        throw new BadRequestException(
          `End date must be after start date for site ${site.siteId || 'new'}`,
        );
      }
      if (siteStart < newStart || siteEnd > newEnd) {
        throw new BadRequestException(
          `Dates for site ${site.siteId || 'new'} must be within contract date range`,
        );
      }
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

    // Validate services if provided
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
    const newContractNumber =
      dto.contractNumber !== undefined
        ? dto.contractNumber?.trim() || this.generateContractNumber(companyId)
        : existing.contractNumber;
    // Update contract in transaction
    let updated = await this.prisma.$transaction(async (tx) => {
      // Update contract base fields
      const updateData: any = {};
      if (dto.contractNumber) updateData.contractNumber = newContractNumber;
      if (dto.startDate) updateData.startDate = new Date(dto.startDate);
      if (dto.endDate) updateData.endDate = new Date(dto.endDate);
      if (dto.clientId) updateData.clientId = dto.clientId;

      await tx.clientContract.update({
        where: { id },
        data: updateData,
      });

      // Recreate contract-level service rates
      if (dto.serviceRates && dto.serviceRates.length > 0) {
        const createRates = dto.serviceRates.map((r) => ({
          clientContractId: id,
          serviceId: r.serviceId,
          basePay: r.basePay ?? 0,
          extraPay: r.extraPay ?? 0,
          clientPrice: r.clientPrice ?? 0,
          createdAt: new Date(),
        }));
      }

      // Delete existing sites and their services
      await tx.clientContractSiteService.deleteMany({
        where: { contractSite: { clientContractId: id } },
      });
      await tx.clientContractSite.deleteMany({
        where: { clientContractId: id },
      });

      // Recreate sites and their services
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

      // Handle file update
      if (file) {
        // Delete old file if exists
        if (existing.fileId) {
          const oldFile = existing.file;
          if (oldFile) {
            const oldFilename = oldFile.url.split('/').pop();
            if (oldFilename) {
              const oldPath = join(this.uploadDir, oldFilename);
              try {
                await fs.unlink(oldPath);
                console.log(`Update: Deleted old file: ${oldPath}`);
              } catch (e) {
                if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
                  console.error('Update: Failed to delete old file:', e);
                  throw new BadRequestException(
                    `Failed to delete old file: ${e.message}`,
                  );
                }
              }
              await tx.file
                .delete({ where: { id: existing.fileId } })
                .catch(() => {});
            }
          }
        }

        const tempFilePath = file.path;
        try {
          await fs.access(tempFilePath);
          console.log('Update: File access successful');
        } catch (error) {
          console.error('Update: File access failed:', error);
          throw new BadRequestException(
            `Uploaded file not found on server: ${error.message}`,
          );
        }

        const ext = extname(file.originalname);
        const newFilename = `${id}${ext}`;
        const newFilePath = join(this.uploadDir, newFilename);

        try {
          await fs.rename(tempFilePath, newFilePath);
          console.log(`Update: Renamed file to ${newFilePath}`);
          const fileRecord = await tx.file.create({
            data: {
              filename: file.originalname,
              url: `/uploads/contracts/${newFilename}`,
              mimeType: file.mimetype,
              size: file.size,
              uploadedById: actorUserId || null,
            },
          });
          await tx.clientContract.update({
            where: { id },
            data: { fileId: fileRecord.id },
          });
        } catch (error) {
          console.error('Update: File rename failed:', error);
          throw new BadRequestException(
            `Failed to process uploaded file: ${error.message}`,
          );
        }
      }

      // Return updated contract
      return tx.clientContract.findUnique({
        where: { id },
        include: {
          sites: { include: { services: true } },
          client: true,
          file: true,
        },
      });
    });

    return updated;
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

  async getContractByIdClient(clientId: number) {
    return this.prisma.clientContract.findMany({
      where: { clientId, deletedAt: null },
    });
  }

  async getMissionsForContract(
    companyId: number,
    contractId: number,
    options: { page?: number; pageSize?: number } = {},
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 25;

    const contract = await this.prisma.clientContract.findUnique({
      where: { id: contractId },
    });
    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');

    const where = { contractId, companyId };

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

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.clientContract.update({
        where: { id },
        data: {
          status: 'SUBMITTED_FOR_REVIEW',
          submittedById: actorUserId,
          submittedAt: new Date(),
        },
      });

      const rolePerms = await tx.rolePermission.findMany({
        where: { permission: { name: 'contracts.confirm' } },
        select: { roleName: true },
      });
      const roles = rolePerms.map((r) => r.roleName);

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
        await tx.notification.createMany({
          data: notifData as any,
          skipDuplicates: true,
        });
      }

      return updated;
    });
  }

  async confirm(companyId: number, id: number, confirmerUserId: number) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id },
      include: {
        sites: {
          include: { services: true, site: true },
        },
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
    file: Express.Multer.File,
    actorUserId: number,
  ) {
    if (!actorUserId) throw new BadRequestException('Actor user id required');

    const contract = await this.prisma.clientContract.findUnique({
      where: { id: contractId },
      include: { file: true },
    });
    if (!contract || contract.companyId !== companyId)
      throw new NotFoundException('Contract not found');

    // Delete old file if exists
    if (contract.fileId) {
      const oldFile = contract.file;
      if (oldFile) {
        const oldFilename = oldFile.url.split('/').pop();
        if (oldFilename) {
          const oldPath = join(this.uploadDir, oldFilename);
          try {
            await fs.unlink(oldPath);
            console.log(`AttachFile: Deleted old file: ${oldPath}`);
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
              console.error('AttachFile: Failed to delete old file:', e);
            }
          }
          await this.prisma.file
            .delete({ where: { id: contract.fileId } })
            .catch(() => {});
        }
      }
    }

    const tempFilePath = file.path;
    try {
      await fs.access(tempFilePath);
      console.log('AttachFile: File access successful');
    } catch (error) {
      console.error('AttachFile: File access failed:', error);
      throw new BadRequestException(
        `Uploaded file not found on server: ${error.message}`,
      );
    }

    const ext = extname(file.originalname);
    const newFilename = `${contractId}${ext}`;
    const newFilePath = join(this.uploadDir, newFilename);

    try {
      await fs.rename(tempFilePath, newFilePath);
      console.log(`AttachFile: Renamed file to ${newFilePath}`);
      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          url: `/uploads/contracts/${newFilename}`,
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: actorUserId,
        },
      });
      const updated = await this.prisma.clientContract.update({
        where: { id: contractId },
        data: { fileId: fileRecord.id },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'UPLOAD_FILE',
          entity: 'ClientContract',
          entityId: contractId,
          timestamp: new Date(),
          newData: { fileId: fileRecord.id },
        },
      });

      return updated;
    } catch (error) {
      console.error('AttachFile: File rename failed:', error);
      throw new BadRequestException(
        `Failed to process uploaded file: ${error.message}`,
      );
    }
  }
}
