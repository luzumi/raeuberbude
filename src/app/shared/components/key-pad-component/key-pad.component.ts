// keypad.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keypad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './key-pad.component.html',
  styleUrls: ['./key-pad.component.scss']
})
export class KeyPadComponent {
  @Input() keys: string[] = [];
  @Input() columns = 3;
  @Output() keyPressed = new EventEmitter<string>();

  onKeyClick(key: string): void {
    this.keyPressed.emit(key);
  }
}
