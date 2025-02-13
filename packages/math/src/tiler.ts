/**
 * 🀄️ Tiler class for splitting the world into rectangular tiles
 * @module
 * @description
 * See: https://developers.google.com/maps/documentation/javascript/coordinates
 */

import { Extent } from './extent';
import { Projection } from './projection';
import { geoScaleToZoom, geoZoomToScale } from './geo';
import { Vec2, Vec3 } from './vector';

/** Contains essential information about a tile */
export interface Tile {
  /** tile identifier string ex. '0,0,0' */
  id: string;
  /** tile coordinate array ex. [0,0,0] */
  xyz: Vec3;
  /** pixel x/y coordinate extent */
  pxExtent: Extent;
  /** wgs84 lon/lat coordinate extent */
  wgs84Extent: Extent;
  /** true if the tile is visible, false if not */
  isVisible: boolean;
}

/** An Object used to return information about the tiles covering a given projection and viewport */
export interface TileResult {
  tiles: Tile[];
  // translate: Vec2;
  // scale: number;
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(num, max));
}

function range(start: number, end: number): number[] {
  return Array.from(Array(1 + end - start).keys()).map((v) => start + v);
}

export class Tiler {
  private _tileSize: number = 256;
  private _zoomRange: Vec2 = [0, 24];
  private _margin: number = 0;
  private _skipNullIsland: boolean = false;

  /** Constructs a new Tiler
   * @description By default, the tiler uses a 256px tilesize, a zoomRange of 0-24,
   * fetches no margin tiles beyond the viewport, and includes data around "Null Island".
   * (These defaults can be changed at any time by using accessor methods.)
   * @example ```
   * const t = new Tiler();
   * ```
   */
  constructor() {}

