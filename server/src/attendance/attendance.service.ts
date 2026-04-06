import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import { parseISO, endOfDay, startOfDay, format } from 'date-fns';

type GridRow = {
  clientName: string;
  siteName: string;
  serviceName: string;
  post: string;
  type: string;
  personnelName?: string;
  identification?: string;
  assignmentId?: number;
  contractSiteServiceId?: number;
  postIndex?: number;
  [date: string]: { status: AttendanceStatus; editable: boolean } | string | number | undefined;
};

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getGridData(companyId: number, startDateStr: string, endDateStr: string) {
    const startDate = parseISO(startDateStr);
    const endDate = endOfDay(parseISO(endDateStr));

    // Fetch all attendances in range for confirmed contracts
    const attendances = await this.prisma.attendance.findMany({
      where: {
        assignment: {  // Now lowercase, matching fixed schema
          contractSiteService: {
            contractSite: {
              clientContract: {
                companyId,
                status: 'CONFIRMED',
              },
            },
          },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        date: { gte: startDate, lte: endDate },
      },
      include: {
        assignment: {  // Lowercase accessor
          include: {
            personnel: { select: { firstName: true, lastName: true, identifier: true } },
            contractSiteService: {
              include: {
                service: { select: { name: true } },
                contractSite: {
                  include: {
                    site: { select: { name: true } },
                    clientContract: {
                      include: { client: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Group by assignment to build rows
    const rowsByAssignment: Record<number, GridRow> = attendances.reduce((acc, att) => {
      const assignment = att.assignment;  // Lowercase
      const assignmentId = assignment.id;
      if (!acc[assignmentId]) {
        const clientName = assignment.contractSiteService.contractSite.clientContract.client.name;
        const siteName = assignment.contractSiteService.contractSite.site.name || 'Unnamed Site';
        const serviceName = assignment.contractSiteService.service.name;
        const postIndex = assignment.postIndex;
        const type = assignment.isReplacement ? 'Replacement' : (assignment.personnelId ? 'Main' : 'Unassigned');
        const personnelName = assignment.personnel ? `${assignment.personnel.firstName || ''} ${assignment.personnel.lastName || ''}` : '';
        const identification = assignment.personnel?.identifier || '';

        acc[assignmentId] = {
          clientName,
          siteName,
          serviceName,
          post: `Post ${postIndex}`,
          type,
          personnelName,
          identification,
          assignmentId,
          contractSiteServiceId: assignment.contractSiteServiceId,
          postIndex,
          isLeaf: true,
        };
      }

      const dateStr = format(att.date, 'yyyy-MM-dd');
      acc[assignmentId][dateStr] = { status: att.status, editable: true };

      return acc;
    }, {});

    const flatRows: GridRow[] = Object.values(rowsByAssignment);

    // Sort rows
    flatRows.sort((a, b) => {
      if (a.clientName !== b.clientName) return a.clientName.localeCompare(b.clientName);
      if (a.siteName !== b.siteName) return a.siteName.localeCompare(b.siteName);
      if (a.serviceName !== b.serviceName) return a.serviceName.localeCompare(b.serviceName);
      if (a.post !== b.post) return a.post.localeCompare(b.post);
      return a.type.localeCompare(b.type);
    });

    return flatRows;
  }

  async updateAttendance(
    companyId: number,
    userId: number,
    data: {
      assignmentId?: number;
      contractSiteServiceId?: number;
      postIndex?: number;
      date?: string;
      status?: AttendanceStatus;
      personnelId?: number;
      replacementForId?: number;
      isAddingReplacement?: boolean;
    },
  ) {
    if (!data.date && (data.status || data.isAddingReplacement)) {
      throw new BadRequestException('Date is required for status updates or replacements');
    }
    const dateObj = data.date ? startOfDay(parseISO(data.date)) : startOfDay(new Date());
    return this.prisma.$transaction(async (tx) => {
      let assignment;
      let originalAssignment;

      if (data.isAddingReplacement) {
        if (!data.personnelId || !data.replacementForId || !data.status) {
          throw new BadRequestException('Missing data for replacement');
        }

// === ENHANCED CONFLICT CHECK WITH DETAILED MESSAGE ===
      const conflictingAssignment = await tx.assignment.findFirst({
        where: {
          personnelId: data.personnelId,
          startDate: { lte: dateObj },
          endDate: { gte: dateObj },
        },
        include: {
          contractSiteService: {
            include: {
              service: { select: { name: true } },
              contractSite: {
                include: {
                  site: { select: { name: true } },
                  clientContract: {
                    include: { client: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      });

      if (conflictingAssignment) {
        const siteName = conflictingAssignment.contractSiteService.contractSite.site.name || 'Unknown Site';
        const serviceName = conflictingAssignment.contractSiteService.service.name;
        const post = `Post ${conflictingAssignment.postIndex}`;
        const type = conflictingAssignment.isReplacement ? 'Replacement' : 'Main';

        throw new BadRequestException(
          `Personnel is already engaged as **${type}** in ${post} - ${serviceName} at ${siteName} on this date.`
        );
      }

        // Update original attendance status (e.g., to ABSENT)
        originalAssignment = await tx.assignment.findUnique({
          where: { id: data.replacementForId },
        });
        if (!originalAssignment) throw new BadRequestException('Original assignment not found');

        await tx.attendance.upsert({
          where: {
            assignmentId_date: { assignmentId: originalAssignment.id, date: dateObj },
          },
          update: { status: data.status },
          create: { assignmentId: originalAssignment.id, date: dateObj, status: data.status },
        });

        // Handle existing or new replacement assignment
        const existingReplacement = await tx.assignment.findFirst({
          where: {
            replacementForId: data.replacementForId,
            personnelId: data.personnelId,
            isReplacement: true,
          },
        });

        if (existingReplacement) {
          let newStart = existingReplacement.startDate;
          let newEnd = existingReplacement.endDate;
          if (dateObj < newStart) newStart = dateObj;
          if (dateObj > newEnd) newEnd = dateObj;

          await tx.assignment.update({
            where: { id: existingReplacement.id },
            data: { startDate: newStart, endDate: newEnd },
          });

          await tx.attendance.upsert({
            where: {
              assignmentId_date: { assignmentId: existingReplacement.id, date: dateObj },
            },
            update: { status: AttendanceStatus.PRESENT },
            create: { assignmentId: existingReplacement.id, date: dateObj, status: AttendanceStatus.PRESENT },
          });

          assignment = existingReplacement;
        } else {
          // Create new replacement
          assignment = await tx.assignment.create({
            data: {
              contractSiteServiceId: originalAssignment.contractSiteServiceId,
              postIndex: originalAssignment.postIndex,
              personnelId: data.personnelId,
              startDate: dateObj,
              endDate: dateObj,
              isReplacement: true,
              replacementForId: data.replacementForId,
              createdById: userId,
            },
          });
          await tx.attendance.create({
            data: {
              assignmentId: assignment.id,
              date: dateObj,
              status: AttendanceStatus.PRESENT,
            },
          });
        }
      } else {
        // Non-replacement update (personnel assign or status change)
        if (data.assignmentId) {
          assignment = await tx.assignment.findUnique({
            where: { id: data.assignmentId },
          });
        } else {
          assignment = await tx.assignment.findFirst({
            where: {
              contractSiteServiceId: data.contractSiteServiceId!,
              postIndex: data.postIndex!,
              isReplacement: false,
              startDate: { lte: dateObj },
              endDate: { gte: dateObj },
            },
          });
        }

        if (!assignment && data.personnelId) {
          if (!data.contractSiteServiceId || !data.postIndex) {
            throw new BadRequestException('Missing contractSiteServiceId or postIndex for new assignment');
          }
          // Conflict check for new single-day assignment
const conflicting = await tx.assignment.findFirst({
  where: {
    personnelId: data.personnelId,
    startDate: { lte: dateObj },
    endDate: { gte: dateObj },
  },
  include: {
    contractSiteService: {
      include: {
        service: { select: { name: true } },
        contractSite: {
          include: {
            site: { select: { name: true } },
          },
        },
      },
    },
  },
});
if (conflicting) {
  const postInfo = `Post ${conflicting.postIndex} (${conflicting.isReplacement ? 'Replacement' : 'Main'})`;
  const siteInfo = conflicting.contractSiteService?.contractSite?.site?.name 
    ? ` at ${conflicting.contractSiteService.contractSite.site.name}` 
    : '';
  
  throw new BadRequestException(
    `Personnel is already assigned on this date: ${postInfo}${siteInfo}`
  );
}

          assignment = await tx.assignment.create({
            data: {
              contractSiteServiceId: data.contractSiteServiceId,
              postIndex: data.postIndex!,
              personnelId: data.personnelId,
              startDate: dateObj,
              endDate: dateObj,
              createdById: userId,
            },
          });
        }
        if (!assignment) throw new BadRequestException('Assignment not found');

        // Update personnel if provided (with overlap check)
        if (data.personnelId) {
          const overlapping = await tx.assignment.findFirst({
            where: {
              personnelId: data.personnelId,
              id: { not: assignment.id },
              startDate: { lte: assignment.endDate },
              endDate: { gte: assignment.startDate },
            },
          });
          if (overlapping) {
            throw new BadRequestException(`Personnel ${data.personnelId} already assigned in overlapping period from ${assignment.startDate.toISOString()} to ${assignment.endDate.toISOString()}`);
          }

          await tx.assignment.update({
            where: { id: assignment.id },
            data: { personnelId: data.personnelId },
          });
        }

        // Update status if provided
        if (data.status && data.date) {
          await tx.attendance.upsert({
            where: {
              assignmentId_date: { assignmentId: assignment.id, date: dateObj },
            },
            update: { status: data.status },
            create: { assignmentId: assignment.id, date: dateObj, status: data.status },
          });
        }
      }

      return assignment;
    });
  }

  async deleteAssignment(companyId: number, id: number) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        contractSiteService: {
          include: {
            contractSite: {
              include: {
                clientContract: true,
              },
            },
          },
        },
        replacements: true,
      },
    });

    if (!assignment || assignment.contractSiteService.contractSite.clientContract.companyId !== companyId) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.deleteAssignmentRecursive(tx, id);
    });

    return { message: 'Assignment deleted successfully' };
  }

  private async deleteAssignmentRecursive(tx: any, id: number) {
    // Delete attendances first
    await tx.attendance.deleteMany({
      where: { assignmentId: id },
    });

    // Recurse on replacements
    const replacements = await tx.assignment.findMany({
      where: { replacementForId: id },
    });
    for (const rep of replacements) {
      await this.deleteAssignmentRecursive(tx, rep.id);
    }

    // Delete assignment
    await tx.assignment.delete({
      where: { id },
    });
  }
}