// src/billings/billings.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { BillingStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(companyId: number): Promise<string> {
    const year = new Date().getFullYear();
    const lastInvoice = await this.prisma.billing.findFirst({
      where: {
        companyId,
        invoiceNumber: {
          startsWith: `INV-${year}-`,
        },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `INV-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  private async validateRelationships(
    data: CreateBillingDto | UpdateBillingDto,
  ) {
    // Validate company exists
    const company = await this.prisma.company.findUnique({
      where: { id: data.companyId },
    });
    if (!company) {
      throw new BadRequestException(
        `Company with ID ${data.companyId} not found`,
      );
    }

    // Validate client exists and belongs to company
    const client = await this.prisma.client.findFirst({
      where: {
        id: data.clientId,
        companyId: data.companyId,
      },
    });
    if (!client) {
      throw new BadRequestException(
        `Client with ID ${data.clientId} not found or doesn't belong to company`,
      );
    }

    // Validate contract if provided
    if (data.contractId) {
      const contract = await this.prisma.clientContract.findFirst({
        where: {
          id: data.contractId,
          clientId: data.clientId,
          companyId: data.companyId,
        },
      });
      if (!contract) {
        throw new BadRequestException(
          `Contract with ID ${data.contractId} not found or doesn't belong to client`,
        );
      }
    }

    // Validate generatedBy user if provided
    if (data.generatedById) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: data.generatedById,
          companyId: data.companyId,
        },
      });
      if (!user) {
        throw new BadRequestException(
          `User with ID ${data.generatedById} not found or doesn't belong to company`,
        );
      }
    }

    // Validate line relationships
    if (data.lines && data.lines.length > 0) {
      for (const line of data.lines) {
        if (line.missionId) {
          const mission = await this.prisma.mission.findFirst({
            where: {
              id: line.missionId,
              contractId: data.contractId,
            },
          });
          if (!mission) {
            throw new BadRequestException(
              `Mission with ID ${line.missionId} not found or doesn't belong to contract`,
            );
          }
        }

        if (line.serviceId) {
          const service = await this.prisma.service.findFirst({
            where: {
              id: line.serviceId,
              companyId: data.companyId,
            },
          });
          if (!service) {
            throw new BadRequestException(
              `Service with ID ${line.serviceId} not found`,
            );
          }
        }
      }
    }
  }

  async create(createBillingDto: CreateBillingDto) {
    await this.validateRelationships(createBillingDto);

    const invoiceNumber =
      createBillingDto.invoiceNumber ||
      (await this.generateInvoiceNumber(createBillingDto.companyId));

    return this.prisma.$transaction(async (prisma) => {
      try {
        // Calculate totals from lines
        const subtotal = createBillingDto.lines.reduce(
          (sum, line) => sum + line.totalAfterDiscountBase,
          0,
        );
        const taxTotal = createBillingDto.lines.reduce(
          (sum, line) => sum + (line.taxAmountBase || 0),
          0,
        );

        // Create the billing with lines and column configs
        const billing = await prisma.billing.create({
          data: {
            invoiceNumber,
            companyId: createBillingDto.companyId,
            clientId: createBillingDto.clientId,
            contractId: createBillingDto.contractId,
            generatedById: createBillingDto.generatedById,
            periodStart: new Date(createBillingDto.periodStart),
            periodEnd: new Date(createBillingDto.periodEnd),
            invoiceDate: createBillingDto.invoiceDate
              ? new Date(createBillingDto.invoiceDate)
              : new Date(),
            dueDate: createBillingDto.dueDate
              ? new Date(createBillingDto.dueDate)
              : null,
            amountBaseCurrency: createBillingDto.amountBaseCurrency || subtotal,
            targetCurrency: createBillingDto.targetCurrency,
            conversionRate: createBillingDto.conversionRate,
            rateSource: createBillingDto.rateSource,
            amountTargetCurrency: createBillingDto.amountTargetCurrency,
            status: createBillingDto.status || BillingStatus.DRAFT,
            taxTotalBase: createBillingDto.taxTotalBase || taxTotal,
            taxTotalTarget: createBillingDto.taxTotalTarget,
            notes: createBillingDto.notes,
            lines: {
              create: createBillingDto.lines.map((line) => ({
                lineType: line.lineType,
                description: line.description,
                missionId: line.missionId,
                assignmentId: line.assignmentId,
                missionServiceId: line.missionServiceId,
                personnelId: line.personnelId,
                serviceId: line.serviceId,
                contractId: line.contractId,
                personnelCount: line.personnelCount,
                quantity: line.quantity,
                unitPriceBase: line.unitPriceBase,
                lineTotalBase: line.lineTotalBase,
                discountPercent: line.discountPercent,
                discountAmountBase: line.discountAmountBase,
                totalAfterDiscountBase: line.totalAfterDiscountBase,
                taxPercent: line.taxPercent,
                taxAmountBase: line.taxAmountBase,
                unitPriceTarget: line.unitPriceTarget,
                lineTotalTarget: line.lineTotalTarget,
                discountAmountTarget: line.discountAmountTarget,
                totalAfterDiscountTarget: line.totalAfterDiscountTarget,
                taxAmountTarget: line.taxAmountTarget,
              })),
            },
            // Add column configs creation
            columnConfigs: createBillingDto.columnConfigs
              ? {
                  create: createBillingDto.columnConfigs.map(
                    (config, index) => ({
                      key: config.key,
                      label: config.label,
                      visible: config.visible,
                      order: config.order ?? index,
                    }),
                  ),
                }
              : undefined,
          },
          include: {
            company: true,
            client: true,
            contract: {
              include: {
                client: true,
              },
            },
            generatedBy: true,
            lines: {
              include: {
                mission: true,
                assignment: true,
                personnel: true,
                service: true,
                contract: true,
              },
              orderBy: { id: 'asc' },
            },
            payments: true,
            columnConfigs: true, // Include column configs in response
          },
        });

        return billing;
      } catch (error) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Invoice number already exists for this company',
          );
        }
        console.error('Error creating billing:', error);
        throw new InternalServerErrorException('Failed to create billing');
      }
    });
  }

  async update(id: number, updateBillingDto: UpdateBillingDto) {
    // Check if billing exists
    const existingBilling = await this.prisma.billing.findUnique({
      where: { id },
      include: {
        lines: true,
        columnConfigs: true,
      },
    });

    if (!existingBilling) {
      throw new NotFoundException(`Billing with ID ${id} not found`);
    }

    await this.validateRelationships(updateBillingDto);

    return this.prisma.$transaction(async (prisma) => {
      try {
        const data: any = {
          ...updateBillingDto,
          // Remove lines and columnConfigs from main update as we handle them separately
          lines: undefined,
          columnConfigs: undefined,
        };

        // Handle date conversions
        if (updateBillingDto.periodStart) {
          data.periodStart = new Date(updateBillingDto.periodStart);
        }
        if (updateBillingDto.periodEnd) {
          data.periodEnd = new Date(updateBillingDto.periodEnd);
        }
        if (updateBillingDto.invoiceDate) {
          data.invoiceDate = new Date(updateBillingDto.invoiceDate);
        }
        if (updateBillingDto.dueDate) {
          data.dueDate = new Date(updateBillingDto.dueDate);
        }

        // Calculate totals if lines are provided
        if (updateBillingDto.lines && updateBillingDto.lines.length > 0) {
          const subtotal = updateBillingDto.lines.reduce(
            (sum, line) => sum + line.totalAfterDiscountBase,
            0,
          );
          const taxTotal = updateBillingDto.lines.reduce(
            (sum, line) => sum + (line.taxAmountBase || 0),
            0,
          );

          data.amountBaseCurrency =
            updateBillingDto.amountBaseCurrency || subtotal;
          data.taxTotalBase = updateBillingDto.taxTotalBase || taxTotal;
        }

        // Update billing main data
        const updatedBilling = await prisma.billing.update({
          where: { id },
          data,
        });

        // Handle lines update if provided
        if (updateBillingDto.lines) {
          // Get existing line IDs
          const existingLineIds = existingBilling.lines.map((line) => line.id);

          // Extract line IDs from update (for existing lines)
          const updatedLineIds = updateBillingDto.lines
            .map((line) => line.id)
            .filter((id) => id !== undefined) as number[];

          // Lines to delete (exist in DB but not in update)
          const linesToDelete = existingLineIds.filter(
            (id) => !updatedLineIds.includes(id),
          );

          // Delete removed lines
          if (linesToDelete.length > 0) {
            await prisma.billingLine.deleteMany({
              where: { id: { in: linesToDelete } },
            });
          }

          // Process each line in the update
          for (const lineDto of updateBillingDto.lines) {
            const lineData = {
              lineType: lineDto.lineType,
              description: lineDto.description,
              missionId: lineDto.missionId,
              assignmentId: lineDto.assignmentId,
              missionServiceId: lineDto.missionServiceId,
              personnelId: lineDto.personnelId,
              serviceId: lineDto.serviceId,
              contractId: lineDto.contractId,
              personnelCount: lineDto.personnelCount,
              quantity: lineDto.quantity,
              unitPriceBase: lineDto.unitPriceBase,
              lineTotalBase: lineDto.lineTotalBase,
              discountPercent: lineDto.discountPercent,
              discountAmountBase: lineDto.discountAmountBase,
              totalAfterDiscountBase: lineDto.totalAfterDiscountBase,
              taxPercent: lineDto.taxPercent,
              taxAmountBase: lineDto.taxAmountBase,
              unitPriceTarget: lineDto.unitPriceTarget,
              lineTotalTarget: lineDto.lineTotalTarget,
              discountAmountTarget: lineDto.discountAmountTarget,
              totalAfterDiscountTarget: lineDto.totalAfterDiscountTarget,
              taxAmountTarget: lineDto.taxAmountTarget,
            };

            if (lineDto.id && existingLineIds.includes(lineDto.id)) {
              // Update existing line
              await prisma.billingLine.update({
                where: { id: lineDto.id },
                data: lineData,
              });
            } else {
              // Create new line
              await prisma.billingLine.create({
                data: {
                  ...lineData,
                  billingId: id,
                },
              });
            }
          }
        }

        // Handle column configs update if provided
        if (updateBillingDto.columnConfigs) {
          // Get existing column config IDs
          const existingConfigIds = existingBilling.columnConfigs.map(
            (config) => config.id,
          );

          // Extract config IDs from update (for existing configs)
          const updatedConfigIds = updateBillingDto.columnConfigs
            .map((config) => config.id)
            .filter((id) => id !== undefined) as number[];

          // Configs to delete (exist in DB but not in update)
          const configsToDelete = existingConfigIds.filter(
            (id) => !updatedConfigIds.includes(id),
          );

          // Delete removed configs
          if (configsToDelete.length > 0) {
            await prisma.columnConfig.deleteMany({
              where: { id: { in: configsToDelete } },
            });
          }

          // Process each column config in the update
          for (const configDto of updateBillingDto.columnConfigs) {
            const configData = {
              key: configDto.key,
              label: configDto.label,
              visible: configDto.visible,
              order: configDto.order,
            };

            if (configDto.id && existingConfigIds.includes(configDto.id)) {
              // Update existing config
              await prisma.columnConfig.update({
                where: { id: configDto.id },
                data: configData,
              });
            } else {
              // Create new config
              await prisma.columnConfig.create({
                data: {
                  ...configData,
                  billingId: id,
                },
              });
            }
          }
        }

        // Return the complete updated billing with lines and column configs
        return await prisma.billing.findUnique({
          where: { id },
          include: {
            company: true,
            client: true,
            contract: {
              include: {
                client: true,
              },
            },
            generatedBy: true,
            lines: {
              include: {
                mission: true,
                assignment: true,
                personnel: true,
                service: true,
                contract: true,
              },
              orderBy: { id: 'asc' },
            },
            payments: true,
            columnConfigs: {
              orderBy: { order: 'asc' },
            },
          },
        });
      } catch (error) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Billing with ID ${id} not found`);
        }
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Invoice number already exists for this company',
          );
        }
        console.error('Error updating billing:', error);
        throw new InternalServerErrorException('Failed to update billing');
      }
    });
  }

  async findAll(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      deletedOnly?: boolean;
      periodStart?: Date | string;
      periodEnd?: Date | string;
    } = {},
  ) {
    const {
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'contractNumber',
      sortOrder = 'asc',
      periodStart,
      periodEnd,
    } = options;

    const where: any = { companyId };

    // Search filter
    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Deleted filter
    const deletedOnly = options.deletedOnly ?? false;
    if (deletedOnly === true) {
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }

    // Date range filtering
    if (periodStart || periodEnd) {
      where.periodStart = {};

      if (periodStart) {
        where.periodStart.gte = new Date(periodStart);
      }

      if (periodEnd) {
        where.periodStart.lte = new Date(periodEnd);
      }
    }

    console.log('findAll - where clause:', where);

    const total = await this.prisma.billing.count({ where });
    const data = await this.prisma.billing.findMany({
      where,
      include: {
        client: true,
        contract: true,
        lines: true,
        payments: true,
        columnConfigs: true, // Include column configs
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return { total, page, pageSize, data };
  }

  async findOne(id: number) {
    const billing = await this.prisma.billing.findUnique({
      where: { id },
      include: {
        company: true,
        client: true,
        contract: {
          include: {
            client: true,
          },
        },
        generatedBy: true,
        lines: {
          include: {
            mission: true,
            assignment: true,
            missionService: true,
            personnel: true,
            service: true,
            contract: true,
          },
          orderBy: { id: 'asc' },
        },
        columnConfigs: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!billing) {
      throw new NotFoundException(`Billing with ID ${id} not found`);
    }

    return billing;
  }

  async findByInvoiceNumber(companyId: number, invoiceNumber: string) {
    const billing = await this.prisma.billing.findFirst({
      where: { companyId, invoiceNumber },
      include: {
        client: true,
        contract: true,
        lines: {
          include: {
            mission: true,
            assignment: true,
            missionService: true,
            personnel: true,
            service: true,
            contract: true,
          },
        },
        payments: true,
        columnConfigs: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!billing) {
      throw new NotFoundException(
        `Billing with invoice number ${invoiceNumber} not found`,
      );
    }

    return billing;
  }

  async updateStatus(id: number, status: BillingStatus) {
    try {
      return await this.prisma.billing.update({
        where: { id },
        data: { status },
        include: {
          client: true,
          contract: true,
          lines: true,
          payments: true,
          columnConfigs: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Billing with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    const billing = await this.prisma.billing.findUnique({ where: { id } });
    if (!billing) throw new NotFoundException('billing not found');

    if (billing.isDeleted) {
      return {
        id: billing.id,
        isDeleted: billing.isDeleted,
      };
    }

    const updated = await this.prisma.billing.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return updated;
  }

  async restore(id: number) {
    try {
      return await this.prisma.billing.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Billing with ID ${id} not found`);
      }
      throw error;
    }
  }

  async getBillingSummary(companyId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalBillings,
      totalAmount,
      monthlyBillings,
      monthlyAmount,
      yearlyBillings,
      yearlyAmount,
      statusCounts,
    ] = await Promise.all([
      this.prisma.billing.count({ where: { companyId } }),
      this.prisma.billing.aggregate({
        where: { companyId },
        _sum: { amountBaseCurrency: true },
      }),
      this.prisma.billing.count({
        where: {
          companyId,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.billing.aggregate({
        where: {
          companyId,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amountBaseCurrency: true },
      }),
      this.prisma.billing.count({
        where: {
          companyId,
          createdAt: { gte: startOfYear },
        },
      }),
      this.prisma.billing.aggregate({
        where: {
          companyId,
          createdAt: { gte: startOfYear },
        },
        _sum: { amountBaseCurrency: true },
      }),
      this.prisma.billing.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { id: true },
        _sum: { amountBaseCurrency: true },
      }),
    ]);

    return {
      totalBillings,
      totalAmount: totalAmount._sum.amountBaseCurrency || 0,
      monthlyBillings,
      monthlyAmount: monthlyAmount._sum.amountBaseCurrency || 0,
      yearlyBillings,
      yearlyAmount: yearlyAmount._sum.amountBaseCurrency || 0,
      statusBreakdown: statusCounts.map((item) => ({
        status: item.status,
        count: item._count.id,
        amount: item._sum.amountBaseCurrency || 0,
      })),
    };
  }
}
