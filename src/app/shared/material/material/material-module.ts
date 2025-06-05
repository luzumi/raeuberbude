import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatIconModule} from '@angular/material/icon';



@NgModule({
  exports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,

  ]
})
export class MaterialModule {}

