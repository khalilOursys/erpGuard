// src/types/third-party.d.ts
declare module 'world-countries' {
  const countries: any;
  export default countries;
}

declare module 'country-state-city' {
  // provide minimal types used in our code
  export type CityObj = { name: string; state?: string; country?: string };
  export type StateObj = { name: string; isoCode?: string; countryCode?: string };
  export type CountryObj = any;

  export const Country: {
    getAllCountries(): CountryObj[];
    getCountryByCode(code: string): CountryObj | undefined;
  };

  export const State: {
    getStatesOfCountry(iso2: string): StateObj[];
  };

  export const City: {
    getCitiesOfCountry(iso2: string): CityObj[];
    getCitiesOfState(iso2: string, stateCode: string): CityObj[];
  };
}
