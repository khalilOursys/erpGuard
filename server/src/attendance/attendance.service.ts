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

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // CREATE - Get all attendance for a mission
  async getAttendanceByMission(missionId: number, companyId: number) {
    // Verify mission exists and belongs to company
    const mission = await this.prisma.mission.findFirst({
      where: {
        id: missionId,
        companyId,
      },
      include: {
        assignments: {
          include: {
            personnel: true,
            attendances: {
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
        ...attendance,
        personnelName: assignment.personnel.identifier,
        personnelId: assignment.personnel.id,
        assignmentId: assignment.id,
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
}
