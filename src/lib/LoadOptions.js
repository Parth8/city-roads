import findBoundaryByName from "./findBoundaryByName.js";

/**
 * For console API we allow a lot of flexibility to fetch data
 * This component normalizes input arguments and turns them into unified
 * options object
 */

export default class LoadOptions {
  static parse(scene, wayFilter, rawOptions) {
    let result = new LoadOptions();
    if (typeof rawOptions === 'string') {
      result.place = rawOptions;
    }

    if (wayFilter) {
      result.wayFilter = wayFilter;
    }

    if (!rawOptions) return result;

    Object.assign(result, rawOptions);

    let protoLayer = getProtoLayer(scene, rawOptions.layer);
    if (protoLayer) {
      result.projector = protoLayer.getGridProjector();
      let protoQueryBounds = protoLayer.getQueryBounds();
      if (protoQueryBounds && !result.place && !result.areaId && !result.bbox) {
        // use bounds of the parent layer unless we have our own override.
        result.place = protoQueryBounds.place;
        result.areaId = protoQueryBounds.areaId;
        result.bbox = protoQueryBounds.bbox;
      }
    }

    if (rawOptions.projector) {
      // user defined projection. See https://github.com/d3/d3-geo for the projector reference:
      result.projector = rawOptions.projector;
    }

    return result;
  }

  constructor(overrides) {
    /**
    * Query that should be translated to area id by nominatim;
    */
    this.place = undefined;

    /**
    * Which projector should be used to map lon/lat to layer's x/y
    */
    this.projector = undefined;
    this.wayFilter = undefined;
    // When left undefined, these are picked from the size of the area (see getQueryLimits()).
    this.timeout = undefined;
    this.maxHeapByteSize = undefined;
    this.outputMethod = 'skel'; // body
    Object.assign(this, overrides);
  }

  getQueryTemplate() {
    if (this.raw) {
      // I assume you know what you are doing.
      return Promise.resolve({
        queryString: this.raw
      });
    }

    if (!this.wayFilter) {
      throw new Error('Way filter is required');
    }

    return this.getBounds()
      .then(bounds => {
        if (!bounds) throw new Error('Could not find this place on OpenStreetMap');
        let limits = getQueryLimits(bounds.bbox);
        let timeout = this.timeout || limits.timeout;
        let maxsize = this.maxHeapByteSize || limits.maxsize;
        let queryString;
        if (bounds.areaId) {
          queryString = `[timeout:${timeout}][maxsize:${maxsize}][out:json];
area(${bounds.areaId});
(._; )->.area;
(${this.wayFilter}(area.area); node(w););
out ${this.outputMethod};`;
        } else if (bounds.bbox) {
          let bbox = serializeBBox(bounds.bbox);
          queryString = `[timeout:${timeout}][maxsize:${maxsize}][bbox:${bbox}][out:json];
(${this.wayFilter}; node(w););
out ${this.outputMethod};`;
        }

        return {
          bounds,
          queryString,
          timeout
        }
      });
  }

  getBounds() {
    if (this.place) {
      return findBoundaryByName(this.place).then(x => x && x[0]);
    }
    if (this.areaId) {
      return Promise.resolve({ areaId: this.areaId, bbox: this.bbox });
    }
    if (this.bbox) {
      return Promise.resolve({ bbox: this.bbox });
    }

    throw new Error('Please specify bounding area for the query (place|areaId|bbox)');
  }
}

function getProtoLayer(scene, layerDefinition) {
  if (layerDefinition === undefined) return;

  if (typeof layerDefinition === 'number') {
    let layers = scene.queryLayerAll();
    return layers[layerDefinition];
  } else if (typeof layerDefinition === 'string') {
    return scene.queryLayer(layerDefinition);
  } else {
    // We assume it is a layer instance:
    return layerDefinition;
  }
}

/**
 * Overpass schedules a query by the resources it *declares*, not by what it
 * ends up using. Asking for 900s and 1GB to download a town as small as Monaco
 * makes busy servers queue or reject the request, so we ask for what the area
 * plausibly needs.
 */
export function getQueryLimits(bbox) {
  const MB = 1024 * 1024;
  let area = bboxAreaKm2(bbox);
  if (area < 1000) return {timeout: 120, maxsize: 512 * MB};
  if (area < 10000) return {timeout: 300, maxsize: 1024 * MB};
  return {timeout: 900, maxsize: 2048 * MB};
}

function bboxAreaKm2(bbox) {
  // bbox is [south, west, north, east] (see findBoundaryByName.js)
  if (!bbox || bbox.length !== 4 || !bbox.every(Number.isFinite)) return Infinity;
  let [south, west, north, east] = bbox;
  let midLat = (south + north) / 2 * Math.PI / 180;
  let height = Math.abs(north - south) * 111.32;
  let width = Math.abs(east - west) * 111.32 * Math.cos(midLat);
  return width * height;
}

function serializeBBox(bbox) {
  return bbox && bbox.join(',');
}