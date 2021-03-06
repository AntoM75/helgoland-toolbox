import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HelgolandCoreModule } from '@helgoland/core';

import { HelgolandMapModule } from '../base/map.module';
import { ExtentControlComponent } from './extent/extent.component';
import { GeosearchControlComponent } from './geosearch/geosearch.component';
import { LocateControlComponent } from './locate/locate.component';
import { LocateService } from './locate/locate.service';
import { ZoomControlComponent } from './zoom/zoom.component';

const COMPONENTS = [
  LocateControlComponent,
  ZoomControlComponent,
  GeosearchControlComponent,
  ExtentControlComponent
];

@NgModule({
  declarations: [
    COMPONENTS
  ],
  imports: [
    CommonModule,
    FormsModule,
    HelgolandCoreModule,
    HelgolandMapModule
  ],
  exports: [
    COMPONENTS
  ],
  providers: [
    LocateService
  ]
})
export class HelgolandMapControlModule { }
