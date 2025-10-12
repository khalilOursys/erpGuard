import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import {
  BulkUpdateAttendanceDto,
  UpdateAttendanceDto,
} from './dto/update-attendance.dto';
import { AttendanceStatus } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // CREATE - Get all attendance for a mission
  async getAttendanceByMission(
    missionId: number,
    companyId: number,
    date?: string,
  ) {
    // Build date filter if date is provided
    let dateFilter = {};

    if (date) {
      const startDate = new Date(date + '-01');
      const endDate = dayjs(date).endOf('month').toDate();

      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    // Verify mission exists and belongs to company
    const mission = await this.prisma.mission.findFirst({
      where: {
        id: missionId,
        companyId,
      },
      include: {
        assignments: {
          include: {
            mission: true,
            personnel: true,
            attendances: {
              where: dateFilter,
              include: {
                replacementFor: {
                  include: {
                    personnel: true,
                  },
                },
              },
              orderBy: { date: 'asc' },
            },
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    return mission.assignments.flatMap((assignment) =>
      assignment.attendances.map((attendance) => ({
        id: attendance.id,
        personnelName: assignment.personnel.identifier,
        personnelId: assignment.personnel.id,
        assignmentId: assignment.id,
        date: attendance.date,
        status: attendance.status,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        personnelNameR: attendance.replacementFor?.personnel?.identifier,
        post: assignment.post,
      })),
    );
  }

  // CREATE - Create attendance record
  async createAttendance(
    companyId: number,
    createAttendanceDto: CreateAttendanceDto,
  ) {
    // Verify assignment exists and belongs to company
    const assignment = await this.prisma.missionAssignment.findFirst({
      where: {
        id: createAttendanceDto.assignmentId,
        mission: { companyId },
      },
      include: { mission: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check if attendance already exists for this date and assignment
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        assignmentId: createAttendanceDto.assignmentId,
        date: createAttendanceDto.date,
      },
    });

    if (existingAttendance) {
      throw new BadRequestException(
        'Attendance record already exists for this date and assignment',
      );
    }

    // Verify replacement reference if provided
    if (createAttendanceDto.replacementForId) {
      const replacementFor = await this.prisma.attendance.findFirst({
        where: {
          id: createAttendanceDto.replacementForId,
          assignment: { mission: { companyId } },
        },
      });

      if (!replacementFor) {
        throw new NotFoundException(
          'Replacement reference attendance not found',
        );
      }
    }

    // Verify notedBy user if provided
    if (createAttendanceDto.notedById) {
      const notedByUser = await this.prisma.user.findFirst({
        where: {
          id: createAttendanceDto.notedById,
          companyId,
        },
      });

      if (!notedByUser) {
        throw new NotFoundException('Noted by user not found');
      }
    }

    return await this.prisma.attendance.create({
      data: {
        assignmentId: createAttendanceDto.assignmentId,
        personnelId: assignment.personnelId, // Denormalized for easier querying
        date: createAttendanceDto.date,
        status: createAttendanceDto.status,
        checkIn: createAttendanceDto.checkIn,
        checkOut: createAttendanceDto.checkOut,
        replacementForId: createAttendanceDto.replacementForId,
        replacementType: createAttendanceDto.replacementType,
        notedById: createAttendanceDto.notedById,
      },
      include: {
        assignment: {
          include: {
            personnel: true,
          },
        },
      },
    });
  }

  // READ - Get attendance by ID
  async getAttendanceById(attendanceId: number, companyId: number) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        assignment: { mission: { companyId } },
      },
      include: {
        assignment: {
          include: {
            personnel: true,
            mission: true,
          },
        },
        replacementFor: {
          include: {
            assignment: {
              include: {
                personnel: true,
              },
            },
          },
        },
        replacements: {
          include: {
            assignment: {
              include: {
                personnel: true,
              },
            },
          },
        },
        notedBy: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  // UPDATE - Update attendance record
  async updateAttendance(
    attendanceId: number,
    companyId: number,
    updateAttendanceDto: UpdateAttendanceDto,
  ) {
    // Verify attendance exists and belongs to company
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        assignment: { mission: { companyId } },
      },
    });

    if (!existingAttendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Verify replacement reference if provided
    if (updateAttendanceDto.replacementForId) {
      const replacementFor = await this.prisma.attendance.findFirst({
        where: {
          id: updateAttendanceDto.replacementForId,
          assignment: { mission: { companyId } },
        },
      });

      if (!replacementFor) {
        throw new NotFoundException(
          'Replacement reference attendance not found',
        );
      }
    }

    // Verify notedBy user if provided
    if (updateAttendanceDto.notedById) {
      const notedByUser = await this.prisma.user.findFirst({
        where: {
          id: updateAttendanceDto.notedById,
          companyId,
        },
      });

      if (!notedByUser) {
        throw new NotFoundException('Noted by user not found');
      }
    }

    return await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: updateAttendanceDto.status,
        checkIn: updateAttendanceDto.checkIn,
        checkOut: updateAttendanceDto.checkOut,
        replacementForId: updateAttendanceDto.replacementForId,
        replacementType: updateAttendanceDto.replacementType,
        notedById: updateAttendanceDto.notedById,
        updatedAt: new Date(),
      },
      include: {
        assignment: {
          include: {
            personnel: true,
          },
        },
      },
    });
  }

  // BULK UPDATE - Update multiple attendance records
  async bulkUpdateAttendance(
    companyId: number,
    bulkUpdateDto: BulkUpdateAttendanceDto,
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      const results = [];

      for (const update of bulkUpdateDto.attendanceUpdates) {
        // Verify each attendance record belongs to company
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            id: update.attendanceId,
            assignment: { mission: { companyId } },
          },
        });

        if (!existingAttendance) {
          throw new NotFoundException(
            `Attendance record with ID ${update.attendanceId} not found`,
          );
        }

        // Validate replacement reference if provided
        if (update.data.replacementForId) {
          const replacementFor = await prisma.attendance.findFirst({
            where: {
              id: update.data.replacementForId,
              assignment: { mission: { companyId } },
            },
          });

          if (!replacementFor) {
            throw new NotFoundException(
              `Replacement reference attendance with ID ${update.data.replacementForId} not found`,
            );
          }
        }

        // Validate notedBy user if provided
        if (update.data.notedById) {
          const notedByUser = await prisma.user.findFirst({
            where: {
              id: update.data.notedById,
              companyId,
            },
          });

          if (!notedByUser) {
            throw new NotFoundException(
              `Noted by user with ID ${update.data.notedById} not found`,
            );
          }
        }

        const updated = await prisma.attendance.update({
          where: { id: update.attendanceId },
          data: {
            ...update.data,
            updatedAt: new Date(),
          },
          include: {
            assignment: {
              include: {
                personnel: true,
              },
            },
          },
        });

        results.push(updated);
      }

      return results;
    });
  }

  // DELETE - Delete attendance record
  async deleteAttendance(attendanceId: number, companyId: number) {
    // Verify attendance exists and belongs to company
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        assignment: { mission: { companyId } },
      },
    });

    if (!existingAttendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Check if this attendance is referenced as replacementFor
    const referencingAttendances = await this.prisma.attendance.findMany({
      where: { replacementForId: attendanceId },
    });

    if (referencingAttendances.length > 0) {
      throw new BadRequestException(
        'Cannot delete attendance record that is referenced by other attendance records',
      );
    }

    return await this.prisma.attendance.delete({
      where: { id: attendanceId },
    });
  }

  // Get attendance summary for mission
  async getAttendanceSummary(missionId: number, companyId: number) {
    // Verify mission exists and belongs to company
    const mission = await this.prisma.mission.findFirst({
      where: {
        id: missionId,
        companyId,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        assignment: { missionId },
      },
      include: {
        assignment: {
          include: {
            personnel: true,
          },
        },
      },
    });

    // Group by status and personnel
    const summary = {
      byStatus: {},
      byPersonnel: {},
      totalRecords: attendanceRecords.length,
    };

    attendanceRecords.forEach((record) => {
      // Count by status
      summary.byStatus[record.status] =
        (summary.byStatus[record.status] || 0) + 1;

      // Count by personnel
      const personnelName = record.assignment.personnel.identifier;
      if (!summary.byPersonnel[personnelName]) {
        summary.byPersonnel[personnelName] = {
          total: 0,
          byStatus: {},
        };
      }
      summary.byPersonnel[personnelName].total++;
      summary.byPersonnel[personnelName].byStatus[record.status] =
        (summary.byPersonnel[personnelName].byStatus[record.status] || 0) + 1;
    });

    return summary;
  }

  async createReplacementAttendance(
    assignmentId: number,
    startDate: string,
    endDate: string,
    replacementForId?: number,
    replacementPersonnelId?: number,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get missionId from assignmentId
    const assignment = await this.prisma.missionAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      select: {
        missionId: true,
      },
    });

    if (!assignment) {
      throw new Error(`Assignment with ID ${assignmentId} not found`);
    }

    const missionId = assignment.missionId;

    // Get all dates between start and end (inclusive)
    const dates: Date[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get mission assignment for replacement personnel
    let replacementAssignmentId: number | null = null;

    if (replacementPersonnelId) {
      const replacementAssignment =
        await this.prisma.missionAssignment.findFirst({
          where: {
            personnelId: replacementPersonnelId,
            missionId: missionId,
          },
        });

      if (!replacementAssignment) {
        throw new Error(
          `Replacement personnel ${replacementPersonnelId} is not assigned to mission ${missionId}`,
        );
      }

      replacementAssignmentId = replacementAssignment.id;
    }

    // Update all attendance records for replacementForId to ABSENT for each date in range
    if (replacementForId) {
      for (const date of dates) {
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);

        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        await this.prisma.attendance.updateMany({
          where: {
            personnelId: replacementForId,
            assignmentId: assignmentId,
            date: {
              gte: dateStart,
              lt: dateEnd,
            },
          },
          data: {
            status: AttendanceStatus.ABSENT,
          },
        });
      }
    }

    // Create new replacement attendance records for each date
    console.log(replacementPersonnelId);
    if (replacementPersonnelId && replacementAssignmentId) {
      const createdAttendances = [];

      for (const date of dates) {
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);

        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        // Find the ABSENT attendance record to link as replacementForId
        const absentAttendance = await this.prisma.attendance.findFirst({
          where: {
            personnelId: replacementForId,
            assignmentId: assignmentId,
            date: {
              gte: dateStart,
              lt: dateEnd,
            },
            status: AttendanceStatus.ABSENT,
          },
        });
        console.log(absentAttendance);

        const attendance = await this.prisma.attendance.create({
          data: {
            assignmentId: replacementAssignmentId, // Use the replacement personnel's assignment ID
            personnelId: replacementPersonnelId,
            date: new Date(date),
            status: AttendanceStatus.REPLACEMENT,
            replacementForId: absentAttendance?.id || null,
          },
        });
        createdAttendances.push(attendance);
      }
      return createdAttendances;
    }

    return { message: 'Replacement processed successfully' };
  }
  //v1
  /* async createReplacementAttendance(
    assignmentId: number,
    startDate: string,
    endDate: string,
    replacementForId?: number,
    replacementPersonnelId?: number,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all dates between start and end (inclusive)
    const dates: Date[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update all attendance records for replacementForId to ABSENT for each date in range
    if (replacementForId) {
      for (const date of dates) {
        await this.prisma.attendance.updateMany({
          where: {
            personnelId: replacementForId,
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
          data: {
            status: AttendanceStatus.ABSENT,
          },
        });
      }
    }

    // Create new replacement attendance records for each date
    console.log(replacementPersonnelId);
    if (replacementPersonnelId) {
      const createdAttendances = [];

      for (const date of dates) {
        const absentAttendance = await this.prisma.attendance.findFirst({
          where: {
            personnelId: replacementForId,
            assignmentId: assignmentId,
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
            status: AttendanceStatus.ABSENT,
          },
        });
        const attendance = await this.prisma.attendance.create({
          data: {
            assignmentId: assignmentId,
            personnelId: replacementPersonnelId,
            date: new Date(date),
            status: AttendanceStatus.REPLACEMENT,
            replacementForId: absentAttendance?.id || null,
          },
        });
        createdAttendances.push(attendance);
      }
      return createdAttendances;
    }

    return { message: 'Replacement processed successfully' };
  } */

  //v2
  /* async createReplacementAttendance(
    assignmentId: number,
    startDate: string,
    endDate: string,
    replacementForId?: number,
    replacementPersonnelId?: number,
  ) {
    console.log('Creating replacement with data:', {
      assignmentId,
      startDate,
      endDate,
      replacementForId,
      replacementPersonnelId,
    });

    // Verify replacement assignment exists
    const replacementAssignment =
      await this.prisma.missionAssignment.findUnique({
        where: { id: assignmentId },
        include: { mission: true, personnel: true },
      });

    if (!replacementAssignment) {
      throw new NotFoundException('Replacement assignment not found');
    }

    // Verify replacement personnel matches the assignment
    if (
      replacementPersonnelId &&
      replacementAssignment.personnelId !== replacementPersonnelId
    ) {
      throw new BadRequestException(
        'Replacement personnel ID does not match the assignment',
      );
    }

    // If replacing someone, we need to find or create attendance records for the personnel being replaced
    let replacementForAssignments: any[] = [];
    if (replacementForId) {
      // Find assignments for the personnel being replaced
      replacementForAssignments = await this.prisma.missionAssignment.findMany({
        where: {
          personnelId: replacementForId,
          missionId: replacementAssignment.missionId,
        },
        include: {
          personnel: true,
        },
      });

      if (replacementForAssignments.length === 0) {
        throw new NotFoundException(
          'Personnel being replaced has no assignments for this mission',
        );
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];

    // Validate date range
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Create replacement attendance for each day in the range
    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      try {
        // Use transaction to ensure both operations succeed or fail together
        await this.prisma.$transaction(async (tx) => {
          // 1. First, handle the personnel being replaced (mark as ABSENT)
          let replacementForAttendanceRecords = [];

          if (replacementForId && replacementForAssignments.length > 0) {
            for (const replacementForAssignment of replacementForAssignments) {
              const existingReplacementForAttendance =
                await tx.attendance.findFirst({
                  where: {
                    assignmentId: replacementForAssignment.id,
                    date: date,
                  },
                });

              let replacementForAttendance;

              if (existingReplacementForAttendance) {
                // Update existing attendance to ABSENT
                replacementForAttendance = await tx.attendance.update({
                  where: { id: existingReplacementForAttendance.id },
                  data: {
                    status: AttendanceStatus.ABSENT,
                    updatedAt: new Date(),
                  },
                });
              } else {
                // Create new ABSENT attendance for personnel being replaced
                replacementForAttendance = await tx.attendance.create({
                  data: {
                    assignmentId: replacementForAssignment.id,
                    personnelId: replacementForAssignment.personnelId,
                    date: new Date(date),
                    status: AttendanceStatus.ABSENT,
                    // Note: replacementForId is not set here since this is the original personnel
                  },
                });
              }

              replacementForAttendanceRecords.push(replacementForAttendance);
            }
          }

          // 2. Now create/update the replacement attendance
          const existingAttendance = await tx.attendance.findFirst({
            where: {
              assignmentId,
              date: date,
            },
          });

          let replacementAttendance;

          // Prepare base data for replacement
          const baseData = {
            status: AttendanceStatus.REPLACEMENT,
            personnelId: replacementAssignment.personnelId,
            updatedAt: new Date(),
          };

          if (existingAttendance) {
            // Update existing attendance
            const updateData: any = { ...baseData };

            // Only set replacementForId if we have valid replacement attendance records
            if (replacementForAttendanceRecords.length > 0) {
              // Use the first replacement attendance record as replacementFor
              updateData.replacementForId =
                replacementForAttendanceRecords[0].id;
            }

            replacementAttendance = await tx.attendance.update({
              where: { id: existingAttendance.id },
              data: updateData,
              include: {
                assignment: {
                  include: {
                    personnel: true,
                  },
                },
                replacementFor: {
                  include: {
                    assignment: {
                      include: {
                        personnel: true,
                      },
                    },
                  },
                },
              },
            });
          } else {
            // Create new replacement attendance
            const createData: any = {
              ...baseData,
              assignmentId,
              date: new Date(date),
            };

            // Only set replacementForId if we have valid replacement attendance records
            if (replacementForAttendanceRecords.length > 0) {
              createData.replacementForId =
                replacementForAttendanceRecords[0].id;
            }

            replacementAttendance = await tx.attendance.create({
              data: createData,
              include: {
                assignment: {
                  include: {
                    personnel: true,
                  },
                },
                replacementFor: {
                  include: {
                    assignment: {
                      include: {
                        personnel: true,
                      },
                    },
                  },
                },
              },
            });
          }

          results.push({
            date: new Date(date),
            success: true,
            replacementAttendance: {
              id: replacementAttendance.id,
              personnelId: replacementAttendance.personnelId,
              personnelName:
                replacementAttendance.assignment.personnel.identifier,
              status: replacementAttendance.status,
              replacementType: replacementAttendance.replacementType,
              replacementFor: replacementAttendance.replacementFor
                ? {
                    id: replacementAttendance.replacementFor.personnelId,
                    name: replacementAttendance.replacementFor.assignment
                      .personnel.identifier,
                  }
                : null,
            },
            originalPersonnelUpdates: replacementForAttendanceRecords.map(
              (record) => ({
                attendanceId: record.id,
                personnelId: record.personnelId,
                status: record.status,
                date: record.date,
              }),
            ),
            message: replacementForId
              ? `Replacement assigned and original personnel marked as ABSENT`
              : `Replacement assigned`,
          });
        });
      } catch (error) {
        console.error(`Failed to create replacement for date ${date}:`, error);
        results.push({
          date: new Date(date),
          success: false,
          error: error.message,
        });
      }
    }

    const successfulDays = results.filter((r) => r.success).length;
    const failedDays = results.filter((r) => !r.success).length;

    console.log(`Replacement operation completed:`, {
      assignmentId,
      replacementForId,
      replacementPersonnelId,
      startDate,
      endDate,
      totalDays: successfulDays + failedDays,
      successfulDays,
      failedDays,
    });

    if (failedDays > 0) {
      console.error(
        'Failed replacements:',
        results.filter((r) => !r.success),
      );
    }

    return {
      success: failedDays === 0,
      message:
        failedDays === 0
          ? `Replacement created for ${successfulDays} days successfully`
          : `Replacement partially completed: ${successfulDays} successful, ${failedDays} failed`,
      totalDays: successfulDays + failedDays,
      successfulDays,
      failedDays,
      details: results,
    };
  } */

  //v3
  /*  async createReplacementAttendance(
    assignmentId: number,
    startDate: string,
    endDate: string,
    replacementForId?: number,
  ) {
    // Verify assignment exists
    const assignment = await this.prisma.missionAssignment.findUnique({
      where: { id: assignmentId },
      include: { mission: true, personnel: true },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // If replacing someone, verify that replacementFor attendance record exists
    let replacementForAttendance: any = null;
    console.log('test');

    if (replacementForId) {
      replacementForAttendance = await this.prisma.attendance.findFirst({
        where: {
          id: replacementForId,
          assignmentId: assignmentId,
        },
        include: {
          assignment: {
            include: {
              personnel: true,
            },
          },
        },
      });

      if (!replacementForAttendance) {
        throw new NotFoundException(
          'Replacement for attendance record not found',
        );
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const results = [];

    // Validate date range
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Create replacement attendance for each day in the range
    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      try {
        // Use transaction to ensure both operations succeed or fail together
        await this.prisma.$transaction(async (tx) => {
          // 1. Create/update replacement attendance for the replacement personnel
          const existingAttendance = await tx.attendance.findFirst({
            where: {
              assignmentId,
              date: date,
            },
          });

          let replacementAttendance;

          // Prepare data for replacement attendance
          const attendanceData: any = {
            status: AttendanceStatus.REPLACEMENT,
            personnelId: assignment.personnelId, // Required field from schema
            updatedAt: new Date(),
          };

          // Only add replacementForId if it's provided AND valid
          if (replacementForId && replacementForAttendance) {
            attendanceData.replacementForId = replacementForId;
          }

          if (existingAttendance) {
            // Update existing attendance to REPLACEMENT status
            replacementAttendance = await tx.attendance.update({
              where: { id: existingAttendance.id },
              data: attendanceData,
              include: {
                assignment: {
                  include: {
                    personnel: true,
                  },
                },
                replacementFor: {
                  include: {
                    assignment: {
                      include: {
                        personnel: true,
                      },
                    },
                  },
                },
              },
            });
          } else {
            // Create new replacement attendance
            replacementAttendance = await tx.attendance.create({
              data: {
                ...attendanceData,
                assignmentId,
                date: new Date(date),
                // Remove personnelId from create since it's already in attendanceData
              },
              include: {
                assignment: {
                  include: {
                    personnel: true,
                  },
                },
                replacementFor: {
                  include: {
                    assignment: {
                      include: {
                        personnel: true,
                      },
                    },
                  },
                },
              },
            });
          }

          // 2. If we're replacing someone, set original personnel to ABSENT
          let originalPersonnelUpdates = [];
          if (replacementForId && replacementForAttendance) {
            const originalAssignmentId = replacementForAttendance.assignmentId;

            const originalExistingAttendance = await tx.attendance.findFirst({
              where: {
                assignmentId: originalAssignmentId,
                date: date,
              },
            });

            let originalAttendanceRecord;

            const originalAttendanceData = {
              status: AttendanceStatus.ABSENT,
              personnelId: replacementForAttendance.assignment.personnelId,
              updatedAt: new Date(),
            };

            if (originalExistingAttendance) {
              // Update existing attendance to ABSENT
              originalAttendanceRecord = await tx.attendance.update({
                where: { id: originalExistingAttendance.id },
                data: originalAttendanceData,
                include: {
                  assignment: {
                    include: {
                      personnel: true,
                    },
                  },
                },
              });
            } else {
              // Create new ABSENT attendance for original personnel
              originalAttendanceRecord = await tx.attendance.create({
                data: {
                  ...originalAttendanceData,
                  assignmentId: originalAssignmentId,
                  date: new Date(date),
                },
                include: {
                  assignment: {
                    include: {
                      personnel: true,
                    },
                  },
                },
              });
            }

            originalPersonnelUpdates.push({
              assignmentId: originalAssignmentId,
              personnelId: replacementForAttendance.assignment.personnelId,
              attendanceId: originalAttendanceRecord.id,
              status: originalAttendanceRecord.status,
              date: originalAttendanceRecord.date,
            });
          }

          results.push({
            date: new Date(date),
            success: true,
            replacementAttendance: {
              id: replacementAttendance.id,
              personnelId: replacementAttendance.assignment.personnel.id,
              personnelName:
                replacementAttendance.assignment.personnel.identifier,
              status: replacementAttendance.status,
              replacementFor: replacementAttendance.replacementFor
                ? {
                    id: replacementAttendance.replacementFor.assignment
                      .personnel.id,
                    name: replacementAttendance.replacementFor.assignment
                      .personnel.identifier,
                  }
                : null,
            },
            originalPersonnelUpdates: originalPersonnelUpdates,
            message: replacementForId
              ? `Replacement assigned and original personnel marked as ABSENT`
              : `Replacement assigned`,
          });
        });
      } catch (error) {
        console.error(`Failed to create replacement for date ${date}:`, error);
        results.push({
          date: new Date(date),
          success: false,
          error: error.message,
        });
      }
    }

    // Log the replacement operation
    console.log(`Replacement created successfully:`, {
      assignmentId,
      replacementForId,
      startDate,
      endDate,
      totalDays: results.filter((r) => r.success).length,
      failedDays: results.filter((r) => !r.success).length,
    });

    return {
      success: true,
      message: `Replacement created for ${results.filter((r) => r.success).length} days`,
      totalDays: results.filter((r) => r.success).length,
      failedDays: results.filter((r) => !r.success).length,
      details: results,
    };
  } */
}
