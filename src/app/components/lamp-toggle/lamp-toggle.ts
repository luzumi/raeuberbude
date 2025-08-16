import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCard, MatCardContent, MatCardTitle } from '@angular/material/card';
import { MatSlideToggle } from '@angular/material/slide-toggle';

// Dumb presentational component: displays a slide toggle and emits events.
@Component({
  selector: 'app-lamp-toggle',
  standalone: true,
  templateUrl: './lamp-toggle.html',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatSlideToggle
  ],
  styleUrls: ['./lamp-toggle.scss']
})
export class LampToggleComponent {
  @Input() lampState = false; // current state provided by container
  @Input() loading = false; // disable toggle while container performs action
  @Output() toggled = new EventEmitter<void>();

  onToggle(): void {
    this.toggled.emit();
  }
}
