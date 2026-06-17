import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-mic-button',
  standalone: true,
  templateUrl: './mic-button.component.html',
  styleUrls: ['./mic-button.component.scss'],
  host: {
    '[class.recording]': 'isRecording',
    '(click)': 'onClick()',
  },
})
export class MicButtonComponent {
  @Input() isRecording = false;
  @Output() micClick = new EventEmitter<void>();

  onClick(): void {
    this.micClick.emit();
  }
}
