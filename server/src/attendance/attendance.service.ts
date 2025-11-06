// src/attendance/attendance.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import { min, max } from 'date-fns';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getGridData(companyId: number, startDate: Date, endDate: Date) {
    const contracts = await this.prisma.clientContract.findMany({
      where: {
        companyId,
        status: 'CONFIRMED',
        OR: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
      include: {
        client: { select: { name: true } },
        sites: {
          include: {
            site: { select: { name: true } },
            services: {
              include: {
                service: { select: { name: true } },
                assignments: {
                  where: {
                    isReplacement: false,
                    OR: [
                      { startDate: { lte: endDate } },
                      { endDate: { gte: startDate } },
                    ],
                  },
                  include: {
                    personnel: { select: { firstName: true, lastName: true, identifier: true } },
                    attendances: {
                      where: { date: { gte: startDate, lte: endDate } },
                    },
                    replacements: {
                      include: {
                        personnel: { select: { firstName: true, lastName: true, identifier: true } },
                        attendances: {
                          where: { date: { gte: startDate, lte: endDate } },
                        },
                        replacements: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Flatten to rows with explicit fields for client, site, service, post, type (Main/Replacement), personnel
    const flatRows: any[] = [];
    for (const contract of contracts) {
      const clientName = contract.client.name;

      for (const cSite of contract.sites) {
        const siteName = cSite.site?.name || 'Unnamed Site';
        const siteStart = new Date(cSite.startDate);
        const siteEnd = new Date(cSite.endDate);

        for (const cService of cSite.services) {
          const serviceName = cService.service.name;

          for (let postIndex = 1; postIndex <= cService.requiredCount; postIndex++) {
            const assignment = cService.assignments.find((a) => a.postIndex === postIndex);

            if (assignment) {
              // Main assignment row
              flatRows.push(
                this.buildFlatRow(
                  clientName,
                  siteName,
                  serviceName,
                  postIndex,
                  'Main',
                  assignment,
                  startDate,
                  endDate,
                  siteStart,
                  siteEnd,
                  cService.id,
                ),
              );

              // Add replacements recursively
              this.addFlatReplacementRows(
                assignment.replacements || [],
                clientName,
                siteName,
                serviceName,
                postIndex,
                startDate,
                endDate,
                siteStart,
                siteEnd,
                1,
                flatRows,
                cService.id,
              );
            } else {
              // Unassigned post
              flatRows.push(
                this.buildFlatRow(
                  clientName,
                  siteName,
                  serviceName,
                  postIndex,
                  'Unassigned',
                  undefined,
                  startDate,
                  endDate,
                  siteStart,
                  siteEnd,
                  cService.id,
                ),
              );
            }
          }
        }
      }
    }

    // Sort the flatRows for proper row spanning: by client, site, service, post, type
    flatRows.sort((a, b) => {
      if (a.clientName !== b.clientName) return a.clientName.localeCompare(b.clientName);
      if (a.siteName !== b.siteName) return a.siteName.localeCompare(b.siteName);
      if (a.serviceName !== b.serviceName) return a.serviceName.localeCompare(b.serviceName);
      if (a.post !== b.post) return a.post.localeCompare(b.post);
      return a.type.localeCompare(b.type);
    });

    return flatRows;
  }

  private buildFlatRow(
    clientName: string,
    siteName: string,
    serviceName: string,
    postIndex: number,
    type: string,
    assignment: any | undefined,
    startDate: Date,
    endDate: Date,
    siteStart: Date,
    siteEnd: Date,
    contractSiteServiceId: number,
  ) {
    const row: any = {
      clientName,
      siteName,
      serviceName,
      post: `Post ${postIndex}`,
      type,
      personnelName: assignment?.personnel ? `${assignment.personnel.firstName || ''} ${assignment.personnel.lastName || ''}` : '',
      identification: assignment?.personnel?.identifier || '',
      assignmentId: assignment?.id,
      contractSiteServiceId,
      postIndex,
      isLeaf: true,
    };

    const rowStart = assignment ? new Date(assignment.startDate) : siteStart;
    const rowEnd = assignment ? new Date(assignment.endDate) : siteEnd;

    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      if (current >= rowStart && current <= rowEnd) {
        const att = assignment?.attendances.find(
          (a: any) => a.date.toISOString().split('T')[0] === dateStr,
        );
        row[dateStr] = {
          status: att?.status || AttendanceStatus.PRESENT,
          editable: true,
        };
      } else {
        row[dateStr] = {
          status: null,
          editable: false,
        };
      }
      current = new Date(current.setDate(current.getDate() + 1));
    }

    return row;
  }

  private addFlatReplacementRows(
    replacements: any[],
    clientName: string,
    siteName: string,
    serviceName: string,
    postIndex: number,
    startDate: Date,
    endDate: Date,
    siteStart: Date,
    siteEnd: Date,
    repNumber: number,
    flatRows: any[],
    contractSiteServiceId: number,
  ) {
    for (const rep of replacements) {
      flatRows.push(
        this.buildFlatRow(
          clientName,
          siteName,
          serviceName,
          postIndex,
          `Replacement ${repNumber}`,
          rep,
          startDate,
          endDate,
          siteStart,
          siteEnd,
          contractSiteServiceId,
        ),
      );

      if (rep.replacements?.length > 0) {
        this.addFlatReplacementRows(
          rep.replacements,
          clientName,
          siteName,
          serviceName,
          postIndex,
          startDate,
          endDate,
          siteStart,
          siteEnd,
          repNumber + 1,
          flatRows,
          contractSiteServiceId,
        );
      }
      repNumber++;
    }
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
    const dateObj = data.date ? new Date(data.date) : new Date();
    return this.prisma.$transaction(async (tx) => {
      let assignment;
      let originalAssignment;

      if (data.isAddingReplacement) {
        if (!data.personnelId || !data.replacementForId || !data.status) {
          throw new BadRequestException('Missing data for replacement');
        }

        // Check for conflicts: replacement personnel not assigned elsewhere on this date
        const conflicting = await tx.assignment.findFirst({
          where: {
            personnelId: data.personnelId,
            startDate: { lte: dateObj },
            endDate: { gte: dateObj },
          },
        });
        if (conflicting) {
          throw new BadRequestException(`Personnel ${data.personnelId} is already assigned on ${data.date}`);
        }

        // First, update the original assignment's attendance to the new status (e.g., ABSENT)
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

        // Check for existing replacement with same personnel for this original
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
        if (data.assignmentId) {
          assignment = await tx.assignment.findUnique({
            where: { id: data.assignmentId },
          });
        } else {
          assignment = await tx.assignment.findFirst({
            where: {
              contractSiteServiceId: data.contractSiteServiceId,
              postIndex: data.postIndex,
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
          // Check for conflicts on the date (since new assignment is for single date)
          const conflicting = await tx.assignment.findFirst({
            where: {
              personnelId: data.personnelId,
              startDate: { lte: dateObj },
              endDate: { gte: dateObj },
            },
          });
          if (conflicting) {
            throw new BadRequestException(`Personnel ${data.personnelId} is already assigned on ${data.date || 'the assignment period'}`);
          }

          assignment = await tx.assignment.create({
            data: {
              contractSiteServiceId: data.contractSiteServiceId,
              postIndex: data.postIndex,
              personnelId: data.personnelId,
              startDate: dateObj,
              endDate: dateObj,
              createdById: userId,
            },
          });
        }
        if (!assignment) throw new BadRequestException('Assignment not found');

        if (data.personnelId) {
          // Check for overlapping conflicts across the assignment period
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
    // Delete attendances
    await tx.attendance.deleteMany({
      where: { assignmentId: id },
    });

    // Recursively delete replacements
    const replacements = await tx.assignment.findMany({
      where: { replacementForId: id },
    });
    for (const rep of replacements) {
      await this.deleteAssignmentRecursive(tx, rep.id);
    }

    // Delete the assignment
    await tx.assignment.delete({
      where: { id },
    });
  }
}