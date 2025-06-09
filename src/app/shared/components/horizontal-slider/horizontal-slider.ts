import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-horizontal-slider',
  templateUrl: './horizontal-slider.html',
  standalone: true,
  imports: [MatSliderModule, FormsModule]
})
export class HorizontalSlider {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() disabled = false;
  @Input() value = 0;

  @Output() valueChange = new EventEmitter<number>();
}
