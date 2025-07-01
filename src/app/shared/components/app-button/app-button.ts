import {Component, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import {CommonModule, NgStyle} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {computeGlow} from '../../utils/color-utils';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [NgStyle, MatIconModule, CommonModule],
  templateUrl: './app-button.html',
  styleUrls: ['./app-button.scss']
})
export class AppButtonComponent {
  @Input() name = '';
  @Input() icon = ''; // Material Icon Fallback
  @Input() svgIcon?: string;
  @Input() color = '#ccc';
  @Input() activeColor = '#fff';
  @Input() active = false;
  @Input() size = '70px';
  @Input() fontSize = '10px';


  @Output() click = new EventEmitter<void>();
  @Output() hold = new EventEmitter<void>();

  private holdTimeout: any;

  onClick() {
    this.click.emit();
  }

  @HostListener('mousedown')
  onHoldStart() {
    this.holdTimeout = setTimeout(() => this.hold.emit(), 600);
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  cancelHold() {
    clearTimeout(this.holdTimeout);
  }

  @HostBinding('style.box-shadow')
  get glow(): string {
    // passiv leichter Glow
    return this.active ? computeGlow(this.activeColor) : computeGlow(this.color).replace(/rgba\(([^)]+)\)$/, (_m, c) => `rgba(${c.split(',').slice(0, 3).join(',')},0.2)`);
  }

  get textPathId() { return 'cp-' + this.name.replace(/\s+/g,'-').toLowerCase(); }

}
