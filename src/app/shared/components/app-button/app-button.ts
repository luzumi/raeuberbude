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
  @Input() icon = '';             // Material Icon Fallback
  @Input() svgIcon?: string;
  @Input() color = '#ccc';
  @Input() activeColor = '#fff';
  @Input() active = false;
  @Input() size = '70px';
  @Input() fontSize = '10px';

  @Output() click = new EventEmitter<void>();
  @Output() hold  = new EventEmitter<void>();

  private holdTimeout: any;

  onClick(): void {
    this.click.emit();
  }

  @HostListener('mousedown')
  onHoldStart(): void {
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
