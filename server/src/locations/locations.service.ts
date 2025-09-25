import { Injectable, BadRequestException } from '@nestjs/common';
import countries from 'world-countries';
import { Country, State, City } from 'country-state-city';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  getCountries() {
    return countries.map((c: any) => ({
      name: c.name?.common ?? c.name,
      iso2: c.cca2,
      iso3: c.cca3,
      region: c.region,
      subregion: c.subregion,
      currencies: c.currencies ? Object.keys(c.currencies) : [],
      callingCodes: c.idd?.root ? [c.idd.root + (c.idd.suffixes?.[0] ?? '')] : [],
    }));
  }

  getStatesOfCountry(iso2?: string) {
    if (!iso2) return [];
    return State.getStatesOfCountry(iso2) || [];
  }

  getCitiesOfCountry(iso2?: string) {
    if (!iso2) return [];
    return City.getCitiesOfCountry(iso2) || [];
  }

  getCitiesOfState(iso2?: string, stateCode?: string) {
    if (!iso2 || !stateCode) return [];
    return City.getCitiesOfState(iso2, stateCode) || [];
  }

  searchCitiesInCountry(iso2?: string, q?: string, limit = 50) {
    if (!iso2) return [];
    const all = City.getCitiesOfCountry(iso2) || [];
    if (!q) return all.slice(0, limit);
    const s = q.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(s)).slice(0, limit);
  }

  async importCitiesToDb(options: { iso2: string; stateCode?: string; limit?: number }) {
    const { iso2, stateCode, limit = 1000 } = options;
    if (!iso2) throw new BadRequestException('iso2 required');

    let citiesList: any[] = [];
    if (stateCode) {
      citiesList = this.getCitiesOfState(iso2, stateCode);
    } else {
      citiesList = this.getCitiesOfCountry(iso2);
    }

    if (!citiesList || citiesList.length === 0) {
      throw new BadRequestException('No cities found for provided parameters');
    }

    const toInsert = citiesList.slice(0, limit).map((c) => ({
      name: c.name,
      state: c.state || null,
      country: c.country || iso2,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    }));

    const result = await this.prisma.city.createMany({
      data: toInsert,
      skipDuplicates: true,
    });

    return { inserted: result.count ?? 0, attempted: toInsert.length };
  }
}