  /** Returns a TileResult object which contains details about all the tiles covering the given projection and viewport
   * @param projection
   * @returns tile result
   * @example ```
   * At zoom 0:
   *
   *   +-------+  +85.0511
   *   |       |
   *   | 0,0,0 |
   *   |       |
   *   +-------+  -85.0511
   * -180    +180
   *
   * const t0 = new Tiler();
   * const p0 = new Projection(128, 128, 128 / Math.PI)  // z0
   *     .dimensions([[0, 0], [256, 256]]);              // entire world visible
   *
   * let result = t0.getTiles(p0);
   *
   * At zoom 1:
   *
   *   +-------+-------+  +85.0511
   *   |       |       |
   *   | 0,0,1 | 1,0,1 |
   *   |       |       |
   *   +-------+-------+   0
   *   |       |       |
   *   | 0,1,1 | 1,1,1 |
   *   |       |       |
   *   +-------+-------+  -85.0511
   * -180      0     +180
   *
   * const t1 = new Tiler();
   * const p1 = new Projection(256, 256, 256 / Math.PI)  // z1
   *     .dimensions([[0, 0], [512, 512]]);              // entire world visible
   *
   * let result = t1.getTiles(p1);
   *
   * At zoom 2:
   *
   *   +-------+-------+-------+-------+  +85.0511
   *   |       |       |       |       |
   *   | 0,0,2 | 1,0,2 | 2,0,2 | 3,0,2 |
   *   |       |       |       |       |
   *   +-------+-------+-------+-------+  +66.5133
   *   |       |       |       |       |
   *   | 0,1,2 | 1,1,2 | 2,1,2 | 3,1,2 |
   *   |       |       |       |       |
   *   +-------+-------+-------+-------+   0
   *   |       |       |       |       |
   *   | 0,2,2 | 1,2,2 | 2,2,2 | 3,2,2 |
   *   |       |       |       |       |
   *   +-------+-------+-------+-------+  -66.5133
   *   |       |       |       |       |
   *   | 0,3,2 | 1,3,2 | 2,3,2 | 3,3,2 |
   *   |       |       |       |       |
   *   +-------+-------+-------+-------+  -85.0511
   * -180     -90      0      +90    +180
   *
   * const t2 = new Tiler();
   * const p2 = new Projection(512, 512, 512 / Math.PI)  // z2
   *     .dimensions([[0, 0], [1024, 1024]]);            // entire world visible
   *
   * let result = t2.getTiles(p2);
   *```
   */
  getTiles(projection: Projection): TileResult {
    const dimensions: Vec2[] = projection.dimensions() as Vec2[];
    const translate: Vec2 = projection.translate() as Vec2;
    const scale: number = projection.scale() as number;

    const zFrac: number = geoScaleToZoom(scale, this._tileSize);
    const z: number = clamp(Math.round(zFrac), this._zoomRange[0], this._zoomRange[1]);
    const minTile: number = 0;
    const maxTile: number = Math.pow(2, z) - 1;

    const log2ts: number = Math.log(this._tileSize) * Math.LOG2E;
    const k: number = Math.pow(2, zFrac - z + log2ts);

    // perform calculations in "world" pixel coordinates, where origin is top left viewport pixel
    const origin: Vec2 = [scale * Math.PI - translate[0], scale * Math.PI - translate[1]];
    const viewMin: Vec2 = [origin[0] + dimensions[0][0], origin[1] + dimensions[0][1]];
    const viewMax: Vec2 = [origin[0] + dimensions[1][0], origin[1] + dimensions[1][1]];
    const viewExtent: Extent = new Extent(viewMin, viewMax);

    // a projection centered at Null Island, so we can invert back to lon/lat later
    const worldOrigin: number = (Math.pow(2, z) / 2) * this._tileSize;
    const worldScale: number = geoZoomToScale(z, this._tileSize);
    const worldProjection = new Projection(worldOrigin, worldOrigin, worldScale);

    const cols: number[] = range(
      clamp(Math.floor(viewMin[0] / k) - this._margin, minTile, maxTile),
      clamp(Math.floor(viewMax[0] / k) + this._margin, minTile, maxTile)
    );
    const rows: number[] = range(
      clamp(Math.floor(viewMin[1] / k) - this._margin, minTile, maxTile),
      clamp(Math.floor(viewMax[1] / k) + this._margin, minTile, maxTile)
    );

    let tiles: Tile[] = [];
    for (let i: number = 0; i < rows.length; i++) {
      const y: number = rows[i];
      for (let j: number = 0; j < cols.length; j++) {
        const x: number = cols[j];

        const xyz: Vec3 = [x, y, z];
        if (this._skipNullIsland && Tiler.isNearNullIsland(x, y, z)) continue;

        // still world pixel coordinates
        const tileMin: Vec2 = [x * this._tileSize, y * this._tileSize];
        const tileMax: Vec2 = [(x + 1) * this._tileSize, (y + 1) * this._tileSize];
        const tileExtent: Extent = new Extent(tileMin, tileMax);
        const isVisible: boolean = viewExtent.intersects(tileExtent);

        // back to lon/lat
        const wgs84Min: Vec2 = worldProjection.invert([tileMin[0], tileMax[1]]);
        const wgs84Max: Vec2 = worldProjection.invert([tileMax[0], tileMin[1]]);

        const tile: Tile = {
          id: xyz.toString(),
          xyz: xyz,
          pxExtent: new Extent(tileMin, tileMax),
          wgs84Extent: new Extent(wgs84Min, wgs84Max),
          isVisible: isVisible
        };

        if (isVisible) {
          tiles.unshift(tile); // tiles in view at beginning
        } else {
          tiles.push(tile); // tiles in margin at the end
        }
      }
    }

    return {
      tiles: tiles
      // translate: origin,
      // scale: k
    };
  }

