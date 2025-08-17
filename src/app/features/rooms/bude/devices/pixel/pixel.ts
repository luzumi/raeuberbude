import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-pixel',
  imports: [],
  standalone: true,
  templateUrl: './pixel.html',
  styleUrl: './pixel.scss'
})
export class Pixel {
  /** Event zum Zurücknavigieren in die Geräteübersicht. */
  @Output() back = new EventEmitter<void>();
}
