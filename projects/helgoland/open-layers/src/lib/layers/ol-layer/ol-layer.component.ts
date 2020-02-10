import { AfterViewInit, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';

import { OlBaseComponent } from '../../ol-base.component';
import { OlMapService } from '../../services/map.service';
import { OlMapId } from '../../services/mapid.service';

/**
 * Component to configure an additional layer to the map. The component must be embedded as seen in the example
 *
 * @example
 * <n52-ol-map>
 *     <n52-ol-layer></n52-ol-layer>
 * </n52-ol-map>
 */
@Component({
  selector: 'n52-ol-layer',
  template: '',
})
export class OlLayerComponent extends OlBaseComponent implements AfterViewInit, OnChanges {

  /**
   * Configured layer
   */
  @Input() layer: BaseLayer;

  constructor(
    protected mapService: OlMapService,
    protected mapidService: OlMapId
  ) {
    super(mapService, mapidService);
  }

  private map: Map;

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes && this.layer) {
      this.addLayer();
    }
  }

  public mapInitialized(map: Map) {
    this.map = map;
    this.addLayer();
  }

  private addLayer() {
    if (this.map && this.layer) {
      this.map.addLayer(this.layer);
    }
  }
}
