import { Component, Injectable, OnChanges, ViewEncapsulation } from '@angular/core';
import { ColorService, DatasetApiInterface, IdCache, InternalIdHandler, ReferenceValue, Time, DatasetOptions } from '@helgoland/core';
import { TranslateService } from '@ngx-translate/core';

import {
    FirstLatestTimeseriesEntryComponent,
} from '../first-latest-timeseries-entry/first-latest-timeseries-entry.component';

@Injectable()
export class ReferenceValueColorCache extends IdCache<{ color: string, visible: boolean }> { }

/**
 * Extends the FirstLatestTimeseriesEntryComponent, with the following functions:
 *  - handles the reference values of the dataset entry
 */
@Component({
    selector: 'n52-timeseries-entry',
    templateUrl: './timeseries-entry.component.html',
    styleUrls: ['./timeseries-entry.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class TimeseriesEntryComponent extends FirstLatestTimeseriesEntryComponent implements OnChanges {

    public informationVisible = false;
    public referenceValues: ReferenceValue[];

    constructor(
        protected api: DatasetApiInterface,
        protected timeSrvc: Time,
        protected internalIdHandler: InternalIdHandler,
        protected color: ColorService,
        protected refValCache: ReferenceValueColorCache,
        protected translateSrvc: TranslateService
    ) {
        super(api, internalIdHandler, translateSrvc, timeSrvc);
    }

    public toggleInformation() {
        this.informationVisible = !this.informationVisible;
    }

    public toggleReferenceValue(refValue: ReferenceValue) {
        const options = JSON.parse(JSON.stringify(this.datasetOptions)) as DatasetOptions;
        const idx = options.showReferenceValues.findIndex((entry) => entry.id === refValue.referenceValueId);
        const refValId = this.createRefValId(refValue.referenceValueId);
        if (idx > -1) {
            refValue.visible = false;
            options.showReferenceValues.splice(idx, 1);
        } else {
            refValue.visible = true;
            options.showReferenceValues.push({ id: refValue.referenceValueId, color: refValue.color });
        }
        this.refValCache.get(refValId).visible = refValue.visible;
        this.onUpdateOptions.emit(options);
    }

    protected setParameters() {
        super.setParameters();
        if (this.dataset.referenceValues) {
            this.dataset.referenceValues.forEach((e) => {
                const refValId = this.createRefValId(e.referenceValueId);
                const refValOption = this.datasetOptions.showReferenceValues.find((o) => o.id === e.referenceValueId);
                if (refValOption) {
                    this.refValCache.set(refValId, {
                        color: refValOption.color,
                        visible: true
                    });
                }
                if (!this.refValCache.has(refValId)) {
                    this.refValCache.set(refValId, {
                        color: this.color.getColor(),
                        visible: false
                    });
                }
                e.color = this.refValCache.get(refValId).color;
                e.visible = this.refValCache.get(refValId).visible;
            });
        }
    }

    private createRefValId(refId: string) {
        return this.dataset.url + refId;
    }

}
