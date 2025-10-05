// src/modules/locations/locations.service.ts
import { Injectable } from '@nestjs/common';
import countries from 'world-countries';
import { State } from 'country-state-city';

@Injectable()
export class LocationsService {
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
}