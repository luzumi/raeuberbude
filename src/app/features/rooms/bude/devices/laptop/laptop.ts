import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-laptop',
  imports: [],
  standalone: true,
  templateUrl: './laptop.html',
  styleUrl: './laptop.scss'
})
export class Laptop {
  /** Event zum Schließen der Detailansicht. */
  @Output() back = new EventEmitter<void>();
}
