import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-speedometer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speedometer.html',
  styleUrls: ['./speedometer.scss']
})
export class SpeedometerComponent implements OnChanges, OnInit {
  @Input() title: string = 'Speed';
  @Input() value: number = 0;
  @Input() min: number = 0;
  @Input() max: number = 100;
  // 240°-Bogen im Uhrzeigersinn: 240° → 0° → 120°
  @Input() startAngle: number = 150; // Grad
  @Input() endAngle: number = 30;   // Grad

  rotation = 0; // Gradrotation des Zeigers
  arcD = '';
  segments: Array<{ d: string; color: string }> = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.updateRotation();
    this.updateArcPath();
    this.buildSegments();
  }

  ngOnInit(): void {
    this.updateRotation();
    this.updateArcPath();
    this.buildSegments();
  }

  private updateRotation(): void {
    const range = (this.max - this.min) || 1;
    const clampedValue = Math.min(this.max, Math.max(this.min, this.value));
    const percentage = (clampedValue - this.min) / range;
    // CW-Spanne 240°: von startAngle im Uhrzeigersinn bis endAngle (über 0°)
    const arcSpanCW = (this.endAngle - this.startAngle + 360) % 360; // 240° bei 240->120
    const angle = (this.startAngle + (percentage * arcSpanCW) + 360) % 360;
    this.rotation = angle - 270; // 270° zeigt nach oben
  }

  private updateArcPath(): void {
    const cx = 100, cy = 130, r = 80;
    const toRad = (deg: number) => deg * Math.PI / 180; // 0° rechts, 90° unten, 180° links, 270° oben
    const a0 = this.startAngle;
    const a1 = this.endAngle;
    const x0 = cx + r * Math.cos(toRad(a0));
    const y0 = cy + r * Math.sin(toRad(a0));
    const x1 = cx + r * Math.cos(toRad(a1));
    const y1 = cy + r * Math.sin(toRad(a1));
    // CW-Arc: großer Bogen (240°) im Uhrzeigersinn
    const deltaCW = ((a1 - a0) % 360 + 360) % 360; // 0..360
    const largeArc = deltaCW > 180 ? 1 : 0;
    const sweep = 1; // im Uhrzeigersinn
    this.arcD = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  private buildSegments(): void {
    const cx = 100, cy = 130, r = 80;
    const arc = (aStart: number, aEnd: number) => {
      const toRad = (deg: number) => deg * Math.PI / 180;
      const x0 = cx + r * Math.cos(toRad(aStart));
      const y0 = cy + r * Math.sin(toRad(aStart));
      const x1 = cx + r * Math.cos(toRad(aEnd));
      const y1 = cy + r * Math.sin(toRad(aEnd));
      const deltaCW = ((aEnd - aStart) % 360 + 360) % 360;
      const largeArc = deltaCW > 180 ? 1 : 0;
      const sweep = 1; // Uhrzeigersinn
      return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    };
    // Segmentaufteilung über 240°: 240->280 (rot), 280->320 (orange), 320->360/0->20 (gelb), 20->60 (grün), 60->120 (türkis)
    const segs: Array<{from:number; to:number; color:string}> = [
      { from: 160, to:200, color: '#4caf50' },
      { from: 200, to: 250, color: '#80d556' },
      { from: 250, to: 300, color: '#cddc39' },
      { from: 300, to: 350, color: '#ffb300' },
      { from: 350,   to: 380,  color: '#e53935' },
   ];
    this.segments = segs.map(s => ({ d: arc(s.from, s.to), color: s.color }));
  }
}
