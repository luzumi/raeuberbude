import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-creator',
  imports: [],
  standalone: true,
  templateUrl: './creator.html',
  styleUrl: './creator.scss'
})
export class Creator {
  /** Event zum Zurückkehren zum Grid. */
  @Output() back = new EventEmitter<void>();
}