  /** Returns a GeoJSON FeatureCollection containing a Feature for each rectangular tile
   * @description Useful for displaying a tile grid for debugging.
   * @param tileResult
   * @returns FeatureCollection containing a Feature for each rectangular tile
   * @example ```
   * const t = new Tiler();
   * const p = new Projection(256, 256, 256 / Math.PI)  // z1
   *     .dimensions([[0, 0], [512, 512]]);             // entire world visible
   * let result = t.getTiles(p);
   * let gj = t.getGeoJSON(result);    // returns a GeoJSON FeatureCollection
   * ```
   */
  getGeoJSON(tileResult: TileResult): Object {
    let features = tileResult.tiles.map((tile) => {
      return {
        type: 'Feature',
        properties: {
          id: tile.id,
          name: tile.id
        },
        geometry: {
          type: 'Polygon',
          coordinates: [tile.wgs84Extent.polygon()]
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  /** Sets/Gets the current tileSize
   * @param val tile size value
   * @returns When passed a numeric argument, sets the tile size and returns `this` for method chaining
   * Returns the tile size otherwise
   * @example ```
   * const t = new Tiler().tileSize(512);   // sets tile size
   * t.tileSize();   // gets tile size - returns 512
   * ```
   */
  tileSize(val?: number): number | Tiler {
    if (val === undefined) return this._tileSize;
    this._tileSize = val;
    return this;
  }

  /** Sets/Gets the current zoomRange
   * @param min
   * @param max
   * @returns When arguments are passed, sets the min/max zoom range and returns `this` for method chaining
   * Returns the min/max zoom range otherwise
   * @example ```
   * const t = new Tiler().zoomRange(10, 20);   // sets min/max zoom range
   * t.zoomRange();   // gets min/max zoom range - returns [10, 20]
   * ```
   */
  zoomRange(min?: number, max?: number): Vec2 | Tiler {
    if (min === undefined) return this._zoomRange;
    if (max === undefined) max = min;
    this._zoomRange = [min, max];
    return this;
  }

  /** Sets/Gets the current tile margin (number to extend the rows/columns beyond those covering the viewport)
   * @param val
   * @returns When an argument is passed, sets the tile margin and returns `this` for method chaining
   * Returns the tile margin otherwise
   * @example ```
   * const t = new Tiler().margin(1);   // sets tile margin
   * t.margin();   // gets tile margin - returns 1
   * ```
   */
  margin(val?: number): number | Tiler {
    if (val === undefined) return this._margin;
    this._margin = +val;
    return this;
  }

  /** Sets/Gets the current skipNullIsland value
   * @description When loading data from a tiled service, it is common for invalid data to be located around "Null Island",
   * therefore it can be useful to skip loading these tiles
   * @param val
   * @returns When an argument is passed, sets the `skipNullIsland` value and returns `this` for method chaining
   * Returns the `skipNullIsland` value otherwise
   * @example ```
   * const t = new Tiler().skipNullIsland(true);   // sets skipNullIsland value
   * t.skipNullIsland();   // gets skipNullIsland value - returns true
   * ```
   */
  skipNullIsland(val?: boolean): boolean | Tiler {
    if (val === undefined) return this._skipNullIsland;
    this._skipNullIsland = val;
    return this;
  }

  /** Tests whether the given tile coordinate is near [0,0] (Null Island)
   * @description A tile is considered "near" if it >= z7 and around the center of the map
   * within these or descendent tiles (roughly within about 2.8° of [0,0]).
   * @param x
   * @param y
   * @param z
   * @returns true if near null island, false otherwise
   * @example ```
   * +---------+---------+
   * |         |         |
   * | 63,63,7 | 64,63,7 |
   * |         |         |
   * +-------[0,0]-------+
   * |         |         |
   * | 63,64,7 | 64,64,7 |
   * |         |         |
   * +---------+---------+
   * Tiler.isNearNullIsland(31, 31, 6);    // returns false (zoom 6)
   * Tiler.isNearNullIsland(63, 65, 7);    // returns false (south of Null Island region)
   *
   * Tiler.isNearNullIsland(63, 63, 7);    // returns true
   * Tiler.isNearNullIsland(127, 127, 8);  // returns true
   * ```
   */
  static isNearNullIsland(x: number, y: number, z: number): boolean {
    if (z >= 7) {
      const center: number = Math.pow(2, z - 1);
      const width: number = Math.pow(2, z - 6);
      const min: number = center - width / 2;
      const max: number = center + width / 2 - 1;
      return x >= min && x <= max && y >= min && y <= max;
    }
    return false;
  }
}
