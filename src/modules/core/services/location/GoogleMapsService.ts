import Reactory from '@reactory/reactory-core';


class GoogleMapsService implements Reactory.Service.IReactoryContextAwareService {

  getExecutionContext(): Reactory.Server.IReactoryContext {
    throw new Error("Method not implemented.");
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    throw new Error("Method not implemented.");
  }
  name: string = 'GoogleMapsService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  context: Reactory.Server.IReactoryContext;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.getPlaces = this.getPlaces.bind(this);
    this.getPlaceDetails = this.getPlaceDetails.bind(this);
  }

  async getPlaces(searchTerm: string) {


    /**
     * business_status, formatted_address, geometry, icon,name, permanently_closed (deprecated), photos, place_id, plus_code, types
     */

    let fields = 'formatted_address,geometry,icon,name,place_id';

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'xxx';
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?key=${apiKey}&input=${searchTerm}&inputtype=textquery&fields=${fields}`;
    const response = await fetch(url, { method: 'GET' }).then();

    try {
      const google_results = await response.json();
      this.context.log(`Response from google map apis`, google_results, 'info');


      return google_results;
    } catch (ex) {
      this.context.log('Error resolving place details')
      return response.text();
    }



  };

  async getPlaceDetails(placeId: string) {

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'xxx';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_component&key=${apiKey}`;
    const response = await fetch(url, { method: 'GET' }).then();

    try {
      return response.json();
    } catch (ex) {
      this.context.log('Error resolving place details')
      return response.text();
    }
  }

}

export default {
  id: 'core.GoogleMapsService@1.0.0',
  nameSpace: 'core',
  name: 'GoogleMapsService',
  version: '1.0.0',
  description: 'A light weight google mapping service that provides search and place details.',
  dependencies: [],
  serviceType: 'data',
  service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
    return new GoogleMapsService(props, context);
  }
};