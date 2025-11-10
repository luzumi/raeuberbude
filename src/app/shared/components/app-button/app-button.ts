import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule, NgStyle } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgStyle, MatIconModule, CommonModule],
  templateUrl: './app-button.html',
  styleUrls: ['./app-button.scss']
})
export class AppButtonComponent {
  @Input() name = '';
  @Input() icon = '';
  @Input() svgIcon?: string;
  @Input() color = '#ccc';
  @Input() backgroundColor = '#000';
  @Input() activeColor = '#fff';
  @Input() hoverColor = '#bbb';
  @Input() active = false;
  @Input() size = '70px';
  @Input() fontSize = '10px';
  @Input() glowOn= true;

  // Optional Hover-Shader Inputs (für NG8002-Fix und animierten Hover)
  @Input() hoverAnim: boolean = false;
  @Input() hoverAnimColorRgb: string = '255, 87, 34';
  @Input() hoverAnimDuration: string = '600ms';

  // Layout: Standard ist absolut (runde Buttons). Für Header/Listen inline schalten.
  @Input() inline: boolean = false;

  @Output() click = new EventEmitter<MouseEvent>();  // Changed to emit MouseEvent
  @Output() hold = new EventEmitter<void>();

  private holdTimeout: any;
  @Input() disabled!: boolean;

  onClick(event: MouseEvent): void {  // Accept event parameter
    event.stopPropagation();  // Stop propagation at source
    this.click.emit(event);   // Pass event to parent
  }

  @HostListener('mousedown', ['$event'])
  onHoldStart(event: MouseEvent): void {
    event.stopPropagation();
    this.holdTimeout = setTimeout(() => this.hold.emit(), 600);
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  cancelHold(): void {
    clearTimeout(this.holdTimeout);
  }

  get textPathId(): string {
    return 'cp-' + this.name.replace(/\s+/g, '-').toLowerCase();
  }
}
