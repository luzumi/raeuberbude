// horizontal-slider.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-horizontal-slider',
  standalone: true,
  imports: [FormsModule, MatSliderModule],
  templateUrl: './horizontal-slider.html',
  styleUrls: ['./horizontal-slider.scss']
})
export class HorizontalSlider {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() disabled = false;
  @Input() value = 0;
  @Input() styleMode: 'default' | 'neon' | 'minimal' = 'default';

  @Output() valueChange = new EventEmitter<number>();

  setVolume(val: number) {
    this.value = val;
    this.valueChange.emit(this.value);
  }
}
