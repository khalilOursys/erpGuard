// src/modules/locations/locations.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private svc: LocationsService) {}

  @Permissions('locations.read')
  @Get('countries')
  getCountries() {
    return this.svc.getCountries();
  }

  @Permissions('locations.read')
  @Get('states/:iso2')
  getStates(@Param('iso2') iso2: string) {
    return this.svc.getStatesOfCountry(iso2);
  }
}
