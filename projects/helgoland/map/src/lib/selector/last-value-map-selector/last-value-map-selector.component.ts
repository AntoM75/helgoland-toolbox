import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DoCheck,
  Input,
  IterableDiffer,
  IterableDiffers,
  KeyValueDiffers,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  DatasetApiInterface,
  HasLoadableContent,
  Mixin,
  StatusIntervalResolverService,
  Timeseries,
  TimeseriesExtras,
} from '@helgoland/core';
import { circleMarker, featureGroup, geoJSON, Layer, Marker, marker } from 'leaflet';
import { forkJoin, Observable, Observer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { MapCache } from '../../base/map-cache.service';
import { MapSelectorComponent } from '../map-selector.component';
import { LastValueLabelGenerator, LastValuePresentation } from '../services/last-value-label-generator.interface';

/**
 * Displays selectable series with their last values on an map.
 */
@Component({
  selector: 'n52-last-value-map-selector',
  templateUrl: '../map-selector.component.html',
  styleUrls: ['../map-selector.component.scss']
})
@Mixin([HasLoadableContent])
export class LastValueMapSelectorComponent extends MapSelectorComponent<Timeseries> implements AfterViewInit, DoCheck, OnChanges {

  /**
   * The list of internal series IDs, which should be presented with their last values on the map.
   */
  @Input()
  public lastValueSeriesIDs: string[] = [];

  /**
   * Presentation type how to display the series.
   */
  @Input()
  public lastValuePresentation: LastValuePresentation = LastValuePresentation.Colorized;

  /**
   * Ignores all Statusintervals where the timestamp is before a given duration in milliseconds and draws instead the default marker.
   */
  @Input()
  public ignoreStatusIntervalIfBeforeDuration = Infinity;

  private _lastValueSeriesIDsDiff: IterableDiffer<string>;

  private markerFeatureGroup: L.FeatureGroup = featureGroup();

  constructor(
    protected mapCache: MapCache,
    protected kvDiffers: KeyValueDiffers,
    protected iDiffers: IterableDiffers,
    protected cd: ChangeDetectorRef,
    protected apiInterface: DatasetApiInterface,
    protected lastValueLabelGenerator: LastValueLabelGenerator,
    protected statusIntervalResolver: StatusIntervalResolverService
  ) {
    super(mapCache, kvDiffers, cd);
    this._lastValueSeriesIDsDiff = this.iDiffers.find(this.lastValueSeriesIDs).create();
  }

  public ngDoCheck() {
    super.ngDoCheck();
    const changes = this._lastValueSeriesIDsDiff.diff(this.lastValueSeriesIDs);

    if (changes && this.map) {

      const ids = [];
      changes.forEachAddedItem(record => {
        ids.push(record.item);
      });
      this.createMarkersBySeriesIDs(ids);

      changes.forEachRemovedItem(record => {
        this.removeMarker(record.item);
      });
    }
  }

  protected drawGeometries(): void {
    this.isContentLoading(true);
    if (this.lastValueSeriesIDs && this.lastValueSeriesIDs.length) {
      this.createMarkersBySeriesIDs(this.lastValueSeriesIDs);
    }
  }

  private createMarkersBySeriesIDs(ids: string[]) {
    const obsList: Array<Observable<any>> = [];
    ids.forEach(id => {
      const tsObs = this.apiInterface.getSingleTimeseriesByInternalId(id);
      obsList.push(tsObs.pipe(switchMap(val => this.createMarker(val).pipe(tap(res => {
        this.markerFeatureGroup.addLayer(res);
        res.on('click', () => this.onSelected.emit(val));
      })))));
    });
    this.finalizeMarkerObservables(obsList);
  }

  private createMarker(ts: Timeseries) {
    switch (this.lastValuePresentation) {
      case LastValuePresentation.Colorized:
        return this.createColorizedMarker(ts);
      case LastValuePresentation.Textual:
        return this.createLabeledMarker(ts);
    }
    return this.createColorizedMarker(ts);
  }

  private finalizeMarkerObservables(obsList: Observable<any>[]) {
    forkJoin(obsList).subscribe(() => {
      if (this.map) {
        const bounds = this.markerFeatureGroup.getBounds();
        this.zoomToMarkerBounds(bounds);
        this.map.invalidateSize();
      }
      this.isContentLoading(false);
    });
    if (this.map) {
      this.markerFeatureGroup.addTo(this.map);
    }
  }

  private createColorizedMarker(ts: Timeseries): Observable<Layer> {
    return new Observable<Layer>((observer: Observer<Layer>) => {
      this.apiInterface.getTimeseriesExtras(ts.id, ts.url).subscribe((extras: TimeseriesExtras) => {
        let coloredMarker;
        if (extras.statusIntervals) {
          if ((ts.lastValue.timestamp) > new Date().getTime() - this.ignoreStatusIntervalIfBeforeDuration) {
            const interval = this.statusIntervalResolver.getMatchingInterval(ts.lastValue.value, extras.statusIntervals);
            if (interval) {
              coloredMarker = this.createColoredMarker(ts, interval.color);
            }
          }
        }
        if (!coloredMarker) {
          coloredMarker = this.createDefaultColoredMarker(ts);
        }
        this.setId(coloredMarker, ts.internalId);
        observer.next(coloredMarker);
        observer.complete();
      });
    });
  }

  private createColoredMarker(ts: Timeseries, color: string): Layer {
    return this.createFilledMarker(ts, color, 10);
  }

  private createDefaultColoredMarker(ts: Timeseries): Layer {
    return this.createFilledMarker(ts, '#000', 10);
  }

  private createFilledMarker(ts: Timeseries, color: string, radius: number): Layer {
    let geometry: Layer;
    if (ts.station.geometry.type === 'Point') {
      const point = ts.station.geometry as GeoJSON.Point;
      geometry = circleMarker([point.coordinates[1], point.coordinates[0]], {
        color: '#000',
        fillColor: color,
        fillOpacity: 0.8,
        radius: 10,
        weight: 2
      });
    } else {
      geometry = geoJSON(ts.station.geometry, {
        style: () => ({
          color: '#000',
          fillColor: color,
          fillOpacity: 0.8,
          weight: 2
        })
      });
    }
    if (geometry) {
      geometry.on('click', () => this.onSelected.emit(ts));
      return geometry;
    }
  }

  private createLabeledMarker(ts: Timeseries): Observable<Layer> {
    return new Observable<Layer>(observer => {
      const icon = this.lastValueLabelGenerator.createIconLabel(ts);
      if (ts.station.geometry.type === 'Point') {
        const point = ts.station.geometry as GeoJSON.Point;
        const genMarker = marker([point.coordinates[1], point.coordinates[0]], { icon });
        this.setId(genMarker, ts.internalId);
        observer.next(genMarker);
        observer.complete();
      }
    });
  }

  private setId(m: Marker, id: string) {
    m.feature = {
      id,
      type: 'Feature',
      properties: null,
      geometry: null
    };
  }

  private removeMarker(markerId: string) {
    let searchedLayer;
    this.markerFeatureGroup.eachLayer((layer: Marker) => {
      if (layer.feature.id === markerId) {
        searchedLayer = layer;
      }
    });
    if (searchedLayer) {
      this.markerFeatureGroup.removeLayer(searchedLayer);
    }
  }

}
