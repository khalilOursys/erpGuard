import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  UseGuards,
  Body,
} from '@nestjs/common';
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

  @Permissions('locations.read')
  @Get('cities')
  getCities(
    @Query('country') countryIso2?: string,
    @Query('state') stateCode?: string,
    @Query('q') q?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    if (q) return this.svc.searchCitiesInCountry(countryIso2, q, limit);
    if (countryIso2 && stateCode) return this.svc.getCitiesOfState(countryIso2, stateCode);
    if (countryIso2) return this.svc.getCitiesOfCountry(countryIso2).slice(0, limit);
    return [];
  }

  @Permissions('locations.manage')
  @Post('import')
  async importToDb(@Body() body: { iso2: string; stateCode?: string; limit?: number }) {
    const { iso2, stateCode, limit } = body;
    return this.svc.importCitiesToDb({ iso2, stateCode, limit });
  }
}
